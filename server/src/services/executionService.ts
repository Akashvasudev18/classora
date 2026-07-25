export interface ExecutionResult {
  success: boolean;
  output: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  stdin?: string;
}

const WANDBOX_API_URL = "https://wandbox.org/api/compile.json";
const PISTON_API_URL = "https://emkc.org/api/v2/piston/execute";
const EXECUTION_TIMEOUT_MS = 10000;

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

  // Primary Execution Engine: Wandbox API (Python 3.14 with stdin support)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EXECUTION_TIMEOUT_MS);

    const response = await fetch(WANDBOX_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compiler: "cpython-3.14.0",
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

      const success = exitCode === 0 && stderr.length === 0;

      let finalOutput = stdout;
      if (!finalOutput && stderr) {
        finalOutput = stderr;
      }
      if (!finalOutput) {
        finalOutput = "Program completed with no output (Process exited with code 0).";
      }

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
    console.warn(`[ExecutionService] Wandbox engine unavailable (${err.message}). Attempting Piston engine...`);
  }

  // Secondary Execution Engine Fallback: Piston API (Python 3.10 with stdin support)
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
      let finalOutput = output || stdout || stderr || "Program completed with no output (Process exited with code 0).";

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
    console.error(`[ExecutionService] Piston engine error:`, err);
  }

  const durationMs = Date.now() - startTime;
  return {
    success: false,
    output: "Execution Error: Unable to execute Python code at this time. Please check network connection.",
    stderr: "Network / Engine Unreachable.",
    exitCode: 1,
    durationMs,
    stdin,
  };
}
