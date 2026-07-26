import { socketService } from "./SocketService";

export interface StudentSnapshotPayload {
  studentId: string;
  studentName: string;
  code: string;
  output?: string;
  stderr?: string;
}

export interface ClassAnalysisRequestPayload {
  roomId?: string;
  problemTitle?: string;
  problemDescription?: string;
  studentsData?: StudentSnapshotPayload[];
}

export interface StudentAnalysisResult {
  studentId: string;
  studentName: string;
  understandingLevel: number; // 0-100
  progress: number; // 0-100
  difficultyLevel: "Low" | "Medium" | "High";
  currentMistakes: string[];
  missingConcepts: string[];
  recommendedGuidance: string;
  summary: string;
  needHelp: boolean;
  statusColor: "green" | "yellow" | "red";
}

export interface ClassAnalysisResponseResult {
  success: boolean;
  timestamp: string;
  modelUsed?: string;
  analysis: StudentAnalysisResult[];
  error?: string;
}

export async function analyzeClassProgress(payload: ClassAnalysisRequestPayload): Promise<ClassAnalysisResponseResult> {
  const targetServerUrl = socketService.getCurrentUrl();
  const endpoint = `${targetServerUrl.replace(/\/$/, "")}/api/ai/analyze-class`;

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
        timestamp: new Date().toISOString(),
        analysis: [],
        error: `HTTP ${response.status}: ${text}`,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      analysis: [],
      error: err.toString(),
    };
  }
}
