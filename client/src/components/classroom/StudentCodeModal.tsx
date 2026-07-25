import React from "react";
import Editor from "@monaco-editor/react";
import { X, RefreshCw, Eye, UserCheck } from "lucide-react";
import { Student } from "./WaitingRoomPanel";

interface StudentCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  code: string;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const StudentCodeModal: React.FC<StudentCodeModalProps> = ({
  isOpen,
  onClose,
  student,
  code,
  onRefresh,
  isLoading = false,
}) => {
  if (!isOpen || !student) return null;

  const lineCount = code ? code.split("\n").length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card rounded-3xl border border-cyan-500/30 max-w-3xl w-full p-6 space-y-4 shadow-2xl bg-[#0F1623] font-sans">
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
                Viewing student's private practice workspace in real-time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Fetch latest student code snapshot"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
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
            <span>Student ID: <code className="text-slate-200">{student.id}</code></span>
          </div>
          <div>{lineCount} lines</div>
        </div>

        {/* Monaco Read-Only Inspection Editor */}
        <div className="h-[400px] rounded-2xl border border-slate-800 overflow-hidden shadow-xl bg-[#1e1e1e]">
          <Editor
            height="100%"
            defaultLanguage="python"
            language="python"
            theme="vs-dark"
            value={code || "# Student has not written any code yet.\n"}
            options={{
              readOnly: true,
              domReadOnly: true,
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

        {/* Modal Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
};
