import React from "react";
import Editor, { OnChange } from "@monaco-editor/react";
import { PracticeToolbar } from "./PracticeToolbar";
import { CustomInputPanel } from "./CustomInputPanel";
import { TerminalPanel } from "./TerminalPanel";
import { HintPanel } from "./HintPanel";
import { ExecutionResult } from "../../services/ExecutionService";
import { HintResponseResult } from "../../services/AIService";

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
  onGetHint?: () => void;
  isRequestingHint?: boolean;
  hintResult?: HintResponseResult | null;
  isHintPanelOpen?: boolean;
  onToggleHintPanel?: () => void;
  onCloseHintPanel?: () => void;
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
  onGetHint,
  isRequestingHint = false,
  hintResult = null,
  isHintPanelOpen = false,
  onToggleHintPanel = () => {},
  onCloseHintPanel = () => {},
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
        onGetHint={onGetHint}
        isRequestingHint={isRequestingHint}
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
            fontFamily: "'JetBrains Mono', Consolas, 'Courier New', monospace",
            letterSpacing: 0,
            fontLigatures: false,
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
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            wordWrap: "on",
          }}
        />
      </div>

      {/* AI Mentor Hint Panel */}
      <HintPanel
        hintResult={hintResult}
        isLoading={isRequestingHint}
        isOpen={isHintPanelOpen}
        onToggle={onToggleHintPanel}
        onClose={onCloseHintPanel}
      />

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
