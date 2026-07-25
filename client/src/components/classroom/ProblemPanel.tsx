import React from "react";
import { BookOpen, Clock, Tag, ArrowRight, CornerDownLeft } from "lucide-react";
import { PracticeProblem } from "../../shared/problems";

interface ProblemPanelProps {
  problem: PracticeProblem;
  onUseExampleInput?: (input: string) => void;
}

export const ProblemPanel: React.FC<ProblemPanelProps> = ({
  problem,
  onUseExampleInput,
}) => {
  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "Medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "Hard":
        return "bg-rose-500/15 text-rose-400 border-rose-500/30";
      default:
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 md:p-5 shadow-xl border border-cyan-500/30 bg-gradient-to-br from-[#0F172A] via-[#111A2E] to-[#0D1424] space-y-3 font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white tracking-wide">
                {problem.title}
              </h3>
              <span
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getDifficultyBadge(
                  problem.difficulty
                )}`}
              >
                {problem.difficulty}
              </span>
            </div>
            <p className="text-xs text-slate-400">Assigned Practice Problem</p>
          </div>
        </div>

        {/* Estimated Time Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span>Est. Time: {problem.estimatedTime || "5 mins"}</span>
        </div>
      </div>

      {/* Description */}
      <div className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
        {problem.description}
      </div>

      {/* Example Input & Output Grid */}
      {(problem.exampleInput || problem.exampleOutput) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {problem.exampleInput && (
            <div className="rounded-xl bg-[#090D16] border border-slate-800 p-3 relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 font-mono">
                <span>EXAMPLE INPUT</span>
                {onUseExampleInput && problem.exampleInput !== "None" && (
                  <button
                    onClick={() => onUseExampleInput(problem.exampleInput || "")}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer font-sans"
                    title="Copy example input to your Custom Input box"
                  >
                    <CornerDownLeft className="w-3 h-3" />
                    <span>Use Input</span>
                  </button>
                )}
              </div>
              <pre className="text-xs font-mono text-cyan-300 whitespace-pre-wrap">
                {problem.exampleInput}
              </pre>
            </div>
          )}

          {problem.exampleOutput && (
            <div className="rounded-xl bg-[#090D16] border border-slate-800 p-3">
              <div className="text-[11px] font-bold text-slate-400 mb-1.5 font-mono">
                EXPECTED OUTPUT
              </div>
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                {problem.exampleOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
