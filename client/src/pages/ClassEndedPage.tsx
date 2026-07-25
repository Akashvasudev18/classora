import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";

export const ClassEndedPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen bg-[#0B0E14] bg-grid-pattern flex flex-col justify-between overflow-hidden">
      <div className="glow-orb top-[-100px] left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-blue-600/15" />

      <header className="px-6 py-6 max-w-7xl mx-auto w-full">
        <button
          onClick={() => navigate("/")}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 flex items-center gap-2 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return Home</span>
        </button>
      </header>

      <main className="max-w-md mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center text-center z-10">
        <div className="glass-card rounded-3xl p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Classroom Session Ended</h1>
            <p className="text-slate-400 text-sm">
              The teacher has ended this classroom session. All live synchronized editors and waiting rooms have been closed.
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home Page</span>
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-600">
        Classora Classroom Session Control
      </footer>
    </div>
  );
};
