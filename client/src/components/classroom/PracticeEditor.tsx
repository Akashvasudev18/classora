import React from "react";
import Editor, { OnChange } from "@monaco-editor/react";
import { PracticeToolbar } from "./PracticeToolbar";
import { CustomInputPanel } from "./CustomInputPanel";
import { TerminalPanel } from "./TerminalPanel";
import { ExecutionResult } from "../../services/ExecutionService";

interface PracticeEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onFork: () => void;
  onRun: () => void;
  isExecuting: boolean;
  executionResult: ExecutionResult | null;
  onClearTerminal: () => void;
  stdin: string;
  onChangeStdin: (newStdin: string) => void;
}

export const PracticeEditor: React.FC<PracticeEditorProps> = ({
  value,
  onChange,
  onFork,
  onRun,
  isExecuting,
  executionResult,
  onClearTerminal,
  stdin,
  onChangeStdin,
}) => {
  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  const hasExistingCode = value.trim().length > 0;

  return (
    <div className="space-y-4 flex flex-col flex-1">
      {/* Practice Header & Toolbar */}
      <PracticeToolbar
        onFork={onFork}
        onRun={onRun}
        isExecuting={isExecuting}
        hasExistingCode={hasExistingCode}
      />

      {/* Monaco Practice Editor */}
      <div className="min-h-[360px] md:min-h-[420px] h-[420px] rounded-2xl border border-cyan-500/20 overflow-hidden shadow-2xl relative bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="python"
          language="python"
          theme="vs-dark"
          value={value}
          onChange={handleEditorChange}
          options={{
            readOnly: false,
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
            cursorBlinking: "blink",
            smoothScrolling: true,
            wordWrap: "on",
          }}
        />
      </div>

      {/* Private Custom Input (stdin) Panel */}
      <CustomInputPanel
        stdin={stdin}
        onChange={onChangeStdin}
        isHost={true}
      />

      {/* Private Practice Output Terminal */}
      <TerminalPanel
        result={executionResult}
        isExecuting={isExecuting}
        onClear={onClearTerminal}
      />
    </div>
  );
};
