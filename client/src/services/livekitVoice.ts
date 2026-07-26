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

// Global Audio Player & Autoplay Policy Unlocker
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
      // Audio play blocked until user gesture, which is normal
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

// Built-in WebRTC Audio Engine (Zero-Config Peer Audio Streaming)
class BuiltInAudioEngine {
  private localStream: MediaStream | null = null;
  private peerConnections: { [socketId: string]: RTCPeerConnection } = {};
  private isTeacher: boolean = false;
  private isMicEnabled: boolean = false;

  public async init(isTeacher: boolean): Promise<boolean> {
    this.isTeacher = isTeacher;
    this.isMicEnabled = isTeacher; // Teacher mic enabled by default; Student mic muted by default
    unlockAudioPlayer();

    try {
      if (isTeacher) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        console.log("[BuiltInVoice] Teacher microphone stream initialized");
      }
    } catch (err) {
      console.warn("[BuiltInVoice] Microphone permission pending or unavailable:", err);
    }

    this.bindSocketListeners();
    return true;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    this.isMicEnabled = enabled;
    try {
      if (enabled && !this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      }

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((track) => {
          track.enabled = enabled;
        });
      }

      console.log(`[BuiltInVoice] Local microphone state updated to: ${enabled ? "ENABLED 🟢" : "MUTED 🔇"}`);
      return true;
    } catch (err) {
      console.error("[BuiltInVoice] Error toggling microphone track:", err);
      return false;
    }
  }

  public async initiatePeerConnection(targetSocketId: string) {
    if (!targetSocketId) return;
    console.log(`[BuiltInVoice] Initiating WebRTC peer connection offer to socket: ${targetSocketId}`);
    try {
      const pc = this.createPeerConnection(targetSocketId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      socket.emit("webrtc-offer", { targetSocketId, offer });
    } catch (err) {
      console.error("[BuiltInVoice] Error creating WebRTC offer:", err);
    }
  }

  private bindSocketListeners() {
    socket.on("webrtc-offer", async ({ offer, senderSocketId }: { offer: any; senderSocketId: string }) => {
      try {
        console.log(`[BuiltInVoice] Received WebRTC offer from socket: ${senderSocketId}`);
        const pc = this.createPeerConnection(senderSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.error("[BuiltInVoice] Error handling WebRTC offer:", err);
      }
    });

    socket.on("webrtc-answer", async ({ answer, senderSocketId }: { answer: any; senderSocketId: string }) => {
      try {
        console.log(`[BuiltInVoice] Received WebRTC answer from socket: ${senderSocketId}`);
        const pc = this.peerConnections[senderSocketId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error("[BuiltInVoice] Error handling WebRTC answer:", err);
      }
    });

    socket.on("webrtc-ice-candidate", async ({ candidate, senderSocketId }: { candidate: any; senderSocketId: string }) => {
      try {
        const pc = this.peerConnections[senderSocketId];
        if (pc && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error("[BuiltInVoice] Error adding ICE candidate:", err);
      }
    });

    // When speaker permission is granted to a student, student initiates offer to teacher
    socket.on("speaker-permission-granted", async () => {
      if (!this.isTeacher) {
        console.log("[BuiltInVoice] Student permission granted! Enabling mic & starting peer connection...");
        await this.setMicrophoneEnabled(true);
        socket.emit("get-room-state", { roomId: "" }, (res: any) => {
          if (res?.roomState?.teacherSocket) {
            this.initiatePeerConnection(res.roomState.teacherSocket);
          }
        });
      }
    });
  }

  private createPeerConnection(targetSocketId: string): RTCPeerConnection {
    if (this.peerConnections[targetSocketId]) {
      this.peerConnections[targetSocketId].close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", { targetSocketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("[BuiltInVoice] 🔊 Received incoming remote audio stream! Playing through global voice player...");
      const player = unlockAudioPlayer();
      player.srcObject = event.streams[0];
      player.play().catch((err) => {
        console.warn("[BuiltInVoice] Play error (awaiting user gesture):", err);
      });
    };

    this.peerConnections[targetSocketId] = pc;
    return pc;
  }

  public cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    Object.values(this.peerConnections).forEach((pc) => pc.close());
    this.peerConnections = {};
  }
}

export class LiveKitVoiceManager {
  private room: Room | null = null;
  private isConnected: boolean = false;
  private voiceMode: "livekit" | "builtin" = "builtin";
  private activeSpeakers: string[] = [];
  private audioEngine: BuiltInAudioEngine = new BuiltInAudioEngine();
  private onActiveSpeakersChangeCb?: (speakers: string[]) => void;
  private onConnectionStateChangeCb?: (connected: boolean) => void;

  public async connect(wsUrl: string, token: string, isTeacher: boolean): Promise<boolean> {
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
      console.warn("[LiveKitVoice] LiveKit Cloud unavailable or placeholder domain. Activating Built-in WebRTC Audio Engine fallback...");
    }

    // 2. Seamless Fallback: Built-in WebRTC Voice Engine
    console.log("[LiveKitVoice] Initializing Built-in WebRTC Voice Engine...");
    const ok = await this.audioEngine.init(isTeacher);
    this.isConnected = ok;
    this.voiceMode = "builtin";
    if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(ok);
    return ok;
  }

  public initiateBuiltInPeerConnection(targetSocketId: string) {
    if (this.voiceMode === "builtin") {
      this.audioEngine.initiatePeerConnection(targetSocketId);
    }
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

    // Fallback to Built-in Engine
    return await this.audioEngine.setMicrophoneEnabled(enabled);
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

  public getVoiceMode(): "livekit" | "builtin" {
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
    this.audioEngine.cleanup();
    this.isConnected = false;
  }
}

export const livekitVoiceManager = new LiveKitVoiceManager();
