import React, { useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Trash2, CheckCircle2, AlertTriangle, Clock, Play } from "lucide-react";
import { ExecutionResult } from "../../services/ExecutionService";

interface TerminalPanelProps {
  result: ExecutionResult | null;
  isExecuting?: boolean;
  onClear?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  result,
  isExecuting = false,
  onClear,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [result, isExecuting]);

  return (
    <div className="rounded-2xl bg-[#0F141C] border border-slate-800 shadow-xl overflow-hidden flex flex-col font-mono text-xs text-slate-200">
      {/* Terminal Header */}
      <div className="px-4 py-2.5 bg-[#141A24] border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          <div className="flex items-center gap-2 ml-2">
            <TerminalIcon className="w-4 h-4 text-slate-400" />
            <span className="font-bold text-slate-300 tracking-wide text-xs">TERMINAL OUTPUT</span>
          </div>
        </div>

        {/* Header Right Status & Controls */}
        <div className="flex items-center gap-3">
          {isExecuting && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] animate-pulse">
              <Clock className="w-3 h-3 animate-spin" />
              <span>Executing Python...</span>
            </div>
          )}

          {!isExecuting && result && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                  result.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                }`}
              >
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>SUCCESS (Code {result.exitCode ?? 0})</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>ERROR (Code {result.exitCode ?? 1})</span>
                  </>
                )}
              </div>

              {result.durationMs !== undefined && (
                <span className="text-[10px] text-slate-500 font-sans">{result.durationMs}ms</span>
              )}
            </div>
          )}

          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Clear Terminal Output"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Terminal Output Content Body */}
      <div className="p-4 bg-[#0B0E14] min-h-[120px] max-h-[220px] overflow-y-auto space-y-2 selection:bg-blue-500/30">
        {!isExecuting && !result && (
          <div className="text-slate-500 italic flex items-center gap-2 py-4">
            <Play className="w-3.5 h-3.5 text-slate-600" />
            <span>Click "Run Code" above to execute Python 3 code. Output will stream here live.</span>
          </div>
        )}

        {isExecuting && (
          <div className="text-amber-400 flex items-center gap-2 py-2">
            <span className="animate-pulse">▶ [Piston Engine] Executing main.py...</span>
          </div>
        )}

        {!isExecuting && result && (
          <div className="space-y-1">
            {/* Standard Output (stdout) */}
            {result.output && (
              <pre className={`whitespace-pre-wrap break-words leading-relaxed ${result.success ? "text-slate-200" : "text-rose-300"}`}>
                {result.output}
              </pre>
            )}

            {/* Separate Stderr if present */}
            {result.stderr && result.stderr !== result.output && (
              <div className="pt-2 border-t border-rose-900/40">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                  STDERR / EXCEPTION:
                </span>
                <pre className="text-rose-400 whitespace-pre-wrap break-words">{result.stderr}</pre>
              </div>
            )}
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>
    </div>
  );
};
