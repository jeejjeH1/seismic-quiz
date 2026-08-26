"use client";

import { io, type Socket } from "socket.io-client";

const BASE = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

declare global {
  interface Window {
    __sqSocket?: Socket;
  }
}

export function getSocket(): Socket {
  if (typeof window === "undefined") throw new Error("socket client is browser-only");
  if (!window.__sqSocket) {
    window.__sqSocket = io(BASE, { transports: ["websocket", "polling"] });
  }
  return window.__sqSocket;
}
