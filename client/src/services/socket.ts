import { io, Socket } from "socket.io-client";
import { useEffect, useState } from "react";

export const DEFAULT_PUBLIC_SERVER = "https://2b0e03cb348a9427-152-59-232-34.serveousercontent.com";
export const LOCAL_WIFI_SERVER = "http://10.240.8.91:5000";

export function getSavedServerUrl(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("classora_server_url");
    if (saved) return saved;
  }
  return import.meta.env.VITE_SERVER_URL || DEFAULT_PUBLIC_SERVER;
}

export const socket: Socket = io(getSavedServerUrl(), {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"],
});

export function setCustomServerUrl(url: string) {
  if (!url) return;
  const cleanUrl = url.trim().replace(/\/$/, "");
  localStorage.setItem("classora_server_url", cleanUrl);
  window.location.reload();
}

export function resetServerUrl() {
  localStorage.removeItem("classora_server_url");
  window.location.reload();
}

export function useSocketStatus() {
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);
  const [socketId, setSocketId] = useState<string | undefined>(socket.id);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
      setSocketId(socket.id);
      console.log(`[Frontend Socket] Connected to server: ${socket.id}`);
    }

    function onDisconnect() {
      setIsConnected(false);
      setSocketId(undefined);
      console.log(`[Frontend Socket] Disconnected from server`);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    if (socket.connected) {
      setIsConnected(true);
      setSocketId(socket.id);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  return { isConnected, socketId };
}
