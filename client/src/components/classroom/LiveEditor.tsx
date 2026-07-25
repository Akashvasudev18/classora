import React, { useState } from "react";
import Editor, { OnChange } from "@monaco-editor/react";
import { Code, Radio, Copy, Check } from "lucide-react";
import { RunButton } from "./RunButton";
import { TerminalPanel } from "./TerminalPanel";
import { CustomInputPanel } from "./CustomInputPanel";
import { ExecutionResult } from "../../services/ExecutionService";

interface LiveEditorProps {
  value: string;
  isHost: boolean;
  onChange?: (newContent: string) => void;
  onRunCode?: () => void;
  isExecuting?: boolean;
  executionResult?: ExecutionResult | null;
  onClearTerminal?: () => void;
  stdin?: string;
  onChangeStdin?: (stdin: string) => void;
}

export const LiveEditor: React.FC<LiveEditorProps> = ({
  value,
  isHost,
  onChange,
  onRunCode,
  isExecuting = false,
  executionResult = null,
  onClearTerminal,
  stdin = "",
  onChangeStdin,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditorChange: OnChange = (newValue) => {
    if (isHost && onChange && newValue !== undefined) {
      onChange(newValue);
    }
  };

  return (
    <div className="space-y-4 flex flex-col flex-1">
      {/* Editor Header Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg ${
              isHost
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
            } border flex items-center justify-center`}
          >
            <Code className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {isHost ? "Live Broadcast Python Editor" : "Live Teacher Python Broadcast"}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono font-bold">
                PYTHON 3
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isHost
                ? "Keystrokes & Python execution results stream live to students."
                : "Read-only view. Real-time code & terminal output stream from teacher."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Teacher Only: Run Code Button */}
          {isHost && onRunCode && (
            <RunButton
              onRun={onRunCode}
              isExecuting={isExecuting}
            />
          )}

          <button
            onClick={handleCopy}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 flex items-center gap-2 transition-colors cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-blue-400" />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-800">
            <Radio
              className={`w-3.5 h-3.5 ${
                isHost ? "text-blue-400 animate-pulse" : "text-emerald-400"
              }`}
            />
            <span>{isHost ? "Broadcasting" : "Live Sync"}</span>
          </div>
        </div>
      </div>

      {/* Monaco Editor Container */}
      <div className="min-h-[360px] md:min-h-[420px] h-[420px] rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="python"
          language="python"
          theme="vs-dark"
          value={value}
          onChange={handleEditorChange}
          options={{
            readOnly: !isHost,
            domReadOnly: !isHost,
            fontSize: 15,
            fontFamily: "'JetBrains Mono', monospace",
            lineNumbers: "on",
            autoIndent: "full",
            matchBrackets: "always",
            autoClosingBrackets: "always",
            folding: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 14, bottom: 14 },
            cursorBlinking: isHost ? "blink" : "solid",
            smoothScrolling: true,
            wordWrap: "on",
          }}
        />
      </div>

      {/* Custom Input (stdin) Panel */}
      <CustomInputPanel
        stdin={stdin}
        onChange={onChangeStdin || (() => {})}
        isHost={isHost}
      />

      {/* Synchronized Terminal Panel Below Monaco Editor */}
      <TerminalPanel
        result={executionResult}
        isExecuting={isExecuting}
        onClear={onClearTerminal}
      />
    </div>
  );
};
