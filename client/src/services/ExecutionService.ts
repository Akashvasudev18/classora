import { socketService } from "./SocketService";

export interface ExecutionResult {
  roomId?: string;
  success: boolean;
  output: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  timestamp?: string;
  stdin?: string;
}

export async function runPythonCode(code: string, roomId: string, stdin: string = ""): Promise<ExecutionResult> {
  const cleanRoomId = roomId.toUpperCase();
  const targetServerUrl = socketService.getCurrentUrl();
  const endpoint = `${targetServerUrl.replace(/\/$/, "")}/api/run`;

  return new Promise((resolve) => {
    let hasResolved = false;

    const isInvalidResult = (res: ExecutionResult): boolean => {
      if (!res || !res.output) return true;
      const text = `${res.output} ${res.stderr || ""}`;
      return text.includes("OCI runtime error") || text.includes("Resource temporarily unavailable");
    };

    // 1. Try Socket.IO emit first
    if (socketService.getSocket().connected) {
      socketService.emit("run-code", { roomId: cleanRoomId, code, stdin }, (res: ExecutionResult) => {
        if (res && !hasResolved && !isInvalidResult(res)) {
          hasResolved = true;
          resolve(formatExecutionOutput(res));
        }
      });
    }

    // 2. HTTP POST /api/run fallback
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        stdin,
        roomId: cleanRoomId,
      }),
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (!hasResolved && !isInvalidResult(data)) {
            hasResolved = true;
            resolve(formatExecutionOutput(data));
          }
        }
      })
      .catch(() => {});

    // 3. Guaranteed safety timeout after 12s
    setTimeout(() => {
      if (!hasResolved) {
        hasResolved = true;
        resolve({
          success: false,
          output: "Execution Error: Code execution timed out or server is restarting. Please try clicking Run Code again.",
          stderr: "Timeout Limit Exceeded.",
          exitCode: 124,
          stdin,
        });
      }
    }, 12000);
  });
}

function formatExecutionOutput(res: ExecutionResult): ExecutionResult {
  if (res.stderr && res.stderr.includes("EOFError")) {
    return {
      ...res,
      success: false,
      output: `${res.output}\n\n💡 Tip: Python input() reached End-Of-File. Enter your input values in the "Custom Input (stdin)" box above before clicking Run Code!`,
    };
  }
  return res;
}
