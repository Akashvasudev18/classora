import { socket } from "./socket";

type EventCallback = (data: any) => void;

export const realtimeBus = {
  on(event: string, callback: EventCallback) {
    socket.on(event, callback);
  },

  off(event: string, callback: EventCallback) {
    socket.off(event, callback);
  },

  emit(event: string, payload: any, ackCallback?: (res: any) => void) {
    if (socket.connected) {
      socket.emit(event, payload, ackCallback);
    } else {
      console.warn(`[realtimeBus] Socket not connected yet. Waiting for connect event to emit "${event}"`);
      socket.once("connect", () => {
        socket.emit(event, payload, ackCallback);
      });
    }
  },
};
