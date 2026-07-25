import { io, Socket } from "socket.io-client";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

type StatusListener = (status: ConnectionStatus) => void;

class SocketService {
  private static instance: SocketService;
  private socket: Socket;
  private status: ConnectionStatus = "connecting";
  private statusListeners: Set<StatusListener> = new Set();

  private constructor() {
    // Resolve socket URL dynamically from VITE_SOCKET_URL or current window location
    const configuredUrl = import.meta.env.VITE_SOCKET_URL;
    let targetUrl = "";

    if (configuredUrl && configuredUrl.trim() !== "") {
      targetUrl = configuredUrl.trim().replace(/\/$/, "");
    } else if (typeof window !== "undefined" && window.location && window.location.origin) {
      targetUrl = window.location.origin;
    }

    console.log(`[SocketService] Initializing Singleton Socket connection to: "${targetUrl || "default"}"`);

    this.socket = io(targetUrl, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000,
    });

    this.setupListeners();
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private setupListeners(): void {
    this.socket.on("connect", () => {
      console.log(`[SocketService] Connected. Socket ID: ${this.socket.id}`);
      this.setStatus("connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.warn(`[SocketService] Disconnected. Reason: ${reason}`);
      if (reason === "io server disconnect") {
        // Server disconnected the socket explicitly; attempt manual reconnect
        this.socket.connect();
      }
      this.setStatus("disconnected");
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`[SocketService] Reconnecting... Attempt #${attempt}`);
      this.setStatus("reconnecting");
    });

    this.socket.io.on("reconnect", (attempt) => {
      console.log(`[SocketService] Reconnected successfully after ${attempt} attempt(s)`);
      this.setStatus("connected");
    });

    this.socket.io.on("reconnect_error", (error) => {
      console.error(`[SocketService] Reconnection error:`, error);
      this.setStatus("reconnecting");
    });

    this.socket.io.on("reconnect_failed", () => {
      console.error(`[SocketService] Reconnection failed completely.`);
      this.setStatus("disconnected");
    });

    this.socket.on("connect_error", (error) => {
      console.warn(`[SocketService] Connect error:`, error.message);
      if (this.status !== "connected") {
        this.setStatus("reconnecting");
      }
    });
  }

  private setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((listener) => listener(newStatus));
    }
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getSocket(): Socket {
    return this.socket;
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    // Trigger current status immediately for late subscribers
    listener(this.status);

    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    this.socket.on(event, callback);
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    this.socket.off(event, callback);
  }

  public emit(event: string, data?: any, ack?: (...args: any[]) => void): void {
    this.socket.emit(event, data, ack);
  }
}

export const socketService = SocketService.getInstance();
