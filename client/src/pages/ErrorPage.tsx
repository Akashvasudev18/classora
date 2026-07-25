import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, RefreshCw, Home } from "lucide-react";

export interface ErrorPageState {
  type?: "invalid-code" | "room-closed" | "teacher-disconnected";
  message?: string;
}

export const ErrorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as ErrorPageState) || {};

  const type = state.type || "invalid-code";

  const errorContent = {
    "invalid-code": {
      title: "Invalid Room Code",
      description: state.message || "The room code you entered does not exist or has expired. Please check the code with your teacher.",
      badge: "Room Not Found",
    },
    "room-closed": {
      title: "Classroom Closed",
      description: state.message || "This classroom session has been ended by the teacher.",
      badge: "Session Terminated",
    },
    "teacher-disconnected": {
      title: "Teacher Disconnected",
      description: state.message || "The teacher lost connection or left the classroom session.",
      badge: "Host Offline",
    },
  }[type];

  return (
    <div className="relative min-h-screen bg-[#0B0E14] bg-grid-pattern flex flex-col justify-between overflow-hidden">
      <div className="glow-orb top-[-100px] left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-rose-600/10" />

      <header className="px-6 py-6 max-w-7xl mx-auto w-full">
        <button
          onClick={() => navigate("/")}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 flex items-center gap-2 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </header>

      <main className="max-w-md mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center text-center z-10">
        <div className="glass-card rounded-3xl p-8 border border-rose-900/40 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wider border border-rose-500/20">
              {errorContent.badge}
            </span>
            <h1 className="text-2xl font-bold text-white mt-4 mb-2">{errorContent.title}</h1>
            <p className="text-slate-400 text-sm">{errorContent.description}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/join")}
              className="w-1/2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-all border border-slate-700 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Join Again</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-1/2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              <span>Go Home</span>
            </button>
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-600">
        Classora Error Handler
      </footer>
    </div>
  );
};
