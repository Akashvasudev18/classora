import React, { useState } from "react";
import { Server, Check, RefreshCw, X, Globe, Wifi, Monitor } from "lucide-react";
import {
  getSavedServerUrl,
  setCustomServerUrl,
  resetServerUrl,
  useSocketStatus,
  DEFAULT_PUBLIC_SERVER,
  LOCAL_WIFI_SERVER,
} from "../../services/socket";

interface ServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerModal: React.FC<ServerModalProps> = ({ isOpen, onClose }) => {
  const { isConnected } = useSocketStatus();
  const [urlInput, setUrlInput] = useState(getSavedServerUrl());

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) {
      setCustomServerUrl(urlInput);
    }
  };

  const handleSelectPreset = (presetUrl: string) => {
    setUrlInput(presetUrl);
    setCustomServerUrl(presetUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-card max-w-md w-full rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Backend Server Network</h2>
            <p className="text-xs text-slate-400">Select network server for cross-device socket connection</p>
          </div>
        </div>

        {/* Connection Status Badge */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-300 font-medium">Socket Connection:</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className={`text-xs font-bold ${isConnected ? "text-emerald-400" : "text-rose-400"}`}>
              {isConnected ? "Connected (Online)" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Quick Connect Presets
          </label>
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleSelectPreset(DEFAULT_PUBLIC_SERVER)}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-left flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Public Cloud Tunnel</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">{DEFAULT_PUBLIC_SERVER}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                Cellular / Any Device
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset(LOCAL_WIFI_SERVER)}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-left flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Wifi className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Local Wi-Fi Network</div>
                  <div className="text-[10px] text-slate-500 font-mono">{LOCAL_WIFI_SERVER}</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                Same Wi-Fi
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectPreset("http://localhost:5000")}
              className="w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/50 text-left flex items-center justify-between transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Monitor className="w-4 h-4 text-indigo-400" />
                <div>
                  <div className="text-xs font-semibold text-white">Localhost</div>
                  <div className="text-[10px] text-slate-500 font-mono">http://localhost:5000</div>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20">
                Single Computer
              </span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Custom Server URL
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-blue-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Connect</span>
            </button>
            <button
              type="button"
              onClick={resetServerUrl}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Reset Default"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
