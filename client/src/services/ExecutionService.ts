import { socketService } from "./SocketService";

export interface ExecutionResult {
  roomId?: string;
  success: boolean;
  output: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  timestamp?: string;
}

export async function runPythonCode(code: string, roomId: string): Promise<ExecutionResult> {
  const cleanRoomId = roomId.toUpperCase();
  const targetServerUrl = socketService.getCurrentUrl();
  const endpoint = `${targetServerUrl.replace(/\/$/, "")}/api/run`;

  return new Promise((resolve) => {
    let hasResolved = false;

    // 1. Try Socket.IO emit first (bypasses CORS & HTTP 404 proxy issues on Render)
    if (socketService.getSocket().connected) {
      socketService.emit("run-code", { roomId: cleanRoomId, code }, (res: ExecutionResult) => {
        if (res && !hasResolved) {
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
        roomId: cleanRoomId,
      }),
    })
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          if (!hasResolved) {
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
      output: `${res.output}\n\n💡 Tip: Python input() expects standard input (stdin). For live web execution, define variables directly (e.g. name = "Alex", age = 20) instead of calling input().`,
    };
  }
  return res;
}
