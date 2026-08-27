"use client";

import { io, type Socket } from "socket.io-client";

declare global {
  interface Window {
    __sqSocket?: Socket;
  }
}

export function getSocket(): Socket {
  if (typeof window === "undefined") throw new Error("socket client is browser-only");
  if (!window.__sqSocket) {
    const env = (process.env.NEXT_PUBLIC_SOCKET_URL || "").trim();
    const base = env || window.location.origin;
    window.__sqSocket = io(base, { transports: ["websocket", "polling"] });
  }
  return window.__sqSocket;
}
