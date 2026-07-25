import { useEffect, useState } from "react";
import { socketService, ConnectionStatus } from "./SocketService";

export const socket = socketService.getSocket();

export function useSocketStatus() {
  const [status, setStatus] = useState<ConnectionStatus>(socketService.getStatus());
  const [socketId, setSocketId] = useState<string | undefined>(socket.id);

  useEffect(() => {
    const unsubscribe = socketService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
      setSocketId(socket.id);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    status,
    isConnected: status === "connected",
    socketId,
  };
}
