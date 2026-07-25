import React, { useState } from "react";
import { Sparkles, Brain, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, Eye, ArrowUpDown, TrendingDown, TrendingUp, Users } from "lucide-react";
import { StudentAnalysisResult } from "../../services/AIProgressService";
import { Student } from "./WaitingRoomPanel";

interface StudentProgressDashboardProps {
  analysisResults: StudentAnalysisResult[];
  isLoading: boolean;
  onAnalyzeClass: () => void;
  onInspectStudent: (student: Student) => void;
  lastAnalyzedAt?: string;
  modelUsed?: string;
  studentsList: Student[];
}

type SortOption = "lowest-progress" | "highest-progress" | "needs-help" | "alphabetical";

export const StudentProgressDashboard: React.FC<StudentProgressDashboardProps> = ({
  analysisResults,
  isLoading,
  onAnalyzeClass,
  onInspectStudent,
  lastAnalyzedAt,
  modelUsed,
  studentsList,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>("lowest-progress");

  // Compute Sorting
  const sortedAnalysis = [...analysisResults].sort((a, b) => {
    if (sortBy === "lowest-progress") return a.progress - b.progress;
    if (sortBy === "highest-progress") return b.progress - a.progress;
    if (sortBy === "needs-help") return (b.needHelp ? 1 : 0) - (a.needHelp ? 1 : 0);
    if (sortBy === "alphabetical") return a.studentName.localeCompare(b.studentName);
    return 0;
  });

  // Calculate Overview Stats
  const totalStudents = studentsList.length;
  const analyzedCount = analysisResults.length;
  const avgProgress = analyzedCount > 0
    ? Math.round(analysisResults.reduce((acc, curr) => acc + curr.progress, 0) / analyzedCount)
    : 0;
  const helpNeededCount = analysisResults.filter((s) => s.needHelp).length;

  const getStatusBadge = (color: "green" | "yellow" | "red", needHelp: boolean) => {
    if (needHelp || color === "red") {
      return {
        label: "Likely Stuck",
        bg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
        barBg: "bg-rose-500",
      };
    }
    if (color === "yellow") {
      return {
        label: "Needs Attention",
        bg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
        barBg: "bg-amber-500",
      };
    }
    return {
      label: "Doing Well",
      bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
      barBg: "bg-emerald-500",
    };
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "High":
        return "bg-rose-500/10 text-rose-300 border-rose-500/20";
      case "Medium":
        return "bg-amber-500/10 text-amber-300 border-amber-500/20";
      default:
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-5 md:p-6 border border-cyan-500/30 bg-gradient-to-br from-[#0F172A] via-[#111A2E] to-[#0D1424] space-y-5 shadow-2xl font-sans">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-wide">
                AI Student Progress Dashboard
              </h2>
              {modelUsed && (
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono font-bold">
                  {modelUsed}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Evaluates student practice code & terminal errors in real time
            </p>
          </div>
        </div>

        {/* Action Controls: Analyze Button & Sorting */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer font-medium"
            >
              <option value="lowest-progress" className="bg-slate-900 text-slate-200">
                Sort: Lowest Progress
              </option>
              <option value="needs-help" className="bg-slate-900 text-slate-200">
                Sort: Needs Help First
              </option>
              <option value="highest-progress" className="bg-slate-900 text-slate-200">
                Sort: Highest Progress
              </option>
              <option value="alphabetical" className="bg-slate-900 text-slate-200">
                Sort: Alphabetical
              </option>
            </select>
          </div>

          {/* Analyze Class Trigger Button */}
          <button
            onClick={onAnalyzeClass}
            disabled={isLoading || totalStudents === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            title="Evaluate every connected student's current code"
          >
            <RefreshCw className={`w-4 h-4 text-cyan-100 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Analyzing Class..." : "Analyze Class"}</span>
          </button>
        </div>
      </div>

      {/* Class Metric Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#090D16] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Connected Students
            </div>
            <div className="text-lg font-bold text-white mt-0.5">{totalStudents} Active</div>
          </div>
          <Users className="w-6 h-6 text-blue-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-[#090D16] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Class Progress
            </div>
            <div className="text-lg font-bold text-cyan-300 mt-0.5">{avgProgress}%</div>
          </div>
          <TrendingUp className="w-6 h-6 text-cyan-400 opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-[#090D16] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Need Immediate Help
            </div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">
              {helpNeededCount} Student(s)
            </div>
          </div>
          <AlertTriangle className="w-6 h-6 text-rose-400 opacity-80" />
        </div>
      </div>

      {/* Empty State / Not Analyzed Yet */}
      {analysisResults.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-slate-500 space-y-3 bg-[#090D16]/50">
          <Sparkles className="w-8 h-8 text-cyan-400 mx-auto opacity-70" />
          <div>
            <h3 className="text-sm font-bold text-slate-300">
              {totalStudents === 0 ? "No Students Connected" : "Class Progress Not Analyzed Yet"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {totalStudents === 0
                ? "Waiting for students to join room before analyzing progress."
                : "Click 'Analyze Class' above to evaluate student code and generate AI progress metrics."}
            </p>
          </div>
        </div>
      ) : (
        /* Student Progress Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedAnalysis.map((res) => {
            const status = getStatusBadge(res.statusColor, res.needHelp);
            const targetStudent = studentsList.find((s) => s.id === res.studentId || s.name === res.studentName);

            return (
              <div
                key={res.studentId}
                className="rounded-2xl bg-[#090D16] border border-slate-800 p-4 space-y-3 hover:border-cyan-500/40 transition-all shadow-lg font-sans relative group"
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{res.studentName}</h4>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${status.bg}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Understanding: <span className="text-slate-200 font-semibold">{res.understandingLevel}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getDifficultyBadge(res.difficultyLevel)}`}>
                      Difficulty: {res.difficultyLevel}
                    </span>

                    {/* Inspect Button */}
                    {targetStudent && (
                      <button
                        onClick={() => onInspectStudent(targetStudent)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                        title={`Inspect and edit ${res.studentName}'s code`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                    <span>Task Progress</span>
                    <span className="text-cyan-300">{res.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${status.barBg}`}
                      style={{ width: `${Math.min(100, Math.max(5, res.progress))}%` }}
                    />
                  </div>
                </div>

                {/* Summary & Recommended Guidance */}
                <div className="text-xs text-slate-300 bg-[#0F1523] p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                  <div className="font-semibold text-slate-200">{res.summary}</div>
                  <div className="text-slate-400 text-[11px]">
                    <strong className="text-cyan-400 font-medium">Recommended Guidance:</strong> {res.recommendedGuidance}
                  </div>
                </div>

                {/* Current Mistakes / Missing Concepts Pills */}
                {((res.currentMistakes && res.currentMistakes.length > 0) || (res.missingConcepts && res.missingConcepts.length > 0)) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {res.currentMistakes?.map((m, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-rose-950/40 border border-rose-900/40 text-rose-300 text-[10px] font-mono">
                        Bug: {m}
                      </span>
                    ))}
                    {res.missingConcepts?.map((c, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-amber-950/40 border border-amber-900/40 text-amber-300 text-[10px] font-mono">
                        Concept: {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {lastAnalyzedAt && (
        <div className="text-right text-[10px] text-slate-500 font-mono pt-1">
          Last analyzed: {new Date(lastAnalyzedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
