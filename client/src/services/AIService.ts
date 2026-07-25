import { socketService } from "./SocketService";

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

export async function requestAIHint(payload: HintRequestPayload): Promise<HintResponseResult> {
  const targetServerUrl = socketService.getCurrentUrl();
  const endpoint = `${targetServerUrl.replace(/\/$/, "")}/api/ai/hint`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return {
        success: false,
        hint: "The AI Assistant service is temporarily unavailable. Please try again.",
        error: `HTTP ${response.status}: ${text}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      hint: "Network Error: Unable to reach the AI Assistant backend. Please check your internet connection.",
      error: err.toString(),
    };
  }
}
