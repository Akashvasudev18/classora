import { Room, RoomEvent, LocalAudioTrack, Track, RemoteParticipant, LocalParticipant } from "livekit-client";
import { socketService } from "./SocketService";

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

export class LiveKitVoiceManager {
  private room: Room | null = null;
  private isConnected: boolean = false;
  private activeSpeakers: string[] = [];
  private onActiveSpeakersChangeCb?: (speakers: string[]) => void;
  private onConnectionStateChangeCb?: (connected: boolean) => void;

  public async connect(wsUrl: string, token: string, isTeacher: boolean): Promise<boolean> {
    try {
      if (this.room) {
        await this.disconnect();
      }

      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Bind event listeners
      this.room.on(RoomEvent.Connected, () => {
        console.log(`[LiveKitVoice] Connected to room "${this.room?.name}"`);
        this.isConnected = true;
        if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(true);
      });

      this.room.on(RoomEvent.Disconnected, () => {
        console.log("[LiveKitVoice] Disconnected from room");
        this.isConnected = false;
        if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(false);
      });

      this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const identities = speakers.map((s) => s.identity);
        this.activeSpeakers = identities;
        if (this.onActiveSpeakersChangeCb) this.onActiveSpeakersChangeCb(identities);
      });

      // Audio Track Subscribed Listener
      this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          console.log(`[LiveKitVoice] Subscribed to audio track from participant: ${participant.identity}`);
          const element = track.attach();
          element.style.display = "none";
          document.body.appendChild(element);
        }
      });

      this.room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((el) => el.remove());
      });

      await this.room.connect(wsUrl, token);

      // Microphone configuration: Teacher defaults to ON; Student defaults to OFF
      if (isTeacher) {
        await this.room.localParticipant.setMicrophoneEnabled(true);
        console.log("[LiveKitVoice] Teacher microphone enabled automatically");
      } else {
        await this.room.localParticipant.setMicrophoneEnabled(false);
        console.log("[LiveKitVoice] Student joined with microphone disabled (muted)");
      }

      return true;
    } catch (err) {
      console.error("[LiveKitVoice] Error connecting to LiveKit room:", err);
      this.isConnected = false;
      if (this.onConnectionStateChangeCb) this.onConnectionStateChangeCb(false);
      return false;
    }
  }

  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room || !this.room.localParticipant) {
      console.warn("[LiveKitVoice] Cannot set microphone state: Not connected to room");
      return false;
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      console.log(`[LiveKitVoice] Local microphone set to: ${enabled ? "ENABLED 🟢" : "MUTED 🔇"}`);
      return true;
    } catch (err) {
      console.error("[LiveKitVoice] Failed to change microphone state:", err);
      return false;
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

  public getActiveSpeakers(): string[] {
    return this.activeSpeakers;
  }

  public async disconnect(): Promise<void> {
    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (err) {
        console.error("[LiveKitVoice] Error disconnecting from LiveKit room:", err);
      }
      this.room = null;
    }
    this.isConnected = false;
  }
}

export const livekitVoiceManager = new LiveKitVoiceManager();
