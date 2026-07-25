import React, { useState, useEffect } from "react";
import Editor, { OnChange } from "@monaco-editor/react";
import { X, RefreshCw, Eye, UserCheck, Send, Terminal, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Student } from "./WaitingRoomPanel";
import { ExecutionResult } from "../../services/ExecutionService";

interface StudentCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  code: string;
  terminalResult?: ExecutionResult | null;
  onRefresh: () => void;
  onPushEdit: (newCode: string) => void;
  isLoading?: boolean;
}

export const StudentCodeModal: React.FC<StudentCodeModalProps> = ({
  isOpen,
  onClose,
  student,
  code,
  terminalResult,
  onRefresh,
  onPushEdit,
  isLoading = false,
}) => {
  const [editedCode, setEditedCode] = useState<string>(code);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [pushSuccess, setPushSuccess] = useState<boolean>(false);

  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  if (!isOpen || !student) return null;

  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      setEditedCode(newValue);
    }
  };

  const handlePush = () => {
    setIsPushing(true);
    onPushEdit(editedCode);
    setTimeout(() => {
      setIsPushing(false);
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 2500);
    }, 400);
  };

  const lineCount = editedCode ? editedCode.split("\n").length : 0;
  const hasError = terminalResult?.stderr || (terminalResult?.exitCode !== undefined && terminalResult?.exitCode !== 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-3xl border border-cyan-500/30 max-w-4xl w-full p-6 space-y-4 shadow-2xl bg-[#0F1623] max-h-[92vh] overflow-y-auto font-sans">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white leading-tight">
                  Inspecting Student Code
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold">
                  {student.name}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                You can edit the code directly below and push fixes to the student in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Fetch latest student code & terminal snapshot"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>

            {/* Push Edit Button */}
            <button
              onClick={handlePush}
              disabled={isPushing}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer border ${
                pushSuccess
                  ? "bg-emerald-600 border-emerald-500 shadow-emerald-600/30"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 border-cyan-400/40 shadow-cyan-500/25"
              }`}
              title="Send your code fixes directly to the student's editor"
            >
              {pushSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-200" /> : <Send className="w-4 h-4 text-cyan-100" />}
              <span>{pushSuccess ? "Fix Pushed to Student!" : "Push Edit to Student"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Code Metadata Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800/80 font-mono">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Student: <code className="text-slate-200">{student.name}</code> (ID: {student.id})</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-sans text-[11px]">✏️ Editable Mode Active</span>
            <span>{lineCount} lines</span>
          </div>
        </div>

        {/* Monaco Editable Editor for Teacher */}
        <div className="h-[320px] rounded-2xl border border-cyan-500/30 overflow-hidden shadow-xl bg-[#1e1e1e]">
          <Editor
            height="100%"
            defaultLanguage="python"
            language="python"
            theme="vs-dark"
            value={editedCode}
            onChange={handleEditorChange}
            options={{
              readOnly: false,
              fontSize: 14,
              fontFamily: "'JetBrains Mono', monospace",
              lineNumbers: "on",
              folding: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              wordWrap: "on",
            }}
          />
        </div>

        {/* Student Practice Terminal Output Panel */}
        <div className="rounded-2xl bg-[#090D16] border border-slate-800 overflow-hidden shadow-lg font-mono text-xs space-y-0">
          <div className="px-4 py-2.5 bg-[#0F1522] border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-slate-300">STUDENT TERMINAL OUTPUT</span>
            </div>
            {terminalResult && (
              <div className="flex items-center gap-2">
                {hasError ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Error (Exit {terminalResult.exitCode || 1})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    Exit 0
                  </span>
                )}
                {terminalResult.durationMs && (
                  <span className="text-[10px] text-slate-500">{terminalResult.durationMs}ms</span>
                )}
              </div>
            )}
          </div>

          <div className="p-3.5 max-h-40 overflow-y-auto bg-[#060911]">
            {!terminalResult ? (
              <span className="text-slate-600 italic">No terminal output recorded for this student yet.</span>
            ) : (
              <div className="space-y-2">
                {terminalResult.output && (
                  <pre className="text-emerald-300 whitespace-pre-wrap">
                    {terminalResult.output}
                  </pre>
                )}
                {terminalResult.stderr && (
                  <pre className="text-rose-400 bg-rose-950/20 p-2 rounded border border-rose-900/40 whitespace-pre-wrap">
                    {terminalResult.stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
