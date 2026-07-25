import React, { useState } from "react";
import { ConnectionStatus, socketService } from "../../services/SocketService";
import { Server, Wifi, Globe, Monitor, Check, X, RefreshCw } from "lucide-react";

interface StatusBadgeProps {
  status?: ConnectionStatus;
  isConnected?: boolean;
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = "connected",
  isConnected,
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentStatus: ConnectionStatus =
    isConnected !== undefined ? (isConnected ? "connected" : "disconnected") : status;

  const currentUrl = socketService.getCurrentUrl();

  let dotColor = "bg-emerald-400 animate-pulse";
  let displayLabel = "Connected";

  switch (currentStatus) {
    case "connected":
      dotColor = "bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse";
      displayLabel = "Connected";
      break;
    case "connecting":
      dotColor = "bg-amber-400 animate-ping";
      displayLabel = "Connecting...";
      break;
    case "reconnecting":
      dotColor = "bg-amber-500 animate-pulse";
      displayLabel = "Reconnecting...";
      break;
    case "disconnected":
      dotColor = "bg-rose-500";
      displayLabel = "Disconnected";
      break;
  }

  const handleSelectServer = (url: string) => {
    socketService.switchServerUrl(url);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs shadow-inner transition-colors cursor-pointer"
        title="Click to change server connection"
      >
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <span className="text-slate-300 font-medium">{label || displayLabel}</span>
        <Server className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
          <div className="glass-card max-w-md w-full rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-5 relative text-left">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Socket Network Selector</h2>
                <p className="text-xs text-slate-400">Active: <span className="font-mono text-blue-400">{currentUrl}</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Network Option
              </label>

              {/* Option 1: Localhost */}
              <button
                onClick={() => handleSelectServer("http://localhost:5000")}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currentUrl.includes("localhost") || currentUrl.includes("127.0.0.1")
                    ? "bg-blue-600/15 border-blue-500/50"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Localhost Backend</div>
                    <div className="text-[10px] text-slate-400 font-mono">http://localhost:5000</div>
                  </div>
                </div>
                {currentUrl.includes("localhost") && <Check className="w-4 h-4 text-blue-400" />}
              </button>

              {/* Option 2: Local Wi-Fi IP */}
              <button
                onClick={() => handleSelectServer("http://10.240.8.91:5000")}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currentUrl.includes("10.240.8.91")
                    ? "bg-emerald-600/15 border-emerald-500/50"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Local Wi-Fi Network</div>
                    <div className="text-[10px] text-slate-400 font-mono">http://10.240.8.91:5000</div>
                  </div>
                </div>
                {currentUrl.includes("10.240.8.91") && <Check className="w-4 h-4 text-emerald-400" />}
              </button>

              {/* Option 3: Cloudflare Tunnel */}
              <button
                onClick={() => handleSelectServer("https://marijuana-caps-balloon-carlo.trycloudflare.com")}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  currentUrl.includes("trycloudflare.com")
                    ? "bg-amber-600/15 border-amber-500/50"
                    : "bg-slate-900 hover:bg-slate-800 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Cloudflare Tunnel</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]">
                      https://marijuana-caps-balloon-carlo.trycloudflare.com
                    </div>
                  </div>
                </div>
                {currentUrl.includes("trycloudflare.com") && <Check className="w-4 h-4 text-amber-400" />}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  socketService.resetToDefaultUrl();
                  setIsOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Smart Auto-Detect</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
