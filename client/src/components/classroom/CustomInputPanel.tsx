import React from "react";
import { Keyboard, CornerDownLeft, Info } from "lucide-react";

interface CustomInputPanelProps {
  stdin: string;
  onChange: (value: string) => void;
  isHost: boolean;
}

export const CustomInputPanel: React.FC<CustomInputPanelProps> = ({
  stdin,
  onChange,
  isHost,
}) => {
  return (
    <div className="rounded-2xl bg-[#0F141C] border border-slate-800 shadow-md overflow-hidden font-sans">
      {/* Panel Header */}
      <div className="px-4 py-2 bg-[#141A24] border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-slate-300 tracking-wide text-xs">
            CUSTOM INPUT (STDIN)
          </span>
          {stdin.trim().length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-bold">
              ACTIVE ({stdin.split("\n").filter(Boolean).length} lines)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>One input per line for <code className="text-cyan-300 font-mono">input()</code> calls</span>
        </div>
      </div>

      {/* Input Textarea Area */}
      <div className="p-3 bg-[#0B0E14] relative">
        <textarea
          value={stdin}
          onChange={(e) => isHost && onChange(e.target.value)}
          readOnly={!isHost}
          placeholder={
            isHost
              ? "Type inputs here (e.g. 6 for Fibonacci, or Alex on line 1, 20 on line 2)..."
              : "Teacher's input values will appear here..."
          }
          rows={2}
          className={`w-full p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-y transition-all ${
            !isHost ? "cursor-default opacity-85" : ""
          }`}
        />

        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3 text-slate-600" />
            <span>Use Enter for multiple inputs (Line 1 = 1st input, Line 2 = 2nd input)</span>
          </div>

          {isHost && stdin.length > 0 && (
            <button
              onClick={() => onChange("")}
              className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer font-sans text-[11px]"
            >
              Clear Input
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
