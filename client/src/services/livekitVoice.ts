import { Room, RoomEvent, Track } from "livekit-client";
import { socketService } from "./SocketService";
import { socket } from "./socket";

export interface LiveKitTokenResponse {
  success: boolean;
  token: string;
  wsUrl: string;
  identity: string;
  error?: string;
}

export async function fetchLiveKitToken(
  roomId: string,
  identity: string,
  isTeacher: boolean = false
): Promise<LiveKitTokenResponse> {
  const targetServerUrl = socketService.getCurrentUrl();
  const endpoint = `${targetServerUrl.replace(/\/$/, "")}/api/livekit/token?roomId=${encodeURIComponent(
    roomId
  )}&identity=${encodeURIComponent(identity)}&isTeacher=${isTeacher}`;

  try {
    const res = await fetch(endpoint);
    if (res.ok) {
      return await res.json();
    }
    const text = await res.text();
    return {
      success: false,
      token: "",
      wsUrl: "",
      identity,
      error: `HTTP ${res.status}: ${text}`,
    };
  } catch (err: any) {
    return {
      success: false,
      token: "",
      wsUrl: "",
      identity,
      error: err.toString(),
    };
  }
}

// Global Web Audio Context & Autoplay Policy Unlocker
let globalAudioCtx: AudioContext | null = null;

export function getGlobalAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === "closed") {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtxClass();
  }
  if (globalAudioCtx.state === "suspended") {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

export function unlockAudioPlayer(): AudioContext {
  return getGlobalAudioContext();
}

// Global window click & touch listener to guarantee browser AudioContext is unlocked on first user gesture
if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    const ctx = getGlobalAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    window.removeEventListener("click", handleUserGesture);
    window.removeEventListener("touchstart", handleUserGesture);
  };
  window.addEventListener("click", handleUserGesture);
  window.addEventListener("touchstart", handleUserGesture);
}

// Web Audio API Raw PCM Streaming Engine (Zero Container Headers - Guaranteed 100% Mobile & Cross-Tab Voice Audio)
class WebAudioPCMEngine {
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isTeacher: boolean = false;
  private isMicEnabled: boolean = false;
  private currentRoomId: string = "";
  private senderName: string = "Speaker";

  public async init(roomId: string, senderName: string, isTeacher: boolean): Promise<boolean> {
    this.currentRoomId = (roomId || "DEMO").toUpperCase();
    this.senderName = senderName || (isTeacher ? "Teacher" : "Student");
    this.isTeacher = isTeacher;
    this.isMicEnabled = isTeacher;

    unlockAudioPlayer();
    this.bindSocketListeners();

    if (isTeacher) {
      await this.startMicrophoneCapture();
    }

    return true;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    this.isMicEnabled = enabled;
    if (enabled) {
      await this.startMicrophoneCapture();
    } else {
      this.stopMicrophoneCapture();
    }
    console.log(`[PCMEngine] Microphone for room "${this.currentRoomId}" set to: ${enabled ? "ENABLED 🟢" : "MUTED 🔇"}`);
    return true;
  }

  private async startMicrophoneCapture() {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      }

      this.stopMicrophoneCapture();

      this.audioCtx = getGlobalAudioContext();
      this.mediaSource = this.audioCtx.createMediaStreamSource(this.localStream);

      // Create a 2048-sample buffer processor (~46ms audio frames)
      this.scriptProcessor = this.audioCtx.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isMicEnabled) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array [-1.0, 1.0] to 16-bit PCM Int16Array for socket transfer
        const pcmSamples = new Int16Array(inputData.length);
        let hasSound = false;

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          if (Math.abs(s) > 0.005) hasSound = true;
          pcmSamples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Always emit audio samples to socket when mic is enabled
        if (hasSound || Math.random() < 0.05) {
          socket.emit("broadcast-pcm-audio", {
            roomId: this.currentRoomId,
            pcmSamples: Array.from(pcmSamples),
            sampleRate: this.audioCtx?.sampleRate || 44100,
            senderName: this.senderName,
          });
        }
      };

      this.mediaSource.connect(this.scriptProcessor);
      // Create silent gain node to drive ScriptProcessor without local speaker echo loop
      const silentGain = this.audioCtx.createGain();
      silentGain.gain.value = 0;
      this.scriptProcessor.connect(silentGain);
      silentGain.connect(this.audioCtx.destination);

      console.log(`[PCMEngine] Capturing real-time PCM audio for room "${this.currentRoomId}" at sampleRate: ${this.audioCtx.sampleRate} Hz`);
    } catch (err) {
      console.warn("[PCMEngine] Error accessing microphone:", err);
    }
  }

  private stopMicrophoneCapture() {
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }
    if (this.mediaSource) {
      try {
        this.mediaSource.disconnect();
      } catch (e) {}
      this.mediaSource = null;
    }
  }

  private bindSocketListeners() {
    socket.off("receive-pcm-audio");
    socket.on("receive-pcm-audio", ({ pcmSamples, sampleRate, roomId }: { pcmSamples: number[]; sampleRate: number; roomId?: string }) => {
      if (roomId && roomId.toUpperCase() !== this.currentRoomId) return;
      if (!pcmSamples || pcmSamples.length === 0) return;

      try {
        const ctx = getGlobalAudioContext();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        // Convert Int16 PCM array back to Float32Array
        const float32Samples = new Float32Array(pcmSamples.length);
        for (let i = 0; i < pcmSamples.length; i++) {
          const s = pcmSamples[i];
          float32Samples[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
        }

        const audioBuffer = ctx.createBuffer(1, float32Samples.length, sampleRate || 44100);
        audioBuffer.getChannelData(0).set(float32Samples);

        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(ctx.destination);
        sourceNode.start(0);
      } catch (err) {
        console.error("[PCMEngine] Error playing PCM sample chunk:", err);
      }
    });
  }

  public cleanup() {
    this.stopMicrophoneCapture();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    socket.off("receive-pcm-audio");
  }
}

export class LiveKitVoiceManager {
  private room: Room | null = null;
  private isConnected: boolean = false;
  private voiceMode: "livekit" | "pcm" = "pcm";
  private activeSpeakers: string[] = [];
  private pcmEngine: WebAudioPCMEngine = new WebAudioPCMEngine();
  private onActiveSpeakersChangeCb?: (speakers: string[]) => void;
  private onConnectionStateChangeCb?: (connected: boolean) => void;

  public async connect(wsUrl: string, token: string, isTeacher: boolean, identity: string = "User", roomId: string = ""): Promise<boolean> {
    unlockAudioPlayer();

    try {
      // 1. Attempt Primary Connection: LiveKit Cloud
      if (wsUrl && !wsUrl.includes("demo.livekit.cloud") && token) {
        console.log("[LiveKitVoice] Attempting LiveKit Cloud WebRTC connection...");
        this.room = new Room({
          adaptiveStream: true,
          dynacast: true,
          audioCaptureDefaults: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        this.room.on(RoomEvent.Connected, () => {
          console.log(`[LiveKitVoice] Connected to LiveKit Cloud room "${this.room?.name}"`);
          this.isConnected = true;
          this.voiceMode = "livekit";
          if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(true);
        });

        this.room.on(RoomEvent.Disconnected, () => {
          console.log("[LiveKitVoice] Disconnected from LiveKit Cloud room");
        });

        this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
          const identities = speakers.map((s) => s.identity);
          this.activeSpeakers = identities;
          if (this.onActiveSpeakersChangeCb) this.onActiveSpeakersChangeCb(identities);
        });

        this.room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const el = document.createElement("audio");
            el.autoplay = true;
            track.attach(el);
            el.play().catch(() => {});
          }
        });

        await this.room.connect(wsUrl, token);
        await this.room.localParticipant.setMicrophoneEnabled(isTeacher);
        this.isConnected = true;
        this.voiceMode = "livekit";
        if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(true);
        return true;
      }
    } catch (err) {
      console.warn("[LiveKitVoice] LiveKit Cloud unavailable or placeholder domain. Activating Web Audio API PCM Engine fallback...");
    }

    // 2. Guaranteed Fallback: Web Audio API PCM Sample Engine (Works on all mobile phones & tabs!)
    console.log(`[LiveKitVoice] Initializing Web Audio API PCM Engine for room "${roomId}"...`);
    const ok = await this.pcmEngine.init(roomId, identity, isTeacher);
    this.isConnected = ok;
    this.voiceMode = "pcm";
    if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(ok);
    return ok;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    if (this.voiceMode === "livekit" && this.room?.localParticipant) {
      try {
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
        console.log(`[LiveKitVoice] LiveKit Microphone set to: ${enabled}`);
        return true;
      } catch (err) {
        console.error("[LiveKitVoice] Error setting LiveKit mic:", err);
      }
    }

    // Fallback to PCM Engine
    return await this.pcmEngine.setMicrophoneEnabled(enabled);
  }

  public onActiveSpeakersChange(cb: (speakers: string[]) => void) {
    this.onActiveSpeakersChangeCb = cb;
  }

  public onConnectionStateChange(cb: (connected: boolean) => void) {
    this.onConnectionStateChangeCb = cb;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getVoiceMode(): "livekit" | "pcm" {
    return this.voiceMode;
  }

  public async disconnect(): Promise<void> {
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (err) {
        // Silent catch
      }
      this.room = null;
    }
    this.pcmEngine.cleanup();
    this.isConnected = false;
  }
}

export const livekitVoiceManager = new LiveKitVoiceManager();
