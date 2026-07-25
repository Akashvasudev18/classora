import React from "react";
import { Users, Sparkles } from "lucide-react";
import { Avatar } from "../common/Avatar";
import { Student } from "./WaitingRoomPanel";

interface StudentListPanelProps {
  students: Student[];
  currentStudentName?: string;
  roomCode: string;
  isHost?: boolean;
}

export const StudentListPanel: React.FC<StudentListPanelProps> = ({
  students,
  currentStudentName,
  roomCode,
  isHost = false,
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
            return (
              <div
                key={student.id}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  isMe
                    ? "bg-indigo-950/40 border-indigo-500/30"
                    : "bg-slate-900/80 border-slate-800/80"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    name={student.name}
                    variant={isMe ? "indigo" : "blue"}
                    size="sm"
                  />
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {student.name} {isMe ? "(You)" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
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
