import { io, Socket } from "socket.io-client";

const socketUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? undefined : "http://localhost:3001");
export const realtimeSocket: Socket = io(socketUrl, {
  autoConnect: true,
  transports: ["websocket"],
  withCredentials: true
});

export default realtimeSocket;
