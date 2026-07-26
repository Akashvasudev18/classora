import React, { useState, useEffect } from "react";
import { Mic, MicOff, Hand, Volume2, ShieldAlert, CheckCircle2, Clock, Settings } from "lucide-react";
import { getAudioInputDevices, livekitVoiceManager } from "../../services/livekitVoice";

interface StudentVoicePanelProps {
  hasHandRaised: boolean;
  isSpeakingPermitted: boolean;
  onRaiseHand: () => void;
  onLowerHand: () => void;
  isVoiceConnected: boolean;
}

export const StudentVoicePanel: React.FC<StudentVoicePanelProps> = ({
  hasHandRaised,
  isSpeakingPermitted,
  onRaiseHand,
  onLowerHand,
  isVoiceConnected,
}) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  useEffect(() => {
    const loadDevices = async () => {
      const devices = await getAudioInputDevices();
      setAudioDevices(devices);
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    };
    loadDevices();
  }, []);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDeviceId = e.target.value;
    setSelectedDeviceId(newDeviceId);
    livekitVoiceManager.setAudioInputDevice(newDeviceId);
  };

  return (
    <div className="rounded-2xl bg-[#111621] border border-slate-800 p-4 shadow-xl font-sans space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md transition-all ${
              isSpeakingPermitted
                ? "bg-emerald-500 shadow-emerald-500/30 ring-4 ring-emerald-500/20 animate-pulse"
                : hasHandRaised
                ? "bg-amber-500 shadow-amber-500/30 ring-2 ring-amber-400/30"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {isSpeakingPermitted ? (
              <Mic className="w-5 h-5 text-white" />
            ) : hasHandRaised ? (
              <Hand className="w-5 h-5 text-slate-950" />
            ) : (
              <MicOff className="w-5 h-5 text-slate-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white leading-tight">Classroom Audio</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isVoiceConnected
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-slate-800 border border-slate-700 text-slate-400"
                }`}
              >
                {isVoiceConnected ? "Voice Connected 🟢" : "Voice Offline"}
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-0.5">
              {isSpeakingPermitted ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> You may speak now
                </span>
              ) : hasHandRaised ? (
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 inline" /> Waiting for teacher approval
                </span>
              ) : (
                <span className="text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 inline text-slate-500" /> Muted by teacher
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Microphone Input Device Selector Dropdown for Student */}
        {audioDevices.length > 0 && (
          <div className="flex items-center gap-2 text-xs bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Settings className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <select
              value={selectedDeviceId}
              onChange={handleDeviceChange}
              className="bg-transparent text-slate-300 border-none text-xs focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {audioDevices.map((d, index) => (
                <option key={d.deviceId || index} value={d.deviceId} className="bg-slate-900 text-slate-200">
                  {d.label || `Microphone ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Raise Hand / Lower Hand Toggle Button */}
        {!isSpeakingPermitted && (
          <button
            onClick={hasHandRaised ? onLowerHand : onRaiseHand}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer border active:scale-95 ${
              hasHandRaised
                ? "bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40 shadow-amber-500/10"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400/50 shadow-amber-500/20"
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{hasHandRaised ? "Lower Hand" : "Raise Hand"}</span>
          </button>
        )}

        {isSpeakingPermitted && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-bounce">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Microphone Active</span>
          </div>
        )}
      </div>
    </div>
  );
};
