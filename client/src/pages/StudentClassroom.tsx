import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Users, LogOut, Shield, Code2, Columns, Monitor, Copy } from "lucide-react";
import { socket, useSocketStatus } from "../services/socket";
import { realtimeBus } from "../services/realtimeBus";
import { runPythonCode, ExecutionResult } from "../services/ExecutionService";
import { requestAIHint, HintResponseResult } from "../services/AIService";
import { fetchLiveKitToken, livekitVoiceManager, unlockAudioPlayer } from "../services/livekitVoice";
import { StatusBadge } from "../components/common/StatusBadge";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { LiveEditor } from "../components/classroom/LiveEditor";
import { PracticeEditor } from "../components/classroom/PracticeEditor";
import { ResizableSplitLayout } from "../components/classroom/ResizableSplitLayout";
import { StudentListPanel } from "../components/classroom/StudentListPanel";
import { ProblemPanel } from "../components/classroom/ProblemPanel";
import { SleekVoiceSidebar } from "../components/classroom/SleekVoiceSidebar";
import { Logo } from "../components/common/Logo";
import { Student } from "../components/classroom/WaitingRoomPanel";
import { PracticeProblem } from "../shared/problems";

export const StudentClassroom: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { status: socketConnectionStatus, isConnected } = useSocketStatus();

  const currentRoomId = (roomCode || "").toUpperCase();
  const studentName = (location.state as { studentName?: string })?.studentName || "Student";
  const [studentId] = useState<string>(() => {
    const saved = sessionStorage.getItem("classora_student_id");
    if (saved) return saved;
    const newId = `student-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("classora_student_id", newId);
    return newId;
  });

  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "ended">("pending");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [editorContent, setEditorContent] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  // Practice Session & Practice IDE State for Student
  const [isPracticeEnabled, setIsPracticeEnabled] = useState<boolean>(false);
  const [practiceViewMode, setPracticeViewMode] = useState<"split" | "teacher" | "practice">("split");
  const [activePractice, setActivePractice] = useState<PracticeProblem | null>(null);
  const [isSessionEnded, setIsSessionEnded] = useState<boolean>(false);
  const [practiceCode, setPracticeCode] = useState<string>(() => {
    const saved = currentRoomId ? sessionStorage.getItem(`classora_practice_${currentRoomId}`) : null;
    return saved || "# Write your Python solution below\n\n";
  });
  const [practiceStdin, setPracticeStdin] = useState<string>("");
  const [isPracticeExecuting, setIsPracticeExecuting] = useState<boolean>(false);
  const [practiceResult, setPracticeResult] = useState<ExecutionResult | null>(null);

  // Helper to change practice code and save draft to sessionStorage
  const handlePracticeCodeChange = (newCode: string) => {
    setPracticeCode(newCode);
    practiceCodeRef.current = newCode;
    if (currentRoomId) {
      sessionStorage.setItem(`classora_practice_${currentRoomId}`, newCode);
    }
  };

  // Refs for practice state so socket event listeners read fresh state without triggering useEffect re-runs
  const practiceCodeRef = useRef<string>(practiceCode);
  const practiceResultRef = useRef<ExecutionResult | null>(practiceResult);
  const activePracticeRef = useRef<PracticeProblem | null>(activePractice);

  useEffect(() => {
    practiceCodeRef.current = practiceCode;
  }, [practiceCode]);

  useEffect(() => {
    practiceResultRef.current = practiceResult;
  }, [practiceResult]);

  useEffect(() => {
    activePracticeRef.current = activePractice;
  }, [activePractice]);

  // Voice Communication & Permissions State (LiveKit Cloud & Web Audio PCM Relay Engine)
  const [isVoiceConnected, setIsVoiceConnected] = useState<boolean>(false);
  const [hasHandRaised, setHasHandRaised] = useState<boolean>(false);
  const [isSpeakingPermitted, setIsSpeakingPermitted] = useState<boolean>(false);
  const [isListeningToTeacher, setIsListeningToTeacher] = useState<boolean>(false);
  const [raisedHands, setRaisedHands] = useState<string[]>([]);
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);

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

    unlockAudioPlayer();

    // Connect LiveKit Cloud Voice or Web Audio API PCM Engine on Student Approval
    const initVoice = async () => {
      console.log(`[StudentClassroom] Requesting voice token for room ${currentRoomId} as "${studentName}"...`);
      const tokenRes = await fetchLiveKitToken(currentRoomId, studentName, false);
      const ok = await livekitVoiceManager.connect(
        tokenRes?.wsUrl || "",
        tokenRes?.token || "",
        false,
        studentName,
        currentRoomId
      );
      setIsVoiceConnected(ok);
      return ok;
    };

    livekitVoiceManager.onConnectionStateChange((connected) => {
      setIsVoiceConnected(connected);
    });

    const handleStudentApproved = (data: { roomId: string; studentId?: string; editorContent: string; activePractice?: PracticeProblem }) => {
      if (data.studentId && data.studentId !== studentId) return;
      console.log(`[StudentClassroom] Approved by host for room ${currentRoomId}`);
      setStatus("approved");
      unlockAudioPlayer();
      initVoice();

      if (data.editorContent !== undefined) {
        setEditorContent(data.editorContent);
      }
      if (data.activePractice) {
        setActivePractice(data.activePractice);
        setIsPracticeEnabled(true);
        setIsSessionEnded(false);

        // Preserve existing practice code if student has already started writing or has saved draft
        const savedDraft = currentRoomId ? sessionStorage.getItem(`classora_practice_${currentRoomId}`) : null;
        if (!savedDraft || savedDraft.trim() === "" || savedDraft === "# Write your Python solution below\n\n") {
          const starter = data.activePractice.starterCode || "# Write your Python solution below\n\n";
          handlePracticeCodeChange(starter);
        }

        if (data.activePractice.exampleInput && data.activePractice.exampleInput !== "None") {
          setPracticeStdin((prev) => prev || data.activePractice?.exampleInput || "");
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

    const handleStudentConnected = (data: { students: Student[]; roomId?: string; raisedHands?: string[]; activeSpeakerId?: string | null }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setStudents([...(data.students || [])]);
      if (data.raisedHands !== undefined) {
        setRaisedHands([...data.raisedHands]);
        setHasHandRaised(data.raisedHands.includes(studentId));
      }
      if (data.activeSpeakerId !== undefined) {
        setActiveSpeakerId(data.activeSpeakerId);
        setIsSpeakingPermitted(data.activeSpeakerId === studentId);
      }
    };

    // Voice Communication & Permission Event Handlers
    const handleVoiceStateUpdate = (data: { roomId: string; raisedHands: string[]; activeSpeakerId: string | null }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setRaisedHands([...(data.raisedHands || [])]);
      setActiveSpeakerId(data.activeSpeakerId || null);

      const amISpeaking = data.activeSpeakerId === studentId;
      setIsSpeakingPermitted(amISpeaking);
      if (amISpeaking) {
        setHasHandRaised(false);
        livekitVoiceManager.setMicrophoneEnabled(true);
      } else {
        livekitVoiceManager.setMicrophoneEnabled(false);
      }
      setHasHandRaised(data.raisedHands.includes(studentId));
    };

    const handleSpeakerPermissionGranted = () => {
      console.log("[StudentClassroom] Speaker permission GRANTED by teacher! Unmuting microphone...");
      unlockAudioPlayer();
      setIsSpeakingPermitted(true);
      setHasHandRaised(false);
      livekitVoiceManager.setMicrophoneEnabled(true);
    };

    const handleSpeakerPermissionRevoked = () => {
      console.log("[StudentClassroom] Speaker permission REVOKED by teacher. Muting microphone...");
      setIsSpeakingPermitted(false);
      setHasHandRaised(false);
      livekitVoiceManager.setMicrophoneEnabled(false);
    };

    const handleAllStudentsMuted = () => {
      console.log("[StudentClassroom] Teacher muted ALL students. Muting microphone...");
      setIsSpeakingPermitted(false);
      setHasHandRaised(false);
      livekitVoiceManager.setMicrophoneEnabled(false);
    };

    const handleExecutionResult = (data: ExecutionResult) => {
      if (data?.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setIsExecuting(false);
      setExecutionResult(data);
    };

    // Practice Session Listener
    const handlePracticeStarted = (data: { practice: PracticeProblem; roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      console.log("[StudentClassroom] Practice Session Started:", data.practice.title);

      const isSameProblem = activePracticeRef.current?.id === data.practice.id;

      setActivePractice(data.practice);
      setIsPracticeEnabled(true);
      setIsSessionEnded(false);

      if (!isSameProblem) {
        const starter = data.practice.starterCode || "# Write your Python solution below\n\n";
        handlePracticeCodeChange(starter);
      } else {
        const savedDraft = currentRoomId ? sessionStorage.getItem(`classora_practice_${currentRoomId}`) : null;
        if (!savedDraft || savedDraft.trim() === "" || savedDraft === "# Write your Python solution below\n\n") {
          const starter = data.practice.starterCode || "# Write your Python solution below\n\n";
          handlePracticeCodeChange(starter);
        }
      }

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
        code: practiceCodeRef.current,
        terminalResult: practiceResultRef.current,
      });
    };

    // Teacher Live Code Fix Push Listener
    const handleTeacherEditedMyCode = (data: { code: string }) => {
      console.log("[StudentClassroom] Teacher pushed a live code fix to my editor!");
      if (data.code !== undefined) {
        handlePracticeCodeChange(data.code);
      }
    };

    const handleRoomEnded = (data: { roomId?: string }) => {
      if (data.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      livekitVoiceManager.disconnect();
      setStatus("ended");
      navigate("/class-ended");
    };

    const handleTeacherDisconnected = () => {
      livekitVoiceManager.disconnect();
      navigate("/error", {
        state: { type: "teacher-disconnected", message: "The teacher disconnected from the classroom." },
      });
    };

    // 1. Attach ALL event listeners FIRST before sending join-request
    realtimeBus.on("student-approved", handleStudentApproved);
    realtimeBus.on("student-rejected", handleStudentRejected);
    realtimeBus.on("editor-update", handleEditorUpdate);
    realtimeBus.on("student-connected", handleStudentConnected);
    realtimeBus.on("student-disconnected", handleStudentConnected);
    realtimeBus.on("voice-state-update", handleVoiceStateUpdate);
    realtimeBus.on("speaker-permission-granted", handleSpeakerPermissionGranted);
    realtimeBus.on("speaker-permission-revoked", handleSpeakerPermissionRevoked);
    realtimeBus.on("all-students-muted", handleAllStudentsMuted);
    realtimeBus.on("execution-result", handleExecutionResult);
    realtimeBus.on("practice-started", handlePracticeStarted);
    realtimeBus.on("receive-practice", handlePracticeStarted);
    realtimeBus.on("practice-ended", handlePracticeEnded);
    realtimeBus.on("request-student-code", handleTeacherRequestCode);
    realtimeBus.on("teacher-edited-code", handleTeacherEditedMyCode);
    realtimeBus.on("room-ended", handleRoomEnded);
    realtimeBus.on("teacher-disconnected", handleTeacherDisconnected);

    // 2. NOW emit join-request and sync initial room state
    const emitJoinRequest = () => {
      realtimeBus.emit(
        "join-request",
        { roomId: currentRoomId, studentId, name: studentName },
        (res: any) => {
          if (res && res.roomState) {
            if (res.roomState.editorContent !== undefined) {
              setEditorContent(res.roomState.editorContent);
            }
            if (res.status === "approved" || (res.roomState.students && res.roomState.students.some((s: any) => s.id === studentId))) {
              setStatus("approved");
              if (res.roomState.activePractice) {
                setActivePractice(res.roomState.activePractice);
                setIsPracticeEnabled(true);
                const savedDraft = currentRoomId ? sessionStorage.getItem(`classora_practice_${currentRoomId}`) : null;
                if (!savedDraft || savedDraft.trim() === "" || savedDraft === "# Write your Python solution below\n\n") {
                  const starter = res.roomState.activePractice.starterCode || "# Write your Python solution below\n\n";
                  handlePracticeCodeChange(starter);
                }
              }
            }
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

    return () => {
      livekitVoiceManager.disconnect();
      socket.off("connect", emitJoinRequest);
      realtimeBus.off("student-approved", handleStudentApproved);
      realtimeBus.off("student-rejected", handleStudentRejected);
      realtimeBus.off("editor-update", handleEditorUpdate);
      realtimeBus.off("student-connected", handleStudentConnected);
      realtimeBus.off("student-disconnected", handleStudentConnected);
      realtimeBus.off("voice-state-update", handleVoiceStateUpdate);
      realtimeBus.off("speaker-permission-granted", handleSpeakerPermissionGranted);
      realtimeBus.off("speaker-permission-revoked", handleSpeakerPermissionRevoked);
      realtimeBus.off("all-students-muted", handleAllStudentsMuted);
      realtimeBus.off("execution-result", handleExecutionResult);
      realtimeBus.off("practice-started", handlePracticeStarted);
      realtimeBus.off("receive-practice", handlePracticeStarted);
      realtimeBus.off("practice-ended", handlePracticeEnded);
      realtimeBus.off("request-student-code", handleTeacherRequestCode);
      realtimeBus.off("teacher-edited-code", handleTeacherEditedMyCode);
      realtimeBus.off("room-ended", handleRoomEnded);
      realtimeBus.off("teacher-disconnected", handleTeacherDisconnected);
    };
  }, [currentRoomId, studentId, studentName, navigate]);

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

    const result = await runPythonCode(practiceCode, "", practiceStdin);
    setIsPracticeExecuting(false);
    setPracticeResult(result);

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

  // Student Connect / Disconnect Teacher Audio Stream
  const handleConnectTeacherAudio = () => {
    unlockAudioPlayer();
    setIsListeningToTeacher((prev) => {
      const nextState = !prev;
      if (nextState) {
        console.log(`[StudentClassroom] Explicitly connecting to Teacher lecture audio stream in room ${currentRoomId}...`);
        socket.emit("request-teacher-audio", { roomId: currentRoomId });
      }
      return nextState;
    });
  };

  // Student Raise / Lower Hand Handlers
  const handleRaiseHand = () => {
    console.log("[StudentClassroom] Raising hand...");
    unlockAudioPlayer();
    setHasHandRaised(true);
    realtimeBus.emit("raise-hand", { roomId: currentRoomId, studentId });
  };

  const handleLowerHand = () => {
    console.log("[StudentClassroom] Lowering hand...");
    setHasHandRaised(false);
    realtimeBus.emit("lower-hand", { roomId: currentRoomId, studentId });
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
            onClick={() => {
              livekitVoiceManager.disconnect();
              navigate("/");
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50 cursor-pointer"
            title="Leave Classroom"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <Logo size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Room #{currentRoomId}</span>
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
          {/* Practice View Mode Switcher (Visible when Practice is enabled) */}
          {isPracticeEnabled && (
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setPracticeViewMode("split")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  practiceViewMode === "split"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
                title="Split Screen View"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                onClick={() => setPracticeViewMode("teacher")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  practiceViewMode === "teacher"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
                title="Teacher Editor Full Screen"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Teacher View</span>
              </button>
              <button
                onClick={() => setPracticeViewMode("practice")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  practiceViewMode === "practice"
                    ? "bg-cyan-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
                title="My Practice Editor Full Screen"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">My Practice</span>
              </button>
            </div>
          )}

          {/* Practice Toggle Button */}
          <button
            onClick={() => {
              setIsPracticeEnabled((prev) => {
                const next = !prev;
                if (next) setPracticeViewMode("split");
                return next;
              });
            }}
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
            onClick={() => {
              livekitVoiceManager.disconnect();
              navigate("/");
            }}
            className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold text-xs border border-rose-500/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Container - Discord-Inspired Ultra-Sleek 3-Column Layout */}
      <div className="flex-1 max-w-[1750px] w-full mx-auto p-3 md:p-5 flex flex-row gap-4 min-w-0 overflow-x-hidden">
        {/* LEFT SIDEBAR: Ultra-Thin Sleek Discord Voice Rail */}
        <SleekVoiceSidebar
          isHost={false}
          students={students}
          raisedHands={raisedHands}
          activeSpeakerId={activeSpeakerId}
          isVoiceConnected={isVoiceConnected}
          hasHandRaised={hasHandRaised}
          isSpeakingPermitted={isSpeakingPermitted}
          onRaiseHand={handleRaiseHand}
          onLowerHand={handleLowerHand}
          onConnectTeacherAudio={handleConnectTeacherAudio}
          isListeningToTeacher={isListeningToTeacher}
        />

        {/* CENTER COLUMN: Main Workspace Area (Centered & Full Width Code Editors) */}
        <main className="flex-1 min-w-0 flex flex-col space-y-4 overflow-y-auto">
          {!isPracticeEnabled ? (
            /* Single Full-Width Teacher Broadcast View (Default OFF) */
            <div className="flex-1 flex flex-col min-h-0">
              <LiveEditor
                value={editorContent}
                isHost={false}
                isExecuting={isExecuting}
                executionResult={executionResult}
                onClearTerminal={handleClearTeacherTerminal}
                stdin={executionResult?.stdin || ""}
              />
            </div>
          ) : practiceViewMode === "teacher" ? (
            /* Full-Width Teacher Broadcast View in Practice Mode */
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              <div className="flex items-center justify-between bg-indigo-950/40 border border-indigo-500/20 px-4 py-2 rounded-xl text-xs text-indigo-300">
                <span>Focus View: Teacher Live Broadcast</span>
                <button
                  onClick={handleForkTeacherCode}
                  className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Fork Teacher Code</span>
                </button>
              </div>
              <LiveEditor
                value={editorContent}
                isHost={false}
                isExecuting={isExecuting}
                executionResult={executionResult}
                onClearTerminal={handleClearTeacherTerminal}
                stdin={executionResult?.stdin || ""}
              />
            </div>
          ) : practiceViewMode === "practice" ? (
            /* Full-Width Student Practice View */
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              {activePractice && (
                <ProblemPanel
                  problem={activePractice}
                  onUseExampleInput={(input) => setPracticeStdin(input)}
                  isSessionEnded={isSessionEnded}
                />
              )}
              <PracticeEditor
                value={practiceCode}
                onChange={handlePracticeCodeChange}
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
          ) : (
            /* Resizable Split-Screen View (Default Practice ON) */
            <div className="flex-1 flex flex-col min-h-0">
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
                  <div className="space-y-4 flex flex-col flex-1 min-h-0">
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
                      onChange={handlePracticeCodeChange}
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
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR: Connected Students List */}
        <aside className="w-full lg:w-80 xl:w-80 shrink-0 flex flex-col space-y-4">
          <StudentListPanel
            students={students}
            currentStudentName={studentName}
            roomCode={currentRoomId}
            isHost={false}
            raisedHands={raisedHands}
            activeSpeakerId={activeSpeakerId}
          />
        </aside>
      </div>
    </div>
  );
};
