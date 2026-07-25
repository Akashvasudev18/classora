import React from "react";
import { Loader2, Radio, Clock } from "lucide-react";

interface LoadingSpinnerProps {
  type?: "approval" | "joining" | "connecting";
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  type = "connecting",
  message,
}) => {
  if (type === "approval") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Clock className="w-8 h-8 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            Waiting for Host Approval
          </h3>
          <p className="text-xs text-slate-400 max-w-xs">
            {message || "Your join request has been sent to the teacher. Please wait..."}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          Pending Approval
        </div>
      </div>
    );
  }

  if (type === "joining") {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
          <Radio className="w-7 h-7 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white mb-1">Joining Room</h3>
          <p className="text-xs text-slate-400">
            {message || "Connecting to live classroom session..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 p-4 text-slate-400 text-xs font-medium">
      <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
      <span>{message || "Connecting to Classora Server..."}</span>
    </div>
  );
};
