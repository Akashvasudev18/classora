import React, { useState } from "react";
import { Mic, MicOff, Hand, Volume2, VolumeX, Shield, ChevronDown, ChevronUp, Radio } from "lucide-react";
import { Student } from "./WaitingRoomPanel";

interface VoiceControlPanelProps {
  students: Student[];
  raisedHands: string[]; // Student IDs
  activeSpeakerId: string | null; // Student ID
  onAllowSpeaker: (studentId: string) => void;
  onRemoveSpeaker: (studentId: string) => void;
  onMuteAll: () => void;
  isVoiceConnected: boolean;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  students,
  raisedHands,
  activeSpeakerId,
  onAllowSpeaker,
  onRemoveSpeaker,
  onMuteAll,
  isVoiceConnected,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const activeSpeaker = students.find((s) => s.id === activeSpeakerId);
  const queueStudents = students.filter((s) => raisedHands.includes(s.id));

  return (
    <div className="rounded-2xl bg-[#111621] border border-indigo-500/30 shadow-xl overflow-hidden font-sans">
      {/* Panel Header */}
      <div
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="px-4 py-3 bg-gradient-to-r from-indigo-950/60 to-slate-900 flex items-center justify-between cursor-pointer border-b border-indigo-500/20 select-none hover:bg-slate-800/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Radio className="w-4 h-4 animate-pulse text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white leading-none">Voice Control Panel</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isVoiceConnected
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isVoiceConnected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                ></span>
                {isVoiceConnected ? "LiveKit Voice Connected" : "Connecting Voice..."}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Teacher Microphone: <span className="text-emerald-400 font-semibold">Always ON 🟢</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queueStudents.length > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1">
              <Hand className="w-3.5 h-3.5" />
              <span>{queueStudents.length} Hand(s) Raised</span>
            </span>
          )}
          <button className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white">
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-4">
          {/* Top Row: Current Active Speaker & Emergency Mute All */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Current Student Speaker Box (2 Columns) */}
            <div className="md:col-span-2 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                    activeSpeaker
                      ? "bg-emerald-600 shadow-emerald-500/20 ring-2 ring-emerald-400"
                      : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {activeSpeaker ? <Mic className="w-4 h-4 text-white animate-bounce" /> : <MicOff className="w-4 h-4" />}
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Student Speaker</div>
                  {activeSpeaker ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-300">{activeSpeaker.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        SPEAKING PERMITTED
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-slate-400 italic">No student speaker (Teacher lecture mode)</div>
                  )}
                </div>
              </div>

              {activeSpeaker && (
                <button
                  onClick={() => onRemoveSpeaker(activeSpeaker.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Mute this student"
                >
                  <VolumeX className="w-4 h-4" />
                  <span>Mute Student</span>
                </button>
              )}
            </div>

            {/* Mute All Button */}
            <button
              onClick={onMuteAll}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 border border-rose-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <VolumeX className="w-4 h-4" />
              <span>Mute All Students</span>
            </button>
          </div>

          {/* Raised Hands Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Hand className="w-4 h-4 text-amber-400" />
                <span>Raised Hands Queue ({queueStudents.length})</span>
              </div>
              <span className="text-[11px] text-slate-400">Only 1 student can speak at a time</span>
            </div>

            {queueStudents.length === 0 ? (
              <div className="p-4 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 text-slate-500 text-xs italic">
                No students currently have their hands raised.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-44 overflow-y-auto pr-1">
                {queueStudents.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                        ✋
                      </div>
                      <span className="text-xs font-bold text-amber-200 truncate">{s.name}</span>
                    </div>

                    <button
                      onClick={() => onAllowSpeaker(s.id)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Allow Speak</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
