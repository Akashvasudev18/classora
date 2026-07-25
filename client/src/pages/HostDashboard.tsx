import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Check, Shield, LogOut, Users, UserPlus } from "lucide-react";
import { socket, useSocketStatus } from "../services/socket";
import { realtimeBus } from "../services/realtimeBus";
import { runPythonCode, ExecutionResult } from "../services/ExecutionService";
import { StatusBadge } from "../components/common/StatusBadge";
import { WaitingRoomPanel, Student } from "../components/classroom/WaitingRoomPanel";
import { StudentListPanel } from "../components/classroom/StudentListPanel";
import { LiveEditor } from "../components/classroom/LiveEditor";

export const HostDashboard: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { status, isConnected } = useSocketStatus();

  const currentRoomId = (roomCode || "").toUpperCase();

  const [copied, setCopied] = useState(false);
  const [editorContent, setEditorContent] = useState<string>(
    "# Welcome to Classora Live Python Classroom!\n# Teacher's live Python code is broadcast to all students in real-time.\n\ndef classora_session():\n    print('Learn Together. Live.')\n\nif __name__ == '__main__':\n    classora_session()\n"
  );
  const [stdin, setStdin] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [pendingStudents, setPendingStudents] = useState<Student[]>([]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);

  useEffect(() => {
    if (!currentRoomId) return;

    const claimHostRoom = () => {
      realtimeBus.emit("host-room", { roomId: currentRoomId }, (res: any) => {
        if (res && res.roomState) {
          setStudents([...(res.roomState.students || [])]);
          setPendingStudents([...(res.roomState.pendingStudents || [])]);
          if (res.roomState.editorContent) {
            setEditorContent(res.roomState.editorContent);
          }
        }
      });
    };

    claimHostRoom();
    socket.on("connect", claimHostRoom);

    // 2-second heartbeat poll to ensure host state is 100% synced with Render server
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("get-room-state", { roomId: currentRoomId }, (res: any) => {
          if (res && res.roomState) {
            setPendingStudents([...(res.roomState.pendingStudents || [])]);
            setStudents([...(res.roomState.students || [])]);
          }
        });
      }
    }, 2000);

    const handleJoinRequest = (data: any) => {
      if (data?.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      if (data?.pendingStudents) {
        setPendingStudents([...data.pendingStudents]);
      } else if (data?.student) {
        setPendingStudents((prev) => {
          const filtered = prev.filter((s) => s.id !== data.student.id);
          return [...filtered, data.student];
        });
      }
    };

    const handleUpdatePending = (data: any) => {
      if (data?.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      if (data?.pendingStudents) {
        setPendingStudents([...data.pendingStudents]);
      }
    };

    const handleStudentConnected = (data: any) => {
      if (data?.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      if (data?.students) {
        setStudents([...data.students]);
      }
      if (data?.pendingStudents !== undefined) {
        setPendingStudents([...data.pendingStudents]);
      }
    };

    const handleExecutionResult = (data: ExecutionResult) => {
      if (data?.roomId && data.roomId.toUpperCase() !== currentRoomId) return;
      setIsExecuting(false);
      setExecutionResult(data);
    };

    realtimeBus.on("join-request", handleJoinRequest);
    realtimeBus.on("update-pending", handleUpdatePending);
    realtimeBus.on("student-connected", handleStudentConnected);
    realtimeBus.on("student-disconnected", handleStudentConnected);
    realtimeBus.on("execution-result", handleExecutionResult);

    return () => {
      clearInterval(heartbeatInterval);
      socket.off("connect", claimHostRoom);
      realtimeBus.off("join-request", handleJoinRequest);
      realtimeBus.off("update-pending", handleUpdatePending);
      realtimeBus.off("student-connected", handleStudentConnected);
      realtimeBus.off("student-disconnected", handleStudentConnected);
      realtimeBus.off("execution-result", handleExecutionResult);
    };
  }, [currentRoomId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprove = (studentId: string) => {
    realtimeBus.emit("approve-student", { roomId: currentRoomId, studentId });
    setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleReject = (studentId: string) => {
    realtimeBus.emit("reject-student", { roomId: currentRoomId, studentId });
    setPendingStudents((prev) => prev.filter((s) => s.id !== studentId));
  };

  const handleEditorChange = (newContent: string) => {
    setEditorContent(newContent);
    realtimeBus.emit("editor-change", { roomId: currentRoomId, content: newContent });
  };

  const handleRunCode = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setExecutionResult(null);

    const result = await runPythonCode(editorContent, currentRoomId, stdin);
    setIsExecuting(false);
    setExecutionResult(result);
  };

  const handleClearTerminal = () => {
    setExecutionResult(null);
  };

  const handleEndClass = () => {
    if (window.confirm("Are you sure you want to end this class? All connected students will be redirected.")) {
      realtimeBus.emit("end-room", { roomId: currentRoomId });
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="px-4 md:px-6 py-3.5 border-b border-slate-800/80 bg-[#111621]/90 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50 cursor-pointer"
            title="Return to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white leading-tight">Host Control Panel</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  TEACHER
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center / Right Metrics */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Room Code Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
            <span className="text-xs font-semibold text-slate-400">ROOM:</span>
            <span className="text-sm font-mono font-bold text-blue-400 tracking-wider">{currentRoomId}</span>
            <button
              onClick={handleCopyCode}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Copy Code"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Student Count Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300">
            <Users className="w-4 h-4 text-blue-400" />
            <span>{students.length} Connected</span>
          </div>

          <StatusBadge status={status} isConnected={isConnected} />

          {/* End Class Button */}
          <button
            onClick={handleEndClass}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>End Class</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-4">
        {/* Mobile Urgent Pending Alert Banner */}
        {pendingStudents.length > 0 && (
          <div className="lg:hidden p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 flex items-center justify-between shadow-lg animate-pulse">
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">{pendingStudents.length} Pending Join Request(s)</div>
                <div className="text-[10px] text-amber-400/80">Review requests below before starting lesson</div>
              </div>
            </div>
            <a
              href="#waiting-room"
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow hover:bg-amber-400 transition-colors"
            >
              Review
            </a>
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Waiting Room & Connected Students Column */}
          <div
            id="waiting-room"
            className={`space-y-6 flex flex-col ${
              pendingStudents.length > 0 ? "order-first lg:order-last" : "order-last lg:order-last"
            }`}
          >
            <WaitingRoomPanel
              pendingStudents={pendingStudents}
              onApprove={handleApprove}
              onReject={handleReject}
            />

            <StudentListPanel
              students={students}
              roomCode={currentRoomId}
              isHost={true}
            />
          </div>

          {/* Left 2 Columns: Live Textarea / Monaco Editor + Custom Input + Terminal Output */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <LiveEditor
              value={editorContent}
              isHost={true}
              onChange={handleEditorChange}
              onRunCode={handleRunCode}
              isExecuting={isExecuting}
              executionResult={executionResult}
              onClearTerminal={handleClearTerminal}
              stdin={stdin}
              onChangeStdin={setStdin}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
