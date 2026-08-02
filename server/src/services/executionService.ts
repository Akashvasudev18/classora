import { spawn } from "child_process";

export interface ExecutionResult {
  success: boolean;
  output: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  stdin?: string;
}

const PISTON_V1_API_URL = "https://emkc.org/api/v1/piston/execute";
const EXECUTION_TIMEOUT_MS = 10000;

/**
 * Execute Python code via Piston API v1 (public, unrestricted 200 OK endpoint).
 * Fallback to local Python process if available on local dev host.
 */
export async function executePythonCode(code: string, stdin: string = ""): Promise<ExecutionResult> {
  if (!code || code.trim() === "") {
    return {
      success: false,
      output: "Error: No Python code provided for execution.",
      stderr: "Empty code buffer.",
      exitCode: 1,
      stdin,
    };
  }

  const startTime = Date.now();

  // Tier 1: Local Python process if available
  try {
    const localRes = await runLocalPython(code, stdin, EXECUTION_TIMEOUT_MS);
    if (localRes) {
      return {
        ...localRes,
        durationMs: Date.now() - startTime,
        stdin,
      };
    }
  } catch {
    // Ignore and proceed to Piston API v1
  }

  // Tier 2: Piston API v1 (Unrestricted Public Engine)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const response = await fetch(PISTON_V1_API_URL, {
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
      const durationMs = Date.now() - startTime;

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
        durationMs,
        stdin,
      };
    }
  } catch (err: any) {
    console.error(`[ExecutionService] Piston v1 error:`, err?.message);
  }

  const durationMs = Date.now() - startTime;
  return {
    success: false,
    output: "Execution Error: Unable to execute code. Please check your network connection.",
    stderr: "Piston execution failed.",
    exitCode: 1,
    durationMs,
    stdin,
  };
}

function runLocalPython(code: string, stdin: string, timeoutMs: number): Promise<ExecutionResult | null> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let isResolved = false;

    const pythonBin = process.platform === "win32" ? "python" : "python3";

    try {
      const child = spawn(pythonBin, ["-c", code], { timeout: timeoutMs });

      if (stdin && child.stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", () => {
        if (!isResolved) {
          isResolved = true;
          resolve(null);
        }
      });

      child.on("close", (exitCode) => {
        if (!isResolved) {
          isResolved = true;
          const cleanStdout = stdout.trim();
          const cleanStderr = stderr.trim();
          const success = (exitCode === 0 || exitCode === null) && cleanStderr.length === 0;

          let finalOutput = cleanStdout;
          if (!finalOutput && cleanStderr) {
            finalOutput = cleanStderr;
          }
          if (!finalOutput) {
            finalOutput = "Program completed with no output (Process exited cleanly).";
          }

          resolve({
            success,
            output: finalOutput,
            stderr: cleanStderr || undefined,
            exitCode: exitCode ?? 0,
          });
        }
      });
    } catch {
      resolve(null);
    }
  });
}
