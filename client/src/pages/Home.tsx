import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Video, LogIn, Users, Sparkles, Shield, Code2 } from "lucide-react";
import { socket, useSocketStatus } from "../services/socket";
import { Logo } from "../components/common/Logo";
import { BrowserPreviewLoader } from "../components/common/BrowserPreviewLoader";

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected } = useSocketStatus();

  // Generate random 6-character alphanumeric room code
  const generateRoomCode = (): string => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Host Class click handler
  const handleHostClass = () => {
    const roomCode = generateRoomCode();

    // Emit host-room to socket server if connected
    if (socket.connected) {
      socket.emit("host-room", { roomId: roomCode });
    }

    // Immediately navigate to Host Dashboard
    navigate(`/host/${roomCode}`);
  };

  return (
    <div className="relative min-h-screen bg-[#0B0E14] bg-grid-pattern overflow-hidden flex flex-col justify-between">
      {/* Background Ambient Glow Orbs */}
      <div className="glow-orb top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/20" />
      <div className="glow-orb bottom-[-150px] left-[-100px] w-[500px] h-[500px] bg-indigo-600/15" />
      <div className="glow-orb top-[40%] right-[-150px] w-[450px] h-[450px] bg-cyan-500/10" />

      {/* Navigation Bar */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
          <Logo size="md" />
        </div>

        {/* Server Connection Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-xs font-medium backdrop-blur-md">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
          <span className="text-slate-400">
            {isConnected ? "Server Connected" : "Connecting Server..."}
          </span>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto w-full px-6 py-12 flex-1 flex flex-col items-center justify-center text-center">
        {/* Top Feature Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-float">
          <Sparkles className="w-4 h-4 text-blue-400" />
          Next-Gen Live Classroom Platform
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight flex flex-col items-center">
          <Logo size="xl" className="mb-2" />
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent text-glow">
            Learn Together. Live.
          </span>
        </h1>

        <p className="max-w-2xl text-lg md:text-xl text-slate-400 mb-12 font-normal leading-relaxed">
          Empower educators and students with high-performance real-time interactive classrooms, instant room codes, waiting room approvals, and live editor synchronization.
        </p>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-5 w-full max-w-md">
          <button
            onClick={handleHostClass}
            className="w-full sm:w-1/2 group relative inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-semibold text-base shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Video className="w-5 h-5 transition-transform group-hover:scale-110" />
            <span>Host Class</span>
          </button>

          <button
            onClick={() => navigate("/join")}
            className="w-full sm:w-1/2 group relative inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-100 font-semibold text-base border border-slate-700/80 hover:border-blue-500/50 backdrop-blur-md shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <LogIn className="w-5 h-5 text-blue-400 transition-transform group-hover:scale-110" />
            <span>Join Class</span>
          </button>
        </div>

        {/* Uiverse.io Browser Animation Showcase Requested by User */}
        <div className="w-full mt-14 mb-8">
          <div className="text-center mb-3">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-full">
              Live Interface Network Preview
            </span>
          </div>
          <BrowserPreviewLoader />
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full text-left">
          <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative group overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Waiting Room Controls</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Teachers maintain total control over entry queues with instant Accept / Reject join requests.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative group overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Live Editor Sync</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Every keystroke in the host's textarea is broadcast instantly to all connected students.
            </p>
          </div>

          <div className="glass-panel glass-panel-hover rounded-2xl p-6 relative group overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Zero Database Overhead</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Lightweight in-memory room management for maximum real-time performance and privacy.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-6 py-6 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <div>Classora Platform &copy; 2026. Live Learning Environment.</div>
        <div className="flex items-center gap-4">
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Privacy</span>
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Terms</span>
          <span className="hover:text-slate-300 transition-colors cursor-pointer">Status</span>
        </div>
      </footer>
    </div>
  );
};
