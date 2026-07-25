import React from "react";
import { Sparkles, Bot, Loader2, X, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { HintResponseResult } from "../../services/AIService";

interface HintPanelProps {
  hintResult: HintResponseResult | null;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const HintPanel: React.FC<HintPanelProps> = ({
  hintResult,
  isLoading,
  isOpen,
  onToggle,
  onClose,
}) => {
  if (!isOpen && !isLoading && !hintResult) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#111A2E] to-[#0D1424] border border-cyan-500/30 shadow-xl overflow-hidden font-sans transition-all duration-300">
      {/* Panel Header Bar */}
      <div className="px-4 py-3 bg-[#131B2B] border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs tracking-wide">
                AI PROGRAMMING MENTOR
              </span>
              {hintResult?.modelUsed && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[9px] font-mono font-bold">
                  {hintResult.modelUsed.split("/")[1] || "AI Mentor"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isOpen ? "Collapse AI Panel" : "Expand AI Panel"}
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Close AI Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Body Content */}
      {isOpen && (
        <div className="p-4 bg-[#090D16] space-y-3">
          {isLoading ? (
            <div className="py-6 flex items-center justify-center gap-3 text-cyan-300 text-xs font-semibold animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span>Analyzing code & problem context... Thinking...</span>
            </div>
          ) : hintResult ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Mentor Guidance</span>
              </div>
              <div className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap bg-[#0D131F] p-3.5 rounded-xl border border-slate-800/80">
                {hintResult.hint}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
