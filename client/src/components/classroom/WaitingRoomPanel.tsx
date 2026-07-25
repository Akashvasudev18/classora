import React from "react";
import { UserPlus, CheckCircle2, XCircle, CheckCheck } from "lucide-react";
import { Avatar } from "../common/Avatar";

export interface Student {
  id: string;
  name: string;
  socketId: string;
}

interface WaitingRoomPanelProps {
  pendingStudents: Student[];
  onApprove: (studentId: string) => void;
  onReject: (studentId: string) => void;
}

export const WaitingRoomPanel: React.FC<WaitingRoomPanelProps> = ({
  pendingStudents,
  onApprove,
  onReject,
}) => {
  const handleApproveAll = () => {
    pendingStudents.forEach((student) => {
      onApprove(student.id);
    });
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800 shadow-lg flex flex-col">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4.5 h-4.5 text-amber-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Waiting Room ({pendingStudents.length})
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {pendingStudents.length > 1 && (
            <button
              onClick={handleApproveAll}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
              title="Accept All Waiting Students"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Accept All</span>
            </button>
          )}

          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              pendingStudents.length > 0
                ? "bg-amber-400/10 text-amber-400 border-amber-400/30 animate-pulse"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            {pendingStudents.length} Pending
          </span>
        </div>
      </div>

      {pendingStudents.length === 0 ? (
        <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 text-xs">
          No pending student join requests
        </div>
      ) : (
        <div className="space-y-2.5 max-h-96 md:max-h-[500px] overflow-y-auto pr-1">
          {pendingStudents.map((student) => (
            <div
              key={student.id}
              className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 backdrop-blur-sm shadow-md hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar name={student.name} variant="amber" size="sm" />
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">{student.name}</div>
                  <div className="text-[10px] text-slate-400">Requesting entry...</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => onApprove(student.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  title="Accept Student"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Accept</span>
                </button>
                <button
                  onClick={() => onReject(student.id)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 font-medium text-xs border border-slate-700/60 transition-all cursor-pointer"
                  title="Reject Student"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
