import { spawn } from "child_process";

export interface ExecutionResult {
  success: boolean;
  output: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  stdin?: string;
}

const JUDGE0_API_URL = "https://ce.judge0.com/submissions?wait=true";
const WANDBOX_API_URL = "https://wandbox.org/api/compile.json";
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";
const EXECUTION_TIMEOUT_MS = 10000;

/**
 * Execute Python code via a resilient multi-tier engine strategy:
 * 1. Local Python runtime (child_process) for instant, 100% offline & reliable execution.
 * 2. Judge0 CE API (https://ce.judge0.com) high-availability public sandbox runner.
 * 3. Wandbox API fallback.
 * 4. Piston API fallback.
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

  // Tier 1: Local Python Runtime Execution (Sub-100ms, offline, zero rate limits)
  try {
    const localRes = await runLocalPython(code, stdin, EXECUTION_TIMEOUT_MS);
    if (localRes) {
      return {
        ...localRes,
        durationMs: Date.now() - startTime,
        stdin,
      };
    }
  } catch (err: any) {
    console.warn(`[ExecutionService] Local Python engine unavailable (${err?.message}). Falling back to Judge0 CE...`);
  }

  // Tier 2: Judge0 CE Cloud Runner (Python 3.8 / 3.11 with stdin)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const response = await fetch(JUDGE0_API_URL, {
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
      const durationMs = Date.now() - startTime;

      const stdout = (data.stdout || "").trim();
      const stderr = (data.stderr || data.compile_output || data.message || "").trim();
      const statusId = data.status?.id;

      // Judge0 status id 3 is "Accepted"
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
        durationMs,
        stdin,
      };
    }
  } catch (err: any) {
    console.warn(`[ExecutionService] Judge0 CE engine unavailable (${err?.message}). Falling back to Wandbox...`);
  }

  // Tier 3: Wandbox Cloud API (Python 3.x)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const response = await fetch(WANDBOX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compiler: "cpython-3.12.7",
        code,
        stdin,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const durationMs = Date.now() - startTime;

      const stdout = (data.program_output || "").trim();
      const stderr = (data.program_error || data.compiler_error || "").trim();
      const exitCode = typeof data.status === "string" ? parseInt(data.status, 10) : 0;

      // Filter out Wandbox container runtime errors (e.g. OCI runtime error)
      const isOciError = stderr.includes("Resource temporarily unavailable") || stderr.includes("OCI runtime error");

      if (!isOciError) {
        const success = exitCode === 0 && stderr.length === 0;
        let finalOutput = stdout || stderr || "Program completed with no output.";

        return {
          success,
          output: finalOutput,
          stderr: stderr || undefined,
          exitCode,
          durationMs,
          stdin,
        };
      }
    }
  } catch (err: any) {
    console.warn(`[ExecutionService] Wandbox engine error (${err?.message}).`);
  }

  // Tier 4: Piston API (Fallback for custom self-hosted Piston instances)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const response = await fetch(PISTON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: "python",
        version: "3.10.0",
        stdin,
        files: [
          {
            name: "main.py",
            content: code,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const run = data.run || {};
      const durationMs = Date.now() - startTime;

      const stdout = (run.stdout || "").trim();
      const stderr = (run.stderr || "").trim();
      const output = (run.output || "").trim();
      const exitCode = typeof run.code === "number" ? run.code : 0;

      const success = exitCode === 0 && stderr.length === 0;
      let finalOutput = output || stdout || stderr || "Program completed with no output.";

      return {
        success,
        output: finalOutput,
        stderr: stderr || undefined,
        exitCode,
        durationMs,
        stdin,
      };
    }
  } catch (err: any) {
    console.warn(`[ExecutionService] Piston engine fallback error:`, err?.message);
  }

  const durationMs = Date.now() - startTime;
  return {
    success: false,
    output: "Execution Error: Code execution engines are currently unreachable. Please check network connection.",
    stderr: "All execution engines failed.",
    exitCode: 1,
    durationMs,
    stdin,
  };
}

/**
 * Executes Python code locally using child_process.spawn if Python is installed on the host machine.
 */
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
          resolve(null); // Fast fallback if local python is not available
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
