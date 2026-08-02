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

const PISTON_V1_DIRECT_URL = "https://emkc.org/api/v1/piston/execute";

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

    // Helper: Execute via Direct Piston API v1 client fallback
    const tryDirectPistonV1 = async () => {
      const directRes = await runPistonV1Client(code, stdin);
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
          await tryDirectPistonV1();
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
            await tryDirectPistonV1();
          }
        }
      })
      .catch(async () => {
        await tryDirectPistonV1();
      });

    // 3. Fallback trigger after 2 seconds to direct Piston API v1
    setTimeout(async () => {
      if (!hasResolved) {
        const ok = await tryDirectPistonV1();
        if (!ok && !hasResolved) {
          resolveOnce({
            success: false,
            output: "Execution Error: Unable to execute Python code. Please check your network connection.",
            stderr: "Execution timeout.",
            exitCode: 124,
            stdin,
          });
        }
      }
    }, 2000);
  });
}

/**
 * Executes Python code directly from client browser using Piston API v1 endpoint.
 */
async function runPistonV1Client(code: string, stdin: string): Promise<ExecutionResult | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(PISTON_V1_DIRECT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: "python3",
        source: code,
        stdin: stdin || "",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const stdout = (data.stdout || data.output || "").trim();
      const stderr = (data.stderr || "").trim();

      const success = data.ran === true && stderr.length === 0;
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
        exitCode: stderr.length > 0 ? 1 : 0,
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
