import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, User, LogIn, Sparkles, AlertCircle } from "lucide-react";
import { socket, useSocketStatus } from "../services/socket";
import { Logo } from "../components/common/Logo";

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useSocketStatus();

  const [roomId, setRoomId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedRoomId = roomId.trim().toUpperCase();
    const formattedName = studentName.trim();

    if (!formattedRoomId || formattedRoomId.length !== 6) {
      setError("Please enter a valid 6-character Room Code.");
      return;
    }

    if (!formattedName) {
      setError("Please enter your name to identify yourself in the classroom.");
      return;
    }

    // Immediately navigate to classroom where socket join request & approval state handles room verification
    navigate(`/classroom/${formattedRoomId}`, {
      state: { studentName: formattedName }
    });
  };

  return (
    <div className="relative min-h-screen bg-[#0B0E14] bg-grid-pattern flex flex-col justify-between overflow-hidden">
      {/* Background Orbs */}
      <div className="glow-orb top-[-100px] left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-blue-600/15" />
      <div className="glow-orb bottom-[-100px] right-[-100px] w-[450px] h-[450px] bg-cyan-600/10" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-800 flex items-center gap-2 text-sm font-medium cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
          {isConnected ? "Server Connected" : "Connecting..."}
        </div>
      </header>

      {/* Form Container */}
      <main className="relative z-10 max-w-md mx-auto w-full px-6 py-10 flex-1 flex flex-col justify-center">
        <div className="glass-card rounded-3xl p-8 shadow-2xl relative border border-slate-800/80">
          
          <div className="text-center mb-8">
            <div className="mb-3">
              <Logo size="lg" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">Join a Classroom</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your room details to request entry</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Room Code
              </label>
              <div className="relative">
                <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  maxLength={6}
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white font-mono tracking-wider font-bold placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Your Full Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Join Class</span>
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 text-center text-xs text-slate-500">
        Classora Classroom Access Protocol
      </footer>
    </div>
  );
};
