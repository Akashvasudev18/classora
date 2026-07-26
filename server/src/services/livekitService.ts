import { AccessToken } from "livekit-server-sdk";

export interface LiveKitTokenResult {
  success: boolean;
  token: string;
  wsUrl: string;
  identity: string;
  error?: string;
}

export class LiveKitService {
  private static getCredentials() {
    const apiKey = process.env.LIVEKIT_API_KEY || "APIdevkey123";
    const apiSecret = process.env.LIVEKIT_API_SECRET || "secretdevkey12345678901234567890";
    const wsUrl = process.env.LIVEKIT_URL || "wss://classora-voice-demo.livekit.cloud";
    return { apiKey, apiSecret, wsUrl };
  }

  public static async generateToken(
    roomId: string,
    identity: string,
    isTeacher: boolean = false
  ): Promise<LiveKitTokenResult> {
    try {
      const { apiKey, apiSecret, wsUrl } = this.getCredentials();
      const cleanRoomId = (roomId || "DEMO").toUpperCase();
      const cleanIdentity = identity || (isTeacher ? "Teacher" : "Student");

      const at = new AccessToken(apiKey, apiSecret, {
        identity: cleanIdentity,
        name: cleanIdentity,
        ttl: "8h",
      });

      // Voice-Only Permissions
      at.addGrant({
        roomJoin: true,
        room: cleanRoomId,
        canPublish: isTeacher, // Teacher can publish audio immediately; Student starts muted
        canPublishData: true,
        canSubscribe: true,
      });

      const token = await at.toJwt();

      console.log(`[LiveKitService] Token generated for "${cleanIdentity}" in room ${cleanRoomId} (Teacher: ${isTeacher})`);

      return {
        success: true,
        token,
        wsUrl,
        identity: cleanIdentity,
      };
    } catch (err: any) {
      console.error(`[LiveKitService] Token generation error:`, err);
      return {
        success: false,
        token: "",
        wsUrl: "",
        identity,
        error: err.message || "Failed to generate LiveKit token",
      };
    }
  }
}
