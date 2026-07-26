import React from "react";
import { Mic, MicOff, Hand, Volume2, ShieldAlert, CheckCircle2, Clock } from "lucide-react";

interface StudentVoicePanelProps {
  hasHandRaised: boolean;
  isSpeakingPermitted: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  isVoiceConnected: boolean;
}

export const StudentVoicePanel: React.FC<StudentVoicePanelProps> = ({
  hasHandRaised,
  isSpeakingPermitted,
  onRaiseHand,
  onLowerHand,
  isVoiceConnected,
}) => {
  return (
    <div className="rounded-2xl bg-[#111621] border border-slate-800 p-4 shadow-xl font-sans space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all ${
              isSpeakingPermitted
                ? "bg-emerald-500 shadow-emerald-500/30 ring-4 ring-emerald-500/20 animate-pulse"
                : hasHandRaised
                ? "bg-amber-500 shadow-amber-500/30 ring-2 ring-amber-400/30"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {isSpeakingPermitted ? (
              <Mic className="w-5 h-5 text-white" />
            ) : hasHandRaised ? (
              <Hand className="w-5 h-5 text-slate-950" />
            ) : (
              <MicOff className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white leading-tight">Classroom Audio</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isVoiceConnected
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 border border-slate-700 text-slate-400"
                }`}
              >
                {isVoiceConnected ? "Voice Connected" : "Voice Offline"}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              {isSpeakingPermitted ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> You may speak now
                </span>
              ) : hasHandRaised ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 inline" /> Waiting for teacher approval
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 inline text-slate-500" /> Muted by teacher
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Raise Hand / Lower Hand Toggle Button */}
        {!isSpeakingPermitted && (
          <button
            onClick={hasHandRaised ? onLowerHand : onRaiseHand}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer border active:scale-95 ${
              hasHandRaised
                ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40 shadow-amber-500/10"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400/50 shadow-amber-500/20"
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{hasHandRaised ? "Lower Hand" : "Raise Hand"}</span>
          </button>
        )}

        {isSpeakingPermitted && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-bounce">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Microphone Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
