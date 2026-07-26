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

export async function getAudioInputDevices(): Promise<MediaDeviceInfo[]> {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput");
  } catch (err) {
    return [];
  }
}

// Global Web Audio Context & Autoplay Policy Unlocker
let globalAudioCtx: AudioContext | null = null;
let globalRemoteAudioElement: HTMLAudioElement | null = null;

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

export function getOrCreateRemoteAudioPlayer(): HTMLAudioElement {
  if (!globalRemoteAudioElement || !document.body.contains(globalRemoteAudioElement)) {
    let existing = document.getElementById("classora-remote-teacher-audio") as HTMLAudioElement;
    if (existing) {
      globalRemoteAudioElement = existing;
    } else {
      globalRemoteAudioElement = document.createElement("audio");
      globalRemoteAudioElement.id = "classora-remote-teacher-audio";
      globalRemoteAudioElement.autoplay = true;
      (globalRemoteAudioElement as any).playsInline = true;
      globalRemoteAudioElement.style.display = "none";
      document.body.appendChild(globalRemoteAudioElement);
    }
  }

  globalRemoteAudioElement.muted = false;
  globalRemoteAudioElement.volume = 1.0;
  return globalRemoteAudioElement;
}

export function unlockAudioPlayer(): AudioContext {
  const player = getOrCreateRemoteAudioPlayer();
  player.play().catch(() => {});
  return getGlobalAudioContext();
}

// Global click & touch listener to unlock AudioContext and Audio Player on user gesture
if (typeof window !== "undefined") {
  const handleUserGesture = () => {
    const ctx = getGlobalAudioContext();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const player = getOrCreateRemoteAudioPlayer();
    player.play().catch(() => {});
    window.removeEventListener("click", handleUserGesture);
    window.removeEventListener("touchstart", handleUserGesture);
  };
  window.addEventListener("click", handleUserGesture);
  window.addEventListener("touchstart", handleUserGesture);
}

// 1. Dual Engine - Primary WebRTC P2P with OpenRelay TURN Relays
class OpenRelayWebRTCEngine {
  private localStream: MediaStream | null = null;
  private peerConnections: { [socketId: string]: RTCPeerConnection } = {};
  private iceCandidatesBuffer: { [socketId: string]: any[] } = {};
  private isTeacher: boolean = false;
  private isMicEnabled: boolean = false;
  private currentRoomId: string = "";
  private selectedDeviceId: string = "";
  private onVolumeCb?: (volume: number) => void;

  public async init(roomId: string, isTeacher: boolean): Promise<boolean> {
    this.currentRoomId = (roomId || "DEMO").toUpperCase();
    this.isTeacher = isTeacher;
    this.isMicEnabled = isTeacher;
    unlockAudioPlayer();

    try {
      if (isTeacher) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        this.setupVolumeAnalyser(this.localStream);
      }
    } catch (err) {
      console.warn("[WebRTCVoice] Mic access error:", err);
    }

    this.bindSocketListeners();
    return true;
  }

  public onVolumeLevel(cb: (volume: number) => void) {
    this.onVolumeCb = cb;
  }

  private setupVolumeAnalyser(stream: MediaStream) {
    try {
      const ctx = getGlobalAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!this.localStream) {
          if (this.onVolumeCb) this.onVolumeCb(0);
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const volumePct = Math.min(100, Math.round((average / 128) * 100));

        if (this.onVolumeCb) {
          this.onVolumeCb(volumePct);
        }
        requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (err) {
      console.warn("[WebRTCVoice] Volume analyser setup notice:", err);
    }
  }

  public async setAudioInputDevice(deviceId: string): Promise<boolean> {
    this.selectedDeviceId = deviceId;
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.isMicEnabled) {
      return await this.setMicrophoneEnabled(true);
    }
    return true;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    this.isMicEnabled = enabled;
    try {
      if (enabled && !this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        this.setupVolumeAnalyser(this.localStream);
      }

      if (this.localStream) {
        this.localStream.getAudioTracks().forEach((t) => {
          t.enabled = enabled;
        });
      }

      console.log(`[WebRTCVoice] Mic set to: ${enabled ? "ENABLED 🟢" : "MUTED 🔇"}`);
      return true;
    } catch (err) {
      console.error("[WebRTCVoice] Error toggling mic:", err);
      return false;
    }
  }

  public async initiatePeerConnection(targetSocketId: string) {
    if (!targetSocketId) return;
    try {
      const pc = this.createPeerConnection(targetSocketId);
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      socket.emit("webrtc-offer", { roomId: this.currentRoomId, targetSocketId, offer });
    } catch (err) {
      console.error("[WebRTCVoice] Error creating WebRTC offer:", err);
    }
  }

  private async processBufferedCandidates(senderSocketId: string) {
    const pc = this.peerConnections[senderSocketId];
    if (pc && pc.remoteDescription && this.iceCandidatesBuffer[senderSocketId]) {
      for (const candidate of this.iceCandidatesBuffer[senderSocketId]) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {}
      }
      delete this.iceCandidatesBuffer[senderSocketId];
    }
  }

  private bindSocketListeners() {
    socket.on("webrtc-offer", async ({ offer, senderSocketId }: { offer: any; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      try {
        const pc = this.createPeerConnection(senderSocketId);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await this.processBufferedCandidates(senderSocketId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("webrtc-answer", { roomId: this.currentRoomId, targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.error("[WebRTCVoice] Error handling offer:", err);
      }
    });

    socket.on("webrtc-answer", async ({ answer, senderSocketId }: { answer: any; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      try {
        const pc = this.peerConnections[senderSocketId];
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await this.processBufferedCandidates(senderSocketId);
        }
      } catch (err) {
        console.error("[WebRTCVoice] Error handling answer:", err);
      }
    });

    socket.on("webrtc-ice-candidate", async ({ candidate, senderSocketId }: { candidate: any; senderSocketId: string }) => {
      if (senderSocketId === socket.id) return;
      try {
        const pc = this.peerConnections[senderSocketId];
        if (pc && pc.remoteDescription && candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } else if (candidate) {
          if (!this.iceCandidatesBuffer[senderSocketId]) {
            this.iceCandidatesBuffer[senderSocketId] = [];
          }
          this.iceCandidatesBuffer[senderSocketId].push(candidate);
        }
      } catch (err) {
        console.error("[WebRTCVoice] Error adding ICE candidate:", err);
      }
    });

    socket.on("speaker-permission-granted", async () => {
      if (!this.isTeacher) {
        await this.setMicrophoneEnabled(true);
        socket.emit("get-room-state", { roomId: this.currentRoomId }, (res: any) => {
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
        { urls: "turn:openrelay.metered.ca:80", username: "openrelay", credential: "openrelay" },
        { urls: "turn:openrelay.metered.ca:443", username: "openrelay", credential: "openrelay" },
        { urls: "turns:openrelay.metered.ca:443", username: "openrelay", credential: "openrelay" },
      ],
    });

    // Ensure audio transceiver is explicitly added for active reception
    try {
      pc.addTransceiver("audio", { direction: this.isTeacher ? "sendrecv" : "recvonly" });
    } catch (e) {}

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("webrtc-ice-candidate", { roomId: this.currentRoomId, targetSocketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      console.log("[WebRTCVoice] 🔊 Incoming remote Opus voice track attached to permanent DOM player!");
      const stream = event.streams[0];
      if (!stream) return;

      const player = getOrCreateRemoteAudioPlayer();
      player.srcObject = stream;
      player.play().catch((err) => console.log("[WebRTCVoice] Player play error:", err));

      try {
        const ctx = getGlobalAudioContext();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const source = ctx.createMediaStreamSource(stream);
        source.connect(ctx.destination);
      } catch (e) {}
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
    this.iceCandidatesBuffer = {};
  }
}

// 2. Web Audio API Sample-Accurate Timeline PCM Engine (Fallback Engine)
class WebAudioPCMEngine {
  private localStream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private mediaSource: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private isTeacher: boolean = false;
  private isMicEnabled: boolean = false;
  private currentRoomId: string = "";
  private senderName: string = "Speaker";
  private selectedDeviceId: string = "";
  private nextPlayTime: number = 0;
  private onVolumeCb?: (volume: number) => void;

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

  public onVolumeLevel(cb: (volume: number) => void) {
    this.onVolumeCb = cb;
  }

  public async setAudioInputDevice(deviceId: string): Promise<boolean> {
    this.selectedDeviceId = deviceId;
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.isMicEnabled) {
      return await this.setMicrophoneEnabled(true);
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
    console.log(`[PCMEngine] Microphone set to: ${enabled ? "ENABLED 🟢" : "MUTED 🔇"}`);
    return true;
  }

  private async startMicrophoneCapture() {
    try {
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined,
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

      this.scriptProcessor = this.audioCtx.createScriptProcessor(4096, 1, 1);

      this.scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!this.isMicEnabled) return;
        const inputData = e.inputBuffer.getChannelData(0);

        const pcmSamples = new Int16Array(inputData.length);
        let hasSound = false;
        let sum = 0;

        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          const absVal = Math.abs(s);
          sum += absVal;
          if (absVal > 0.015) hasSound = true;
          pcmSamples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        const avg = sum / inputData.length;
        const vol = Math.min(100, Math.round(avg * 200));
        if (this.onVolumeCb) {
          this.onVolumeCb(vol);
        }

        if (hasSound) {
          socket.emit("broadcast-pcm-audio", {
            roomId: this.currentRoomId,
            pcmSamples: Array.from(pcmSamples),
            sampleRate: this.audioCtx?.sampleRate || 44100,
            senderName: this.senderName,
          });
        }
      };

      this.mediaSource.connect(this.scriptProcessor);
      const silentGain = this.audioCtx.createGain();
      silentGain.gain.value = 0;
      this.scriptProcessor.connect(silentGain);
      silentGain.connect(this.audioCtx.destination);
    } catch (err) {
      console.warn("[PCMEngine] Mic access error:", err);
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
    socket.on("receive-pcm-audio", ({ pcmSamples, sampleRate, roomId, senderSocketId }: { pcmSamples: number[]; sampleRate: number; roomId?: string; senderSocketId?: string }) => {
      if (senderSocketId === socket.id) return;
      if (roomId && roomId.toUpperCase() !== this.currentRoomId) return;
      if (!pcmSamples || pcmSamples.length === 0) return;

      try {
        const ctx = getGlobalAudioContext();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        const float32Samples = new Float32Array(pcmSamples.length);
        for (let i = 0; i < pcmSamples.length; i++) {
          const s = pcmSamples[i];
          float32Samples[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
        }

        const audioBuffer = ctx.createBuffer(1, float32Samples.length, sampleRate || ctx.sampleRate);
        audioBuffer.getChannelData(0).set(float32Samples);

        const sourceNode = ctx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(ctx.destination);

        const now = ctx.currentTime;
        if (this.nextPlayTime < now) {
          this.nextPlayTime = now + 0.02;
        }

        sourceNode.start(this.nextPlayTime);
        this.nextPlayTime += audioBuffer.duration;
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
    this.nextPlayTime = 0;
  }
}

export class LiveKitVoiceManager {
  private room: Room | null = null;
  private isConnected: boolean = false;
  private voiceMode: "livekit" | "webrtc" | "pcm" = "webrtc";
  private activeSpeakers: string[] = [];
  private webrtcEngine: OpenRelayWebRTCEngine = new OpenRelayWebRTCEngine();
  private pcmEngine: WebAudioPCMEngine = new WebAudioPCMEngine();
  private onActiveSpeakersChangeCb?: (speakers: string[]) => void;
  private onConnectionStateChangeCb?: (connected: boolean) => void;

  public async connect(wsUrl: string, token: string, isTeacher: boolean, identity: string = "User", roomId: string = ""): Promise<boolean> {
    unlockAudioPlayer();

    try {
      if (wsUrl && !wsUrl.includes("demo.livekit.cloud") && token) {
        console.log("[LiveKitVoice] Connecting to LiveKit Cloud...");
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
          this.isConnected = true;
          this.voiceMode = "livekit";
          if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(true);
        });

        this.room.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === Track.Kind.Audio) {
            const player = getOrCreateRemoteAudioPlayer();
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
      console.warn("[LiveKitVoice] LiveKit Cloud unavailable. Activating OpenRelay WebRTC Voice Engine fallback...");
    }

    console.log(`[LiveKitVoice] Initializing OpenRelay WebRTC Engine for room "${roomId}"...`);
    const okWebRTC = await this.webrtcEngine.init(roomId, isTeacher);

    if (okWebRTC) {
      this.isConnected = true;
      this.voiceMode = "webrtc";
    } else {
      console.log(`[LiveKitVoice] WebRTC failed. Initializing PCM Engine for room "${roomId}"...`);
      const okPCM = await this.pcmEngine.init(roomId, identity, isTeacher);
      this.isConnected = okPCM;
      this.voiceMode = "pcm";
    }

    if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(this.isConnected);
    return this.isConnected;
  }

  public onLocalVolumeLevel(cb: (volume: number) => void) {
    this.webrtcEngine.onVolumeLevel(cb);
    this.pcmEngine.onVolumeLevel(cb);
  }

  public async setAudioInputDevice(deviceId: string): Promise<boolean> {
    if (this.voiceMode === "webrtc") {
      return await this.webrtcEngine.setAudioInputDevice(deviceId);
    } else if (this.voiceMode === "pcm") {
      return await this.pcmEngine.setAudioInputDevice(deviceId);
    }
    return true;
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    if (this.voiceMode === "livekit" && this.room?.localParticipant) {
      try {
        await this.room.localParticipant.setMicrophoneEnabled(enabled);
        return true;
      } catch (err) {}
    } else if (this.voiceMode === "webrtc") {
      await this.webrtcEngine.setMicrophoneEnabled(enabled);
      return true;
    } else if (this.voiceMode === "pcm") {
      await this.pcmEngine.setMicrophoneEnabled(enabled);
      return true;
    }
    return true;
  }

  public initiatePeerConnection(targetSocketId: string) {
    if (this.voiceMode === "webrtc") {
      this.webrtcEngine.initiatePeerConnection(targetSocketId);
    }
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

  public getVoiceMode(): "livekit" | "webrtc" | "pcm" {
    return this.voiceMode;
  }

  public async disconnect(): Promise<void> {
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (err) {}
      this.room = null;
    }
    this.webrtcEngine.cleanup();
    this.pcmEngine.cleanup();
    this.isConnected = false;
  }
}

export const livekitVoiceManager = new LiveKitVoiceManager();
