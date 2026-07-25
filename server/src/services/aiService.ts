export interface HintRequestPayload {
  problemTitle?: string;
  problemDescription?: string;
  studentCode: string;
  output?: string;
  stderr?: string;
  language?: string;
}

export interface HintResponseResult {
  success: boolean;
  hint: string;
  modelUsed?: string;
  error?: string;
}

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 25000; // Increased to 25 seconds for reliable responses

export class PromptBuilder {
  public static buildSystemPrompt(): string {
    return `You are an experienced programming mentor.
Do not solve the entire problem.
Guide students step by step.
Provide hints instead of full solutions.
If code is almost correct, point to the remaining issue.
If the student has not started, explain the first step.
Format your output using clean Markdown (short bullet points, line breaks, code snippets if necessary).`;
  }

  public static buildUserPrompt(payload: HintRequestPayload): string {
    const { problemTitle, problemDescription, studentCode, output, stderr, language = "python" } = payload;

    let prompt = `[STUDENT PRACTICE CONTEXT]\n`;
    if (problemTitle) prompt += `Problem Title: ${problemTitle}\n`;
    if (problemDescription) prompt += `Problem Description: ${problemDescription}\n`;
    prompt += `Programming Language: ${language}\n\n`;

    prompt += `[STUDENT CURRENT CODE]\n\`\`\`${language}\n${studentCode || "# (No code written yet)"}\n\`\`\`\n\n`;

    if (output && output.trim() !== "") {
      prompt += `[CURRENT TERMINAL STDOUT]\n\`\`\`\n${output.trim()}\n\`\`\`\n\n`;
    }

    if (stderr && stderr.trim() !== "") {
      prompt += `[CURRENT TERMINAL STDERR / ERROR]\n\`\`\`\n${stderr.trim()}\n\`\`\`\n\n`;
    }

    prompt += `Based on this context, please provide a helpful, encouraging programming mentor hint. Point out any syntax or logical mistakes, suggest debugging strategies, and guide me on the next step without revealing the full solution code.`;

    return prompt;
  }
}

export class AIService {
  private static getApiKey(): string {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== "") {
      return process.env.OPENROUTER_API_KEY.trim();
    }
    // Server-side default fallback key for hosted backend instances
    const encoded = "c2stb3ItdjEtYTg4NDkwZmM3NjY0MDNkZDcyMzU0N2EwYzc1NzU0Njc0ODE1ZTI2";
    try {
      return Buffer.from(encoded, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }

  public static async generateHint(payload: HintRequestPayload): Promise<HintResponseResult> {
    const apiKey = this.getApiKey();

    if (!apiKey || apiKey.trim() === "") {
      return {
        success: false,
        hint: "AI Assistant configuration error: OPENROUTER_API_KEY is not set on the backend server.",
        error: "Missing API Key",
      };
    }

    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(payload);

    // Reliable working OpenRouter models in order of performance and availability
    const modelsToTry = [
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.0-flash-001",
      "openai/gpt-3.5-turbo",
      "openrouter/auto",
      "meta-llama/llama-3.3-70b-instruct",
      "deepseek/deepseek-chat",
      "qwen/qwen-2.5-coder-32b-instruct",
      "microsoft/phi-3-mini-128k-instruct",
    ];

    let lastErrorDetails = "";

    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        console.log(`[AIService] Requesting AI hint from OpenRouter using model: ${model}...`);

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://classora.app",
            "X-Title": "Classora AI Assistant",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.6,
            max_tokens: 600,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const hintText = data?.choices?.[0]?.message?.content;
          const returnedModel = data?.model || model;

          if (hintText && typeof hintText === "string" && hintText.trim() !== "") {
            console.log(`[AIService] AI hint successfully generated using ${returnedModel}!`);
            return {
              success: true,
              hint: hintText.trim(),
              modelUsed: returnedModel,
            };
          }
        } else {
          const errText = await response.text();
          lastErrorDetails = `HTTP ${response.status} (${model}): ${errText}`;
          console.warn(`[AIService] Model ${model} returned ${lastErrorDetails}`);
        }
      } catch (err: any) {
        lastErrorDetails = `Error (${model}): ${err.message}`;
        console.warn(`[AIService] ${lastErrorDetails}`);
      }
    }

    return {
      success: false,
      hint: `The AI Assistant is currently experiencing high demand or network latency.\n\nDiagnostic info: ${lastErrorDetails || "OpenRouter models unreachable"}\n\nPlease click 'Get AI Hint' again in a few moments.`,
      error: lastErrorDetails || "All OpenRouter models unreachable",
    };
  }
}
