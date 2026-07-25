import React from "react";
import { Laptop, Sparkles, Bot, Loader2 } from "lucide-react";
import { ForkButton } from "./ForkButton";
import { RunButton } from "./RunButton";

interface PracticeToolbarProps {
  onFork: () => void;
  onRun: () => void;
  isExecuting: boolean;
  hasExistingCode: boolean;
  onGetHint?: () => void;
  isRequestingHint?: boolean;
}

export const PracticeToolbar: React.FC<PracticeToolbarProps> = ({
  onFork,
  onRun,
  isExecuting,
  hasExistingCode,
  onGetHint,
  isRequestingHint = false,
}) => {
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md border border-cyan-500/20 bg-gradient-to-r from-[#0E1624] to-[#121A2A]">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
          <Laptop className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white">Student Practice Workspace</h2>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold tracking-wider">
              LOCAL
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Private workspace. Code typed & executed here is completely isolated from the teacher.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* Get AI Hint Button */}
        {onGetHint && (
          <button
            onClick={onGetHint}
            disabled={isRequestingHint}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-400/40 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Get step-by-step guidance from OpenRouter AI Mentor"
          >
            {isRequestingHint ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-200" />
            ) : (
              <Bot className="w-4 h-4 text-purple-200" />
            )}
            <span>{isRequestingHint ? "Thinking..." : "Get AI Hint"}</span>
          </button>
        )}

        <ForkButton
          onFork={onFork}
          hasExistingCode={hasExistingCode}
        />

        <RunButton
          onRun={onRun}
          isExecuting={isExecuting}
        />
      </div>
    </div>
  );
};
