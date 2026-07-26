import React, { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Users, LogOut, Shield, Code2 } from "lucide-react";
import { socket, useSocketStatus } from "../services/socket";
import { realtimeBus } from "../services/realtimeBus";
import { runPythonCode, ExecutionResult } from "../services/ExecutionService";
import { requestAIHint, HintResponseResult } from "../services/AIService";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LiveEditor } from "../components/classroom/LiveEditor";
import { PracticeEditor } from "../components/classroom/PracticeEditor";
import { ResizableSplitLayout } from "../components/classroom/ResizableSplitLayout";
import { StudentListPanel } from "../components/classroom/StudentListPanel";
import { ProblemPanel } from "../components/classroom/ProblemPanel";
import { Student } from "../components/classroom/WaitingRoomPanel";
import { PracticeProblem } from "../shared/problems";

export const StudentClassroom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { status: socketConnectionStatus, isConnected } = useSocketStatus();

  const currentRoomId = (roomCode || "").toUpperCase();
  const studentName = (location.state as { studentName?: string })?.studentName || "Student";
  const [studentId] = useState<string>(() => `student-${Math.random().toString(36).substring(2, 9)}`);

  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "ended">("pending");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Practice Session & Practice IDE State for Student
  const [isPracticeEnabled, setIsPracticeEnabled] = useState<boolean>(false);
  const [activePractice, setActivePractice] = useState<PracticeProblem | null>(null);
  const [isSessionEnded, setIsSessionEnded] = useState<boolean>(false);
  const [practiceCode, setPracticeCode] = useState<string>(
    "# Write your Python solution below\n\n"
  );
  const [practiceStdin, setPracticeStdin] = useState<string>("");
  const [isPracticeExecuting, setIsPracticeExecuting] = useState<boolean>(false);
  const [practiceResult, setPracticeResult] = useState<ExecutionResult | null>(null);

  // OpenRouter AI Hint State
  const [hintResult, setHintResult] = useState<HintResponseResult | null>(null);
  const [isRequestingHint, setIsRequestingHint] = useState<boolean>(false);
  const [isHintPanelOpen, setIsHintPanelOpen] = useState<boolean>(false);

  // Real-Time Student Practice Code & Terminal Output Sync to Backend Room Memory
  useEffect(() => {
    if (!currentRoomId || status !== "approved") return;

    const timer = setTimeout(() => {
      realtimeBus.emit("sync-student-practice-code", {
        roomId: currentRoomId,
        studentId,
        code: practiceCode,
        terminalResult: practiceResult,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [currentRoomId, studentId, status, practiceCode, practiceResult]);

  useEffect(() => {
    if (!currentRoomId) return;

    const emitJoinRequest = () => {
      realtimeBus.emit(
        "join-request",
        { roomId: currentRoomId, studentId, name: studentName },
        (res: any) => {
          if (res && res.status === "pending") {
            // Pending status
          } else if (res && !res.success) {
            navigate("/error", {
              state: { type: "invalid-code", message: res.message },
            });
          }
        }
      );
    };

    emitJoinRequest();
    socket.on("connect", emitJoinRequest);

    const handleStudentApproved = (data: { roomId: string; studentId?: string; editorContent: string; activePractice?: PracticeProblem }) => {
      if (data.studentId && data.studentId !== studentId) return;
      console.log(`[StudentClassroom] Approved by host for room ${currentRoomId}`);
      setStatus("approved");
      if (data.editorContent !== undefined) {
        setEditorContent(data.editorContent);
      }
      if (data.activePractice) {
        setActivePractice(data.activePractice);
        setIsPracticeEnabled(true);
        setIsSessionEnded(false);
        setPracticeCode("# Write your Python solution below\n\n");
        if (data.activePractice.exampleInput && data.activePractice.exampleInput !== "None") {
          setPracticeStdin(data.activePractice.exampleInput);
        }
      }
    };

    const handleStudentRejected = (data: { roomId: string; studentId?: string; reason?: string }) => {
      if (data.studentId && data.studentId !== studentId) return;
      setStatus("rejected");
      setRejectionReason(data.reason || "The teacher declined your join request.");
    };

    const handleEditorUpdate = (data: { content: string; roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setEditorContent(data.content);
    };

    const handleStudentConnected = (data: { students: Student[]; roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setStudents([...(data.students || [])]);
    };

    const handleExecutionResult = (data: ExecutionResult) => {
      if (data?.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setIsExecuting(false);
      setExecutionResult(data);
    };

    // Practice Session Listener (Auto-opens practice mode & clears code to BLANK)
    const handlePracticeStarted = (data: { practice: PracticeProblem; roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      console.log("[StudentClassroom] Practice Session Started:", data.practice.title);
      setActivePractice(data.practice);
      setIsPracticeEnabled(true);
      setIsSessionEnded(false);
      setPracticeCode("# Write your Python solution below\n\n");
      setHintResult(null);
      setIsHintPanelOpen(false);

      if (data.practice.exampleInput && data.practice.exampleInput !== "None") {
        setPracticeStdin(data.practice.exampleInput);
      }
    };

    const handlePracticeEnded = (data: { roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      console.log("[StudentClassroom] Practice Session Ended");
      setIsSessionEnded(true);
    };

    // Teacher Student Code & Terminal Inspection Listener
    const handleTeacherRequestCode = (data: { teacherSocketId: string }) => {
      console.log("[StudentClassroom] Teacher requested my practice code & terminal output. Replying...");
      realtimeBus.emit("send-student-code", {
        teacherSocketId: data.teacherSocketId,
        studentId,
        studentName,
        code: practiceCode,
        terminalResult: practiceResult,
      });
    };

    // Teacher Live Code Fix Push Listener
    const handleTeacherEditedMyCode = (data: { code: string }) => {
      console.log("[StudentClassroom] Teacher pushed a live code fix to my editor!");
      if (data.code !== undefined) {
        setPracticeCode(data.code);
      }
    };

    const handleRoomEnded = (data: { roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setStatus("ended");
      navigate("/class-ended");
    };

    const handleTeacherDisconnected = () => {
      navigate("/error", {
        state: { type: "teacher-disconnected", message: "The teacher disconnected from the classroom." },
      });
    };

    realtimeBus.on("student-approved", handleStudentApproved);
    realtimeBus.on("student-rejected", handleStudentRejected);
    realtimeBus.on("editor-update", handleEditorUpdate);
    realtimeBus.on("student-connected", handleStudentConnected);
    realtimeBus.on("student-disconnected", handleStudentConnected);
    realtimeBus.on("execution-result", handleExecutionResult);
    realtimeBus.on("practice-started", handlePracticeStarted);
    realtimeBus.on("receive-practice", handlePracticeStarted);
    realtimeBus.on("practice-ended", handlePracticeEnded);
    realtimeBus.on("request-student-code", handleTeacherRequestCode);
    realtimeBus.on("teacher-edited-code", handleTeacherEditedMyCode);
    realtimeBus.on("room-ended", handleRoomEnded);
    realtimeBus.on("teacher-disconnected", handleTeacherDisconnected);

    return () => {
      socket.off("connect", emitJoinRequest);
      realtimeBus.off("student-approved", handleStudentApproved);
      realtimeBus.off("student-rejected", handleStudentRejected);
      realtimeBus.off("editor-update", handleEditorUpdate);
      realtimeBus.off("student-connected", handleStudentConnected);
      realtimeBus.off("student-disconnected", handleStudentConnected);
      realtimeBus.off("execution-result", handleExecutionResult);
      realtimeBus.off("practice-started", handlePracticeStarted);
      realtimeBus.off("receive-practice", handlePracticeStarted);
      realtimeBus.off("practice-ended", handlePracticeEnded);
      realtimeBus.off("request-student-code", handleTeacherRequestCode);
      realtimeBus.off("teacher-edited-code", handleTeacherEditedMyCode);
      realtimeBus.off("room-ended", handleRoomEnded);
      realtimeBus.off("teacher-disconnected", handleTeacherDisconnected);
    };
  }, [currentRoomId, studentId, studentName, practiceCode, practiceResult, navigate]);

  const handleClearTeacherTerminal = () => {
    setExecutionResult(null);
  };

  const handleClearPracticeTerminal = () => {
    setPracticeResult(null);
  };

  const handleForkTeacherCode = () => {
    setPracticeCode(editorContent);
  };

  const handleRunPracticeCode = async () => {
    if (isPracticeExecuting) return;
    setIsPracticeExecuting(true);
    setPracticeResult(null);

    // Private student practice execution (roomId = "" prevents broadcasting to room)
    const result = await runPythonCode(practiceCode, "", practiceStdin);
    setIsPracticeExecuting(false);
    setPracticeResult(result);

    // Immediately sync execution result to server
    realtimeBus.emit("sync-student-practice-code", {
      roomId: currentRoomId,
      studentId,
      code: practiceCode,
      terminalResult: result,
    });
  };

  const handleGetAIHint = async () => {
    if (isRequestingHint) return;

    setIsRequestingHint(true);
    setIsHintPanelOpen(true);

    const result = await requestAIHint({
      problemTitle: activePractice?.title,
      problemDescription: activePractice?.description,
      studentCode: practiceCode,
      output: practiceResult?.output,
      stderr: practiceResult?.stderr,
      language: "python",
    });

    setIsRequestingHint(false);
    setHintResult(result);
  };

  if (status === "pending") {
    return (
      <div className="relative min-h-screen bg-[#0B0E14] bg-grid-pattern flex flex-col justify-between overflow-hidden">
        <header className="px-6 py-6 max-w-7xl mx-auto w-full flex items-center justify-between">
          <button
            onClick={() => navigate("/join")}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Cancel Request</span>
          </button>
          <StatusBadge status={socketConnectionStatus} isConnected={isConnected} />
        </header>

        <main className="max-w-md mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center text-center z-10">
          <div className="glass-card rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6">
            <LoadingSpinner type="approval" message={`Request sent for room ${currentRoomId} as ${studentName}.`} />
          </div>
        </main>

        <footer className="py-6 text-center text-xs text-slate-600">
          Classora Access Protocol
        </footer>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="relative min-h-screen bg-[#0B0E14] bg-grid-pattern flex flex-col justify-between overflow-hidden">
        <main className="max-w-md mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center text-center z-10">
          <div className="glass-card rounded-3xl p-8 border border-rose-900/40 shadow-2xl space-y-6">
            <h1 className="text-2xl font-bold text-white mb-2">Request Declined</h1>
            <p className="text-slate-400 text-sm">{rejectionReason}</p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/join")}
                className="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 cursor-pointer"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate("/")}
                className="w-1/2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Go Home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="px-4 md:px-6 py-3.5 border-b border-slate-800/80 bg-[#111621]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50 cursor-pointer"
            title="Leave Classroom"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white leading-tight">Classroom #{currentRoomId}</h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  STUDENT
                </span>
              </div>
              <p className="text-xs text-slate-400">Student: <span className="text-slate-200 font-semibold">{studentName}</span></p>
            </div>
          </div>
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Practice Toggle Button */}
          <button
            onClick={() => setIsPracticeEnabled((prev) => !prev)}
            className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer border ${
              isPracticeEnabled
                ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400/40 shadow-cyan-500/20"
                : "bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-500/30"
            }`}
          >
            <Code2 className="w-4 h-4 text-cyan-300" />
            <span>{isPracticeEnabled ? "Disable Practice" : "Enable Practice"}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                isPracticeEnabled ? "bg-cyan-300 animate-ping" : "bg-slate-600"
              }`}
            ></span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Teacher Online</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
            <Users className="w-4 h-4 text-blue-400" />
            <span>{students.length} Connected</span>
          </div>

          <StatusBadge status={socketConnectionStatus} isConnected={isConnected} />

          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs border border-rose-500/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Workspace Area (3 Columns or Full Width when Practice Enabled) */}
        <div className="lg:col-span-3 flex flex-col space-y-4 min-w-0">
          {!isPracticeEnabled ? (
            /* Single Full-Width Teacher Broadcast View (Default OFF) */
            <LiveEditor
              value={editorContent}
              isHost={false}
              isExecuting={isExecuting}
              executionResult={executionResult}
              onClearTerminal={handleClearTeacherTerminal}
              stdin={executionResult?.stdin || ""}
            />
          ) : (
            /* Resizable Split-Screen View (When Practice ON) */
            <ResizableSplitLayout
              left={
                <LiveEditor
                  value={editorContent}
                  isHost={false}
                  isExecuting={isExecuting}
                  executionResult={executionResult}
                  onClearTerminal={handleClearTeacherTerminal}
                  stdin={executionResult?.stdin || ""}
                />
              }
              right={
                <div className="space-y-4 flex flex-col flex-1">
                  {/* Problem Panel (Rendered when activePractice session is running) */}
                  {activePractice && (
                    <ProblemPanel
                      problem={activePractice}
                      onUseExampleInput={(input) => setPracticeStdin(input)}
                      isSessionEnded={isSessionEnded}
                    />
                  )}

                  {/* Student Practice Editor */}
                  <PracticeEditor
                    value={practiceCode}
                    onChange={setPracticeCode}
                    onFork={handleForkTeacherCode}
                    onRun={handleRunPracticeCode}
                    isExecuting={isPracticeExecuting}
                    executionResult={practiceResult}
                    onClearTerminal={handleClearPracticeTerminal}
                    stdin={practiceStdin}
                    onChangeStdin={setPracticeStdin}
                    onGetHint={handleGetAIHint}
                    isRequestingHint={isRequestingHint}
                    hintResult={hintResult}
                    isHintPanelOpen={isHintPanelOpen}
                    onToggleHintPanel={() => setIsHintPanelOpen((prev) => !prev)}
                    onCloseHintPanel={() => setIsHintPanelOpen(false)}
                  />
                </div>
              }
            />
          )}
        </div>

        {/* Rightmost Sidebar: Connected Students List */}
        <div className="space-y-6 flex flex-col min-w-0">
          <StudentListPanel
            students={students}
            currentStudentName={studentName}
            roomCode={currentRoomId}
            isHost={false}
          />
        </div>
      </div>
    </div>
  );
};
