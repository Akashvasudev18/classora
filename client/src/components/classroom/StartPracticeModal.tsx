import React, { useState } from "react";
import { X, Play, Sparkles } from "lucide-react";
import { BUILTIN_PROBLEMS, PracticeProblem } from "../../shared/problems";

interface StartPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (problem: PracticeProblem) => void;
}

export const StartPracticeModal: React.FC<StartPracticeModalProps> = ({
  isOpen,
  onClose,
  onStartSession,
}) => {
  const [selectedProblemId, setSelectedProblemId] = useState<string>(
    BUILTIN_PROBLEMS[0].id
  );

  const [customTitle, setCustomTitle] = useState<string>("");
  const [customDifficulty, setCustomDifficulty] = useState<"Easy" | "Medium" | "Hard">("Easy");
  const [customEstimatedTime, setCustomEstimatedTime] = useState<string>("5 mins");
  const [customDescription, setCustomDescription] = useState<string>("");
  const [customStarterCode, setCustomStarterCode] = useState<string>("# Write your Python solution here\n");
  const [customExampleInput, setCustomExampleInput] = useState<string>("");
  const [customExampleOutput, setCustomExampleOutput] = useState<string>("");

  if (!isOpen) return null;

  const isCustomMode = selectedProblemId === "custom";

  const handleSelectProblem = (id: string) => {
    setSelectedProblemId(id);
    if (id !== "custom") {
      const problem = BUILTIN_PROBLEMS.find((p: PracticeProblem) => p.id === id);
      if (problem) {
        setCustomTitle(problem.title);
        setCustomDifficulty(problem.difficulty);
        setCustomEstimatedTime(problem.estimatedTime);
        setCustomDescription(problem.description);
        setCustomStarterCode(problem.starterCode);
        setCustomExampleInput(problem.exampleInput || "");
        setCustomExampleOutput(problem.exampleOutput || "");
      }
    } else {
      setCustomTitle("Custom Practice Problem");
      setCustomDescription("");
      setCustomStarterCode("# Write custom code assignment\n");
      setCustomExampleInput("");
      setCustomExampleOutput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let problemToStart: PracticeProblem;

    if (!isCustomMode) {
      const builtin = BUILTIN_PROBLEMS.find((p: PracticeProblem) => p.id === selectedProblemId);
      problemToStart = builtin || {
        id: "custom-" + Date.now(),
        title: customTitle || "Practice Assignment",
        difficulty: customDifficulty,
        estimatedTime: customEstimatedTime,
        description: customDescription,
        starterCode: customStarterCode,
        exampleInput: customExampleInput,
        exampleOutput: customExampleOutput,
      };
    } else {
      problemToStart = {
        id: "custom-" + Date.now(),
        title: customTitle || "Custom Problem",
        difficulty: customDifficulty,
        estimatedTime: customEstimatedTime || "5 mins",
        description: customDescription || "Solve the custom problem assigned by the teacher.",
        starterCode: customStarterCode,
        exampleInput: customExampleInput,
        exampleOutput: customExampleOutput,
      };
    }

    onStartSession(problemToStart);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-3xl border border-cyan-500/30 max-w-2xl w-full p-6 space-y-5 shadow-2xl bg-[#0F1623] max-h-[90vh] overflow-y-auto font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Start Practice Session</h2>
              <p className="text-xs text-slate-400">
                Assign a problem to all students in real-time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Problem Mode */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Select Problem Source
            </label>
            <select
              value={selectedProblemId}
              onChange={(e) => handleSelectProblem(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm font-semibold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <optgroup label="Built-in Problems Library (26 Problems)">
                {BUILTIN_PROBLEMS.map((p: PracticeProblem) => (
                  <option key={p.id} value={p.id}>
                    [{p.difficulty}] {p.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Mode">
                <option value="custom">✍️ Create Custom Problem</option>
              </optgroup>
            </select>
          </div>

          {/* Title & Difficulty & Estimated Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Problem Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Difficulty
              </label>
              <select
                value={customDifficulty}
                onChange={(e) => setCustomDifficulty(e.target.value as any)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Estimated Time
              </label>
              <input
                type="text"
                value={customEstimatedTime}
                onChange={(e) => setCustomEstimatedTime(e.target.value)}
                placeholder="e.g. 5 mins"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Problem Description
            </label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              rows={3}
              required
              placeholder="Describe the programming problem details..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Starter Code */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              Starter Code
            </label>
            <textarea
              value={customStarterCode}
              onChange={(e) => setCustomStarterCode(e.target.value)}
              rows={4}
              placeholder="# Initial python code template for students..."
              className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Example Input & Output */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Example Input (Optional)
              </label>
              <textarea
                value={customExampleInput}
                onChange={(e) => setCustomExampleInput(e.target.value)}
                rows={2}
                placeholder="Example stdin values..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Example Output (Optional)
              </label>
              <textarea
                value={customExampleOutput}
                onChange={(e) => setCustomExampleOutput(e.target.value)}
                rows={2}
                placeholder="Expected output result..."
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Session</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
