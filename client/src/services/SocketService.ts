import { io, Socket } from "socket.io-client";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

type StatusListener = (status: ConnectionStatus) => void;

export const RENDER_BACKEND_URL = "https://classora-3s1d.onrender.com";

export function resolveTargetSocketUrl(): string {
  // 1. Check manual user selection from localStorage
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("classora_socket_url");
    if (saved && saved.trim() !== "") {
      return saved.trim().replace(/\/$/, "");
    }
  }

  // 2. If running on localhost or local IP dev server, target local port 5000
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }
  }

  // 3. Check VITE_SOCKET_URL if defined and valid
  const envUrl = import.meta.env.VITE_SOCKET_URL;
  if (envUrl && envUrl.trim() !== "" && !envUrl.includes("vercel.app")) {
    return envUrl.trim().replace(/\/$/, "");
  }

  // 4. Live Render Backend fallback
  return RENDER_BACKEND_URL;
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket;
  private status: ConnectionStatus = "connecting";
  private statusListeners: Set<StatusListener> = new Set();
  private currentUrl: string;

  private constructor() {
    this.currentUrl = resolveTargetSocketUrl();
    console.log(`[SocketService] Initializing Socket connection to: "${this.currentUrl}"`);

    this.socket = io(this.currentUrl, {
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
      console.log(`[SocketService] Connected to ${this.currentUrl}. Socket ID: ${this.socket.id}`);
      this.setStatus("connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.warn(`[SocketService] Disconnected from ${this.currentUrl}. Reason: ${reason}`);
      if (reason === "io server disconnect") {
        this.socket.connect();
      }
      this.setStatus("disconnected");
    });

    this.socket.io.on("reconnect_attempt", (attempt) => {
      console.log(`[SocketService] Reconnecting to ${this.currentUrl}... Attempt #${attempt}`);
      this.setStatus("reconnecting");
    });

    this.socket.io.on("reconnect", (attempt) => {
      console.log(`[SocketService] Reconnected to ${this.currentUrl} after ${attempt} attempt(s)`);
      this.setStatus("connected");
    });

    this.socket.io.on("reconnect_error", (error) => {
      console.error(`[SocketService] Reconnection error:`, error);
      this.setStatus("reconnecting");
    });

    this.socket.on("connect_error", (error) => {
      console.warn(`[SocketService] Connect error on ${this.currentUrl}:`, error.message);
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

  public switchServerUrl(newUrl: string): void {
    if (!newUrl) return;
    const cleanUrl = newUrl.trim().replace(/\/$/, "");
    this.currentUrl = cleanUrl;
    if (typeof window !== "undefined") {
      localStorage.setItem("classora_socket_url", cleanUrl);
    }
    console.log(`[SocketService] Switching Socket server to: "${cleanUrl}"`);
    this.setStatus("connecting");
    this.socket.removeAllListeners();
    this.socket.disconnect();

    this.socket = io(cleanUrl, {
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

  public resetToDefaultUrl(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("classora_socket_url");
    }
    const defaultUrl = resolveTargetSocketUrl();
    this.switchServerUrl(defaultUrl);
  }

  public getCurrentUrl(): string {
    return this.currentUrl;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getSocket(): Socket {
    return this.socket;
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
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
