import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { attachGameServer } from "./src/game-server.mjs";

const app = express();
app.disable("x-powered-by");
app.get("/", (_req, res) =>
  res.json({ ok: true, service: "seismic-quiz-socket", time: Date.now() })
);

const allowed = String(process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: allowed, methods: ["GET", "POST"] },
  pingTimeout: 30000,
});

attachGameServer(io);

const port = process.env.PORT || 4000;
httpServer.listen(port, () => {
  console.log(`> Seismic socket server on :${port} [cors: ${allowed.join(", ")}]`);
});
