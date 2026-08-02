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

const JUDGE0_DIRECT_URL = "https://ce.judge0.com/submissions?wait=true";

export async function runPythonCode(code: string, roomId: string, stdin: string = ""): Promise<ExecutionResult> {
  const cleanRoomId = roomId.toUpperCase();
  const targetServerUrl = socketService.getCurrentUrl();
  const endpoint = `${targetServerUrl.replace(/\/$/, "")}/api/run`;
  const startTime = Date.now();

  return new Promise((resolve) => {
    let hasResolved = false;

    const resolveOnce = (result: ExecutionResult) => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(formatExecutionOutput({
          ...result,
          durationMs: result.durationMs ?? (Date.now() - startTime),
        }));
      }
    };

    const isInvalidResult = (res: ExecutionResult): boolean => {
      if (!res || !res.output) return true;
      const text = `${res.output} ${res.stderr || ""}`;
      return text.includes("OCI runtime error") || text.includes("Resource temporarily unavailable");
    };

    // Helper: Execute via Direct Judge0 CE client fallback
    const tryDirectJudge0 = async () => {
      const directRes = await runJudge0Client(code, stdin);
      if (directRes && !isInvalidResult(directRes)) {
        resolveOnce(directRes);
        return true;
      }
      return false;
    };

    // 1. Try Socket.IO emit first
    if (socketService.getSocket().connected) {
      socketService.emit("run-code", { roomId: cleanRoomId, code, stdin }, async (res: ExecutionResult) => {
        if (res && !isInvalidResult(res)) {
          resolveOnce(res);
        } else {
          // If server returned invalid OCI error via socket, fallback directly to Judge0 CE
          await tryDirectJudge0();
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
          if (!isInvalidResult(data)) {
            resolveOnce(data);
          } else {
            // Server returned legacy OCI error, execute via Judge0 directly from client
            await tryDirectJudge0();
          }
        }
      })
      .catch(async () => {
        await tryDirectJudge0();
      });

    // 3. Fallback trigger after 2.5s if backend server is slow / unresponsive / stuck on old build
    setTimeout(async () => {
      if (!hasResolved) {
        const ok = await tryDirectJudge0();
        if (!ok && !hasResolved) {
          resolveOnce({
            success: false,
            output: "Execution Error: Unable to execute Python code at this time. Please check your network connection.",
            stderr: "Execution timeout.",
            exitCode: 124,
            stdin,
          });
        }
      }
    }, 2500);
  });
}

/**
 * Executes Python code directly from client browser using Judge0 CE public API.
 */
async function runJudge0Client(code: string, stdin: string): Promise<ExecutionResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(JUDGE0_DIRECT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language_id: 71, // Python 3.8.1 / 3.x
        source_code: code,
        stdin,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const stdout = (data.stdout || "").trim();
      const stderr = (data.stderr || data.compile_output || data.message || "").trim();
      const statusId = data.status?.id;

      const success = statusId === 3 && stderr.length === 0;
      let finalOutput = stdout;
      if (!finalOutput && stderr) {
        finalOutput = stderr;
      }
      if (!finalOutput) {
        finalOutput = "Program completed with no output (Process exited cleanly).";
      }

      return {
        success,
        output: finalOutput,
        stderr: stderr || undefined,
        exitCode: statusId === 3 ? 0 : 1,
        stdin,
      };
    }
  } catch {
    return null;
  }
  return null;
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
