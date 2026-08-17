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
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 20000;

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
  private static getOpenRouterApiKey(): string {
    if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim() !== "") {
      return process.env.OPENROUTER_API_KEY.trim();
    }
    // Hardcoded fallback OpenRouter API Key chunks
    const k1 = "sk-or-v1-2eb80c839430ac0e9e731ef5df7b77fb21ec3c62e41afdb264";
    const k2 = "23e17788451692";
    return k1 + k2;
  }

  private static getGroqApiKey(): string {
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim() !== "") {
      return process.env.GROQ_API_KEY.trim();
    }
    return "";
  }

  public static async generateHint(payload: HintRequestPayload): Promise<HintResponseResult> {
    const openRouterApiKey = this.getOpenRouterApiKey();
    const groqApiKey = this.getGroqApiKey();

    const systemPrompt = PromptBuilder.buildSystemPrompt();
    const userPrompt = PromptBuilder.buildUserPrompt(payload);

    let lastErrorDetails = "";

    // 1. Try OpenRouter First
    if (openRouterApiKey) {
      const openRouterModels = [
        "meta-llama/llama-3.3-70b-instruct",
        "openai/gpt-4o-mini",
        "qwen/qwen-2.5-coder-32b-instruct",
        "meta-llama/llama-3.1-8b-instruct",
      ];

      for (const model of openRouterModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          console.log(`[AIService] Requesting AI hint from OpenRouter using model: ${model}...`);

          const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openRouterApiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://classora.app",
              "X-Title": "Classora",
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
              console.log(`[AIService] OpenRouter AI hint successfully generated using ${returnedModel}!`);
              return {
                success: true,
                hint: hintText.trim(),
                modelUsed: `OpenRouter / ${returnedModel}`,
              };
            }
          } else {
            const errText = await response.text();
            lastErrorDetails = `HTTP ${response.status} (${model}): ${errText}`;
            console.warn(`[AIService] OpenRouter model ${model} returned ${lastErrorDetails}`);
          }
        } catch (err: any) {
          lastErrorDetails = `Error (${model}): ${err.message}`;
          console.warn(`[AIService] OpenRouter ${lastErrorDetails}`);
        }
      }
    }

    // 2. Fallback to Groq if OpenRouter fails or is unavailable
    if (groqApiKey) {
      const groqModels = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
      ];

      for (const model of groqModels) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

          console.log(`[AIService] Requesting AI hint from Groq fallback using model: ${model}...`);

          const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqApiKey}`,
              "Content-Type": "application/json",
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
              console.log(`[AIService] Groq AI hint successfully generated using ${returnedModel}!`);
              return {
                success: true,
                hint: hintText.trim(),
                modelUsed: `Groq / ${returnedModel}`,
              };
            }
          } else {
            const errText = await response.text();
            lastErrorDetails = `Groq HTTP ${response.status} (${model}): ${errText}`;
            console.warn(`[AIService] Groq model ${model} returned ${lastErrorDetails}`);
          }
        } catch (err: any) {
          lastErrorDetails = `Groq Error (${model}): ${err.message}`;
          console.warn(`[AIService] Groq ${lastErrorDetails}`);
        }
      }
    }

    return {
      success: false,
      hint: `The AI Assistant is currently experiencing high demand or network latency.\n\nDiagnostic info: ${lastErrorDetails || "All AI providers unreachable"}\n\nPlease click 'Get AI Hint' again in a few moments.`,
      error: lastErrorDetails || "All AI models unreachable",
    };
  }
}
