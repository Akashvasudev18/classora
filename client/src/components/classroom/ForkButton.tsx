import React from "react";
import { GitFork } from "lucide-react";

interface ForkButtonProps {
  onFork: () => void;
  hasExistingCode: boolean;
}

export const ForkButton: React.FC<ForkButtonProps> = ({
  onFork,
  hasExistingCode,
}) => {
  const handleClick = () => {
    if (
      hasExistingCode &&
      !window.confirm(
        "Forking will overwrite your current practice code with the teacher's latest code. Do you want to proceed?"
      )
    ) {
      return;
    }
    onFork();
  };

  return (
    <button
      onClick={handleClick}
      className="px-3.5 py-2 rounded-xl bg-cyan-600/15 hover:bg-cyan-600/25 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 font-semibold text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
      title="Copy the current teacher code into your practice editor"
    >
      <GitFork className="w-4 h-4 text-cyan-400" />
      <span>Fork Teacher Code</span>
    </button>
  );
};
