import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (serverUrl?: string): Socket => {
  if (!socket) {
    const url = serverUrl || process.env.NEXT_PUBLIC_SIGNALING_SERVER || 'http://localhost:4000';
    socket = io(url, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
