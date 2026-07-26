import React from "react";
import { Users, Sparkles, Eye, Mic, MicOff, Hand } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { Student } from "./WaitingRoomPanel";

interface StudentListPanelProps {
  students: Student[];
  currentStudentName?: string;
  roomCode: string;
  isHost?: boolean;
  onSelectStudent?: (student: Student) => void;
  raisedHands?: string[];
  activeSpeakerId?: string | null;
}

export const StudentListPanel: React.FC<StudentListPanelProps> = ({
  students,
  currentStudentName,
  roomCode,
  isHost = false,
  onSelectStudent,
  raisedHands = [],
  activeSpeakerId = null,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex-1 flex flex-col shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4.5 h-4.5 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Connected Students</h2>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
          {students.length} Active
        </span>
      </div>

      {students.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs flex-1 flex flex-col items-center justify-center">
          <Sparkles className="w-6 h-6 text-slate-600 mb-2" />
          <span>Classroom is currently empty.</span>
          {isHost && (
            <span className="text-[11px] text-slate-600 mt-1">
              Share code <strong className="text-blue-400 font-mono">{roomCode}</strong> with students.
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1 flex-1">
          {students.map((student) => {
            const isMe = currentStudentName && student.name === currentStudentName;
            const isSpeaking = student.id === activeSpeakerId;
            const isHandRaised = raisedHands.includes(student.id);

            return (
              <div
                key={student.id}
                onClick={() => isHost && onSelectStudent && onSelectStudent(student)}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all group ${
                  isSpeaking
                    ? "bg-emerald-950/40 border-emerald-500/40 ring-1 ring-emerald-500/30"
                    : isHandRaised
                    ? "bg-amber-950/30 border-amber-500/40"
                    : isMe
                    ? "bg-indigo-950/40 border-indigo-500/30"
                    : "bg-slate-900/80 border-slate-800/80"
                } ${
                  isHost
                    ? "hover:bg-slate-800 hover:border-cyan-500/40 cursor-pointer"
                    : ""
                }`}
                title={isHost ? `Click to inspect ${student.name}'s practice code` : ""}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={student.name}
                    variant={isSpeaking ? "emerald" : isMe ? "indigo" : "blue"}
                    size="sm"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1.5">
                      {student.name} {isMe ? "(You)" : ""}
                    </span>
                    {isHost && (
                      <span className="text-[10px] text-cyan-400 hidden group-hover:block transition-all">
                        Click to inspect code
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Participant Voice Mic Status Icon */}
                  {isSpeaking ? (
                    <span
                      className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 animate-pulse"
                      title="Speaking"
                    >
                      <Mic className="w-3 h-3 text-emerald-400" />
                      <span>Speaking</span>
                    </span>
                  ) : isHandRaised ? (
                    <span
                      className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1"
                      title="Hand Raised"
                    >
                      <Hand className="w-3 h-3 text-amber-300" />
                      <span>Hand Raised</span>
                    </span>
                  ) : (
                    <span
                      className="p-1 rounded bg-slate-800 text-slate-500"
                      title="Muted"
                    >
                      <MicOff className="w-3.5 h-3.5 text-slate-500" />
                    </span>
                  )}

                  {isHost && (
                    <Eye className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="pt-4 border-t border-slate-800 text-slate-500 text-[11px] text-center font-mono">
        ROOM CODE: {roomCode}
      </div>
    </div>
  );
};
