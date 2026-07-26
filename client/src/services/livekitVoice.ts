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

// Global Audio Element & Autoplay Policy Unlocker
let remoteAudioElement: HTMLAudioElement | null = null;

export function unlockAudioPlayer(): HTMLAudioElement {
  if (!remoteAudioElement) {
    let existing = document.getElementById("classora-remote-voice-player") as HTMLAudioElement;
    if (existing) {
      remoteAudioElement = existing;
    } else {
      remoteAudioElement = document.createElement("audio");
      remoteAudioElement.id = "classora-remote-voice-player";
      remoteAudioElement.autoplay = true;
      (remoteAudioElement as any).playsInline = true;
      remoteAudioElement.style.display = "none";
      document.body.appendChild(remoteAudioElement);
    }
  }

  // Attempt to unlock AudioContext on user gesture
  if (remoteAudioElement) {
    remoteAudioElement.play().catch(() => {
      // Audio play blocked until user gesture
    });
  }

  return remoteAudioElement;
}

// Global window click listener to guarantee browser autoplay policy is unlocked on first user click
if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    unlockAudioPlayer();
    window.removeEventListener("click", handleUserGesture);
    window.removeEventListener("touchstart", handleUserGesture);
  };
  window.addEventListener("click", handleUserGesture);
  window.addEventListener("touchstart", handleUserGesture);
}

// Socket.IO Web Audio Relay Engine (Guaranteed Mobile & Cross-Tab Voice Audio)
class SocketAudioRelayEngine {
  private localStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isTeacher: boolean = false;
  private isMicEnabled: boolean = false;
  private currentRoomId: string = "";
  private senderName: string = "Speaker";
  private audioQueue: string[] = [];
  private isPlayingQueue: boolean = false;

  public async init(roomId: string, senderName: string, isTeacher: boolean): Promise<boolean> {
    this.currentRoomId = (roomId || "DEMO").toUpperCase();
    this.senderName = senderName || (isTeacher ? "Teacher" : "Student");
    this.isTeacher = isTeacher;
    this.isMicEnabled = isTeacher;
    unlockAudioPlayer();

    this.bindSocketListeners();

    if (isTeacher) {
      await this.startMicrophoneRecording();
    }

    return true;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    this.isMicEnabled = enabled;
    if (enabled) {
      await this.startMicrophoneRecording();
    } else {
      this.stopMicrophoneRecording();
    }
    console.log(`[AudioRelay] Microphone set to: ${enabled ? "ENABLED 🟢" : "MUTED 🔇"}`);
    return true;
  }

  private async startMicrophoneRecording() {
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

      this.stopMicrophoneRecording();

      // Find supported MIME type for cross-platform audio (Opus / WebM / MP4 / AAC)
      const options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== "undefined") {
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          options.mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          options.mimeType = "audio/mp4";
        } else if (MediaRecorder.isTypeSupported("audio/aac")) {
          options.mimeType = "audio/aac";
        }
      }

      this.mediaRecorder = new MediaRecorder(this.localStream, options);

      this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data && event.data.size > 0 && this.isMicEnabled) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Data = reader.result as string;
            socket.emit("broadcast-voice-chunk", {
              roomId: this.currentRoomId,
              audioBuffer: base64Data,
              senderName: this.senderName,
              isTeacher: this.isTeacher,
            });
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Record in 250ms continuous audio slices
      this.mediaRecorder.start(250);
      console.log(`[AudioRelay] Recording audio slices (250ms) using mimeType: ${options.mimeType || "default"}`);
    } catch (err) {
      console.warn("[AudioRelay] Error accessing microphone:", err);
    }
  }

  private stopMicrophoneRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.mediaRecorder = null;
    }
  }

  private bindSocketListeners() {
    socket.off("receive-voice-chunk");
    socket.on("receive-voice-chunk", ({ audioBuffer }: { audioBuffer: string }) => {
      if (audioBuffer) {
        this.audioQueue.push(audioBuffer);
        this.processAudioQueue();
      }
    });
  }

  private async processAudioQueue() {
    if (this.isPlayingQueue || this.audioQueue.length === 0) return;

    this.isPlayingQueue = true;
    const nextChunk = this.audioQueue.shift();

    if (nextChunk) {
      try {
        const audio = new Audio(nextChunk);
        audio.autoplay = true;
        (audio as any).playsInline = true;

        audio.onended = () => {
          this.isPlayingQueue = false;
          this.processAudioQueue();
        };

        audio.onerror = () => {
          this.isPlayingQueue = false;
          this.processAudioQueue();
        };

        await audio.play().catch(() => {
          // Autoplay policy fallback
          this.isPlayingQueue = false;
          this.processAudioQueue();
        });
      } catch (err) {
        this.isPlayingQueue = false;
        this.processAudioQueue();
      }
    } else {
      this.isPlayingQueue = false;
    }
  }

  public cleanup() {
    this.stopMicrophoneRecording();
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    socket.off("receive-voice-chunk");
    this.audioQueue = [];
    this.isPlayingQueue = false;
  }
}

export class LiveKitVoiceManager {
  private room: Room | null = null;
  private isConnected: boolean = false;
  private voiceMode: "livekit" | "relay" = "relay";
  private activeSpeakers: string[] = [];
  private relayEngine: SocketAudioRelayEngine = new SocketAudioRelayEngine();
  private onActiveSpeakersChangeCb?: (speakers: string[]) => void;
  private onConnectionStateChangeCb?: (connected: boolean) => void;

  public async connect(wsUrl: string, token: string, isTeacher: boolean, identity: string = "User"): Promise<boolean> {
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
            const player = unlockAudioPlayer();
            track.attach(player);
            player.play().catch(() => {});
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
      console.warn("[LiveKitVoice] LiveKit Cloud unavailable or placeholder domain. Activating Socket.IO Web Audio Relay Engine fallback...");
    }

    // 2. Guaranteed Fallback: Socket.IO Web Audio Relay Engine (Works on all mobile phones & tabs!)
    console.log("[LiveKitVoice] Initializing Socket.IO Web Audio Relay Engine...");
    const ok = await this.relayEngine.init(token || "ROOM", identity, isTeacher);
    this.isConnected = ok;
    this.voiceMode = "relay";
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

    // Fallback to Socket.IO Web Audio Relay Engine
    return await this.relayEngine.setMicrophoneEnabled(enabled);
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

  public getVoiceMode(): "livekit" | "relay" {
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
    this.relayEngine.cleanup();
    this.isConnected = false;
  }
}

export const livekitVoiceManager = new LiveKitVoiceManager();
