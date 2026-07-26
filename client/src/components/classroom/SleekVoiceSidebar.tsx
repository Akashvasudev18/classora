import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Hand,
  Volume2,
  VolumeX,
  Radio,
  Settings,
  Activity,
  Headphones,
  CheckCircle2,
  Clock,
  Shield,
  ChevronRight,
  ChevronLeft,
  UserCheck,
} from "lucide-react";
import { Student } from "./WaitingRoomPanel";
import { getAudioInputDevices, livekitVoiceManager, unlockAudioPlayer } from "../../services/livekitVoice";

interface SleekVoiceSidebarProps {
  isHost: boolean;
  students: Student[];
  raisedHands: string[]; // Student IDs or socket IDs
  activeSpeakerId: string | null;
  onAllowSpeaker?: (studentId: string) => void;
  onRemoveSpeaker?: (studentId: string) => void;
  onMuteAll?: () => void;
  isVoiceConnected: boolean;

  // Student specific props
  hasHandRaised?: boolean;
  isSpeakingPermitted?: boolean;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onConnectTeacherAudio?: () => void;
  isListeningToTeacher?: boolean;
}

export const SleekVoiceSidebar: React.FC<SleekVoiceSidebarProps> = ({
  isHost,
  students,
  raisedHands,
  activeSpeakerId,
  onAllowSpeaker,
  onRemoveSpeaker,
  onMuteAll,
  isVoiceConnected,
  hasHandRaised = false,
  isSpeakingPermitted = false,
  onRaiseHand,
  onLowerHand,
  onConnectTeacherAudio,
  isListeningToTeacher = false,
}) => {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [isTeacherMicMuted, setIsTeacherMicMuted] = useState<boolean>(false);
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState<boolean>(false);
  const [isHandQueueOpen, setIsHandQueueOpen] = useState<boolean>(false);
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

  const devicePopoverRef = useRef<HTMLDivElement>(null);
  const handPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadDevices = async () => {
      const devices = await getAudioInputDevices();
      setAudioDevices(devices);
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    };
    loadDevices();

    // Subscribe to real-time local microphone volume analyzer
    livekitVoiceManager.onLocalVolumeLevel((vol) => {
      setVolumeLevel(vol);
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (devicePopoverRef.current && !devicePopoverRef.current.contains(event.target as Node)) {
        setIsDeviceMenuOpen(false);
      }
      if (handPopoverRef.current && !handPopoverRef.current.contains(event.target as Node)) {
        setIsHandQueueOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    livekitVoiceManager.setAudioInputDevice(deviceId);
    setIsDeviceMenuOpen(false);
  };

  const handleToggleTeacherMic = async () => {
    const nextState = !isTeacherMicMuted;
    setIsTeacherMicMuted(nextState);
    await livekitVoiceManager.setMicrophoneEnabled(!nextState);
  };

  // Robust student resolution matching both studentId and socketId
  const getRaisedHandStudents = (): Student[] => {
    if (!raisedHands || raisedHands.length === 0) return [];
    
    return raisedHands.map((id) => {
      const matched = students.find((s) => s.id === id || s.socketId === id);
      if (matched) return matched;
      return {
        id,
        name: `Student (${id.substring(0, 6)})`,
        socketId: id,
      };
    });
  };

  const queueStudents = getRaisedHandStudents();
  const activeSpeaker = students.find((s) => s.id === activeSpeakerId || s.socketId === activeSpeakerId);

  return (
    <aside className="w-16 sm:w-20 bg-[#111621]/95 border-r border-slate-800/80 p-2.5 flex flex-col items-center justify-between font-sans select-none rounded-2xl shadow-2xl relative z-20 space-y-4">
      {/* Top Section: Connection Status & Microphone Control */}
      <div className="flex flex-col items-center space-y-4 w-full">
        {/* Connection Status Icon */}
        <div
          className="relative group cursor-pointer"
          title={isVoiceConnected ? "Voice Connected 🟢" : "Connecting Voice..."}
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
              isVoiceConnected
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ring-2 ring-emerald-500/20"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse"
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111621] ${
              isVoiceConnected ? "bg-emerald-400" : "bg-amber-400"
            }`}
          ></span>
        </div>

        {/* Dynamic Single Vertical Audio Meter Bar */}
        <div className="flex flex-col items-center space-y-1.5 py-1">
          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">MIC</div>
          <div className="w-2.5 h-28 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative flex flex-col justify-end p-0.5 shadow-inner">
            <div
              className={`w-full rounded-full transition-all duration-75 ${
                volumeLevel > 50
                  ? "bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-400 shadow-sm shadow-cyan-400/50"
                  : volumeLevel > 15
                  ? "bg-gradient-to-t from-emerald-600 to-emerald-400"
                  : "bg-emerald-500/40"
              }`}
              style={{ height: `${Math.max(4, volumeLevel)}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-400">{volumeLevel}%</span>
        </div>

        {/* Host Teacher Mic Mute / Unmute Button */}
        {isHost ? (
          <button
            onClick={handleToggleTeacherMic}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all border cursor-pointer active:scale-95 group relative ${
              isTeacherMicMuted
                ? "bg-rose-600/20 hover:bg-rose-600 text-rose-300 border-rose-500/40"
                : "bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/20"
            }`}
            title={isTeacherMicMuted ? "Unmute Teacher Mic" : "Mute Teacher Mic"}
          >
            {isTeacherMicMuted ? (
              <MicOff className="w-5 h-5 text-rose-400" />
            ) : (
              <Mic className="w-5 h-5 text-emerald-400 animate-pulse" />
            )}

            {/* Hover Tooltip */}
            <div className="absolute left-14 bg-slate-900 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
              {isTeacherMicMuted ? "Unmute Mic 🎙️" : "Mute Mic 🔇"}
            </div>
          </button>
        ) : (
          /* Student Controls: Listen to Teacher & Raise Hand Buttons */
          <div className="flex flex-col items-center space-y-3 w-full">
            {/* Listen to Teacher Audio Button */}
            <button
              onClick={() => {
                unlockAudioPlayer();
                if (onConnectTeacherAudio) onConnectTeacherAudio();
              }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all border cursor-pointer active:scale-95 group relative ${
                isListeningToTeacher
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 ring-2 ring-emerald-500/20"
                  : "bg-gradient-to-b from-indigo-600 to-blue-600 text-white border-indigo-400/40 animate-bounce"
              }`}
              title={isListeningToTeacher ? "Listening to Teacher 🟢" : "Listen to Teacher Audio 🎧"}
            >
              {isListeningToTeacher ? (
                <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
              ) : (
                <Headphones className="w-5 h-5 text-indigo-100" />
              )}

              <div className="absolute left-14 bg-slate-900 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
                {isListeningToTeacher ? "Listening 🟢" : "Listen to Teacher 🎧"}
              </div>
            </button>

            {/* Raise Hand Button */}
            {!isSpeakingPermitted && (
              <button
                onClick={hasHandRaised ? onLowerHand : onRaiseHand}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all border cursor-pointer active:scale-95 group relative ${
                  hasHandRaised
                    ? "bg-amber-500/30 text-amber-300 border-amber-500/50"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                }`}
                title={hasHandRaised ? "Lower Hand" : "Raise Hand"}
              >
                <Hand className={`w-5 h-5 ${hasHandRaised ? "text-amber-300 animate-bounce" : "text-slate-400"}`} />
                <div className="absolute left-14 bg-slate-900 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
                  {hasHandRaised ? "Lower Hand" : "Raise Hand ✋"}
                </div>
              </button>
            )}

            {isSpeakingPermitted && (
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center shadow-lg animate-pulse" title="Speaking Permitted">
                <Mic className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </div>
        )}

        {/* Microphone Input Device Picker Dropdown Popover */}
        <div className="relative" ref={devicePopoverRef}>
          <button
            onClick={() => setIsDeviceMenuOpen((prev) => !prev)}
            className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 flex items-center justify-center transition-colors cursor-pointer group relative"
            title="Audio Input Device Settings"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <div className="absolute left-14 bg-slate-900 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
              Mic Device Settings ⚙️
            </div>
          </button>

          {/* Floating Device Picker Menu */}
          {isDeviceMenuOpen && (
            <div className="absolute left-12 bottom-0 w-64 p-3 rounded-2xl bg-[#111621] border border-slate-800 shadow-2xl space-y-2 z-50 animate-in fade-in zoom-in-95">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-indigo-400" />
                <span>Select Microphone Input</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {audioDevices.map((d, index) => (
                  <button
                    key={d.deviceId || index}
                    onClick={() => handleDeviceChange(d.deviceId)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium truncate flex items-center justify-between transition-colors ${
                      selectedDeviceId === d.deviceId
                        ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                        : "hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="truncate">{d.label || `Microphone ${index + 1}`}</span>
                    {selectedDeviceId === d.deviceId && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Teacher Raised Hands Queue & Permission Popover Tab */}
      {isHost && (
        <div className="flex flex-col items-center space-y-3 w-full border-t border-slate-800/80 pt-3">
          {/* Mute All Icon Button */}
          {onMuteAll && (
            <button
              onClick={onMuteAll}
              className="w-10 h-10 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center justify-center transition-all cursor-pointer group relative"
              title="Mute All Students"
            >
              <VolumeX className="w-4 h-4" />
              <div className="absolute left-14 bg-slate-900 text-rose-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-rose-800 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 shadow-xl">
                Mute All 🔇
              </div>
            </button>
          )}

          {/* Dedicated Raised Hands Icon Button with Badge & Floating Permission Tab */}
          <div className="relative" ref={handPopoverRef}>
            <button
              onClick={() => setIsHandQueueOpen((prev) => !prev)}
              onMouseEnter={() => setIsHandQueueOpen(true)}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all border cursor-pointer relative group ${
                queueStudents.length > 0
                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50 ring-2 ring-amber-400/30 animate-pulse"
                  : "bg-slate-900 text-slate-500 border-slate-800"
              }`}
              title="Raised Hands Permission Queue"
            >
              <Hand className={`w-5 h-5 ${queueStudents.length > 0 ? "text-amber-300 animate-bounce" : "text-slate-500"}`} />

              {/* Hand Count Badge */}
              {queueStudents.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center border-2 border-[#111621] shadow-md">
                  {queueStudents.length}
                </span>
              )}
            </button>

            {/* Floating Raised Hand Permission Tab Card */}
            {isHandQueueOpen && (
              <div
                className="absolute left-14 bottom-0 w-72 p-3.5 rounded-2xl bg-[#111621] border border-amber-500/40 shadow-2xl z-50 flex flex-col space-y-3 animate-in fade-in zoom-in-95"
                onMouseEnter={() => setIsHandQueueOpen(true)}
                onMouseLeave={() => setIsHandQueueOpen(false)}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                    <Hand className="w-4 h-4 text-amber-400" />
                    <span>Raised Hands Permission Queue ({queueStudents.length})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">1 Speaker Limit</span>
                </div>

                {queueStudents.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 text-xs italic">
                    No students currently have hands raised ✋
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {queueStudents.map((s) => (
                      <div
                        key={s.id}
                        className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 shadow-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                            ✋
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-amber-200 truncate">{s.name}</div>
                            <div className="text-[10px] text-amber-400/70">Wants to speak</div>
                          </div>
                        </div>

                        {onAllowSpeaker && (
                          <button
                            onClick={() => {
                              onAllowSpeaker(s.id);
                              setIsHandQueueOpen(false);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Allow Speak 🟢</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
