import React from "react";
import { Play, Loader2 } from "lucide-react";

interface RunButtonProps {
  onRun: () => void;
  isExecuting: boolean;
  disabled?: boolean;
}

export const RunButton: React.FC<RunButtonProps> = ({
  onRun,
  isExecuting,
  disabled = false,
}) => {
  return (
    <button
      onClick={onRun}
      disabled={isExecuting || disabled}
      className={`px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 border cursor-pointer ${
        isExecuting || disabled
          ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed opacity-75"
          : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/30 shadow-emerald-600/20 active:scale-95"
      }`}
      title={isExecuting ? "Executing Python code..." : "Run Python Code (Piston Engine)"}
    >
      {isExecuting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
          <span>Running...</span>
        </>
      ) : (
        <>
          <Play className="w-4 h-4 text-emerald-300 fill-emerald-300" />
          <span>Run Code</span>
        </>
      )}
    </button>
  );
};
