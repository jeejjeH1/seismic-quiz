import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { LocalRedis } from "./redis-local.mjs";

const g = globalThis;
const prisma = g.__sqPrisma || (g.__sqPrisma = new PrismaClient());

let redis;
if ((process.env.REDIS_URL || "").trim()) {
  redis =
    g.__sqRedis ||
    (g.__sqRedis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 }));
  redis.on("error", (err) => console.error("[redis]", err.message));
} else {
  console.warn(
    "[redis] REDIS_URL not set — using in-memory store (development only)"
  );
  redis = new LocalRedis();
}

const timers = new Map();

const ROOM = (code) => `sq:room:${code}`;
const K = {
  state: (code) => `sq:quiz:${code}:state`,
  players: (code) => `sq:quiz:${code}:players`,
  lb: (code) => `sq:quiz:${code}:lb`,
  answers: (code, i) => `sq:quiz:${code}:${i}:answers`,
};

const normalizeCode = (raw) => String(raw ?? "").trim().toUpperCase();

async function getState(code) {
  const s = await redis.hgetall(K.state(code));
  return {
    phase: s.phase || "lobby",
    currentIndex: Number(s.currentIndex ?? -1),
    startedAt: Number(s.startedAt || 0),
    deadline: Number(s.deadline || 0),
    correctIndex: Number(s.correctIndex ?? -1),
  };
}

async function playersOf(code) {
  const raw = await redis.hgetall(K.players(code));
  return Object.entries(raw).map(([id, j]) => {
    try {
      return { id, ...JSON.parse(j) };
    } catch {
      return { id, name: "Player", score: 0, connected: false };
    }
  });
}

async function leaderboardOf(code) {
  const flat = await redis.zrevrange(K.lb(code), 0, -1, "WITHSCORES");
  const players = await playersOf(code);
  const pmap = new Map(players.map((p) => [p.id, p]));
  const entries = [];
  for (let i = 0; i < flat.length; i += 2) {
    const id = flat[i];
    entries.push({
      id,
      rank: entries.length + 1,
      name: pmap.get(id)?.name ?? "Player",
      score: Math.round(Number(flat[i + 1]) || 0),
    });
  }
  return entries;
}

async function pushLeaderboard(io, code) {
  const entries = await leaderboardOf(code);
  io.to(ROOM(code)).emit("leaderboard_update", { entries });
}

async function broadcastStats(io, code) {
  try {
    const st = await getState(code);
    const idx = st.currentIndex >= 0 ? st.currentIndex : 0;
    const [answered, players] = await Promise.all([redis.hlen(K.answers(code, idx)), playersOf(code)]);
    io.to(ROOM(code)).emit("stats_update", {
      answered: Number(answered) || 0,
      total: players.length,
    });
  } catch (e) {
    console.error("[stats]", e);
  }
}

async function beginQuestion(io, code, index) {
  const quiz = await prisma.quiz.findUnique({
    where: { code },
    include: { _count: { select: { questions: true } } },
  });
  if (!quiz) return;
  const q = await prisma.question.findFirst({ where: { quizId: quiz.id, order: index } });
  if (!q) return finishQuiz(io, code);

  const startedAt = Date.now();
  const deadline = startedAt + q.timer * 1000;

  clearTimeout(timers.get(code));
  await redis.del(K.answers(code, index));
  await redis.hmset(K.state(code), {
    phase: "question",
    currentIndex: String(index),
    startedAt: String(startedAt),
    deadline: String(deadline),
    correctIndex: "-1",
  });

  io.to(ROOM(code)).emit("new_question", {
    index,
    total: quiz._count.questions,
    text: q.text,
    options: q.options,
    timer: q.timer,
    startedAt,
    deadline,
  });
  await broadcastStats(io, code);

  timers.set(
    code,
    setTimeout(() => {
      revealAnswer(io, code).catch((e) => console.error("[reveal]", e));
    }, q.timer * 1000 + 400)
  );
}

function parseAnswers(raw) {
  const entries = [];
  for (const [pid, v] of Object.entries(raw)) {
    const sep = String(v).lastIndexOf(":");
    if (sep < 0) continue;
    const opt = Number(String(v).slice(0, sep));
    const ts = Number(String(v).slice(sep + 1)) || Date.now();
    entries.push({ id: pid, opt, ts });
  }
  return entries;
}

async function revealAnswer(io, code) {
  const st = await getState(code);
  if (st.phase !== "question") return;
  clearTimeout(timers.get(code));

  const quiz = await prisma.quiz.findUnique({ where: { code } });
  if (!quiz) return;
  const q = await prisma.question.findFirst({
    where: { quizId: quiz.id, order: st.currentIndex },
  });
  if (!q) return;

  const durationMs = Math.max(1, st.deadline - st.startedAt);
  const raw = await redis.hgetall(K.answers(code, st.currentIndex));
  const entries = parseAnswers(raw);
  const distribution = q.options.map(() => 0);
  for (const en of entries) {
    if (en.opt >= 0 && en.opt < distribution.length) distribution[en.opt] += 1;
  }
  const updates = [];
  for (const { id: pid, opt, ts } of entries) {
    const correct = opt === q.correctIndex;
    const frac = Math.max(0, st.deadline - ts) / durationMs;
    updates.push({ id: pid, opt, correct, points: correct ? Math.round(1000 * Math.min(1, Math.max(0, frac))) : 0 });
  }

  const pmap = new Map((await playersOf(code)).map((p) => [p.id, p]));

  await Promise.all(
    updates
      .filter((u) => pmap.has(u.id))
      .map(async (u) => {
        if (u.points > 0) {
          await redis.zincrby(K.lb(code), u.points, u.id);
        }
        const row = await prisma.participant.findUnique({ where: { id: u.id } }).catch(() => null);
        if (!row) return;
        let existing = {};
        try {
          existing = row.answers && typeof row.answers === "object" ? row.answers : {};
        } catch {}
        await prisma.participant
          .update({
            where: { id: u.id },
            data: {
              score: { increment: u.points },
              answers: { ...existing, [String(st.currentIndex)]: { choice: u.opt, correct: u.correct, points: u.points } },
            },
          })
          .catch(() => {});
      })
  );

  await redis.hmset(K.state(code), { phase: "reveal", correctIndex: String(q.correctIndex) });

  io.to(ROOM(code)).emit("show_correct_answer", {
    index: st.currentIndex,
    correctIndex: q.correctIndex,
    distribution,
  });
  await pushLeaderboard(io, code);
  await broadcastStats(io, code);
}

async function finishQuiz(io, code) {
  clearTimeout(timers.get(code));
  await redis.hmset(K.state(code), { phase: "finished" });
  await prisma.quiz.updateMany({ where: { code }, data: { isActive: false } }).catch(() => {});
  await pushLeaderboard(io, code);
  const entries = await leaderboardOf(code);
  io.to(ROOM(code)).emit("quiz_finished", { entries });
}

async function verifyHost(code, hostToken) {
  const quiz = await prisma.quiz.findUnique({ where: { code } });
  if (!quiz || !hostToken || quiz.hostToken !== String(hostToken)) return null;
  return quiz;
}

export function attachGameServer(io) {
  io.on("connection", (socket) => {
    socket.data.code = null;
    socket.data.participantId = null;
    socket.data.isHost = false;

    socket.on("join_room", async ({ code, name, participantId } = {}, cb = () => {}) => {
      try {
        code = normalizeCode(code);
        const quiz = await prisma.quiz.findUnique({ where: { code } });
        if (!quiz) return cb({ ok: false, error: "Room not found" });

        await socket.join(ROOM(code));
        socket.data.code = code;

        let pid = null;
        const existingRaw = participantId ? await redis.hget(K.players(code), participantId) : null;
        if (participantId && existingRaw) {
          pid = String(participantId);
          const p = JSON.parse(existingRaw);
          await redis.hset(K.players(code), pid, JSON.stringify({ ...p, connected: true }));
        } else {
          const nm = String(name ?? "").trim().slice(0, 24) || "Guest";
          const created = await prisma.participant.create({
            data: { quizId: quiz.id, name: nm, socketId: socket.id },
          });
          pid = created.id;
          await redis.hset(K.players(code), pid, JSON.stringify({ name: nm, score: 0, connected: true }));
          await redis.zadd(K.lb(code), 0, pid);
        }
        socket.data.participantId = pid;

        cb({ ok: true, participantId: pid, state: await getState(code), title: quiz.title });
        io.to(ROOM(code)).emit("players_update", {
          players: (await playersOf(code)).map(({ id, name, score, connected }) => ({ id, name, score, connected: connected !== false })),
        });
        await pushLeaderboard(io, code);
        await broadcastStats(io, code);
      } catch (e) {
        console.error("[join_room]", e);
        cb({ ok: false, error: "Failed to join room" });
      }
    });

    socket.on("watch_room", async ({ code } = {}, cb = () => {}) => {
      try {
        code = normalizeCode(code);
        const quiz = await prisma.quiz.findUnique({ where: { code } });
        if (!quiz) return cb({ ok: false, error: "Room not found" });
        await socket.join(ROOM(code));
        socket.data.code = code;
        cb({ ok: true, state: await getState(code), title: quiz.title });
        io.to(ROOM(code)).emit("players_update", {
          players: (await playersOf(code)).map(({ id, name, score, connected }) => ({ id, name, score, connected: connected !== false })),
        });
        await pushLeaderboard(io, code);
        await broadcastStats(io, code);
      } catch (e) {
        console.error("[watch_room]", e);
        cb({ ok: false, error: "Failed to watch room" });
      }
    });

    socket.on("host_auth", async ({ code, hostToken } = {}, cb = () => {}) => {
      try {
        code = normalizeCode(code);
        const quiz = await verifyHost(code, hostToken);
        if (!quiz) return cb({ ok: false, error: "Host verification failed" });
        await socket.join(ROOM(code));
        socket.data.code = code;
        socket.data.isHost = true;
        cb({ ok: true, state: await getState(code), title: quiz.title });
        io.to(ROOM(code)).emit("players_update", {
          players: (await playersOf(code)).map(({ id, name, score, connected }) => ({ id, name, score, connected: connected !== false })),
        });
        await pushLeaderboard(io, code);
        await broadcastStats(io, code);
      } catch (e) {
        console.error("[host_auth]", e);
        cb({ ok: false, error: "Host authentication error" });
      }
    });

    socket.on("submit_answer", async ({ index, optionIndex } = {}, cb = () => {}) => {
      try {
        const code = socket.data.code;
        const pid = socket.data.participantId;
        if (!code || !pid) return cb({ ok: false });
        const st = await getState(code);
        if (st.phase !== "question" || Number(index) !== st.currentIndex || Date.now() > st.deadline) {
          return cb({ ok: false, error: "Time is up" });
        }
        await redis.hset(K.answers(code, st.currentIndex), pid, `${Number(optionIndex)}:${Date.now()}`);
        cb({ ok: true });
        await broadcastStats(io, code);
      } catch (e) {
        console.error("[submit_answer]", e);
        cb({ ok: false });
      }
    });

    socket.on("host_start_quiz", async ({ hostToken } = {}, cb = () => {}) => {
      try {
        const code = socket.data.code;
        if (!code || !socket.data.isHost) return cb({ ok: false, error: "Host only" });
        const quiz = await verifyHost(code, hostToken);
        if (!quiz) return cb({ ok: false, error: "Access denied" });
        const count = await prisma.question.count({ where: { quizId: quiz.id } });
        if (count === 0) return cb({ ok: false, error: "Quiz has no questions" });
        await prisma.quiz.update({ where: { id: quiz.id }, data: { isActive: true } });
        cb({ ok: true });
        await beginQuestion(io, code, 0);
      } catch (e) {
        console.error("[start]", e);
        cb({ ok: false, error: "Failed to start" });
      }
    });

    socket.on("host_reveal_answer", async ({ hostToken } = {}, cb = () => {}) => {
      try {
        const code = socket.data.code;
        if (!code || !socket.data.isHost) return cb({ ok: false, error: "Host only" });
        const quiz = await verifyHost(code, hostToken);
        if (!quiz) return cb({ ok: false, error: "Access denied" });
        await revealAnswer(io, code);
        cb({ ok: true });
      } catch (e) {
        console.error("[reveal_host]", e);
        cb({ ok: false, error: "Failed to reveal answer" });
      }
    });

    socket.on("host_next_question", async ({ hostToken } = {}, cb = () => {}) => {
      try {
        const code = socket.data.code;
        if (!code || !socket.data.isHost) return cb({ ok: false, error: "Host only" });
        const quiz = await verifyHost(code, hostToken);
        if (!quiz) return cb({ ok: false, error: "Access denied" });
        const st = await getState(code);
        const nextIndex = st.currentIndex + 1;
        const count = await prisma.question.count({ where: { quizId: quiz.id } });
        cb({ ok: true });
        if (nextIndex >= count) await finishQuiz(io, code);
        else await beginQuestion(io, code, nextIndex);
      } catch (e) {
        console.error("[next]", e);
        cb({ ok: false, error: "Failed to advance" });
      }
    });

    socket.on("leaderboard_request", async (_payload = {}, cb = () => {}) => {
      try {
        const code = socket.data.code;
        if (!code) return;
        const entries = await leaderboardOf(code);
        cb({ entries });
        socket.emit("leaderboard_update", { entries });
      } catch (e) {
        console.error("[lb_request]", e);
      }
    });

    socket.on("sync_request", async () => {
      try {
        const code = socket.data.code;
        if (!code) return;
        const st = await getState(code);
        if (st.phase === "question" || st.phase === "reveal") {
          const quiz = await prisma.quiz.findUnique({
            where: { code },
            include: { _count: { select: { questions: true } } },
          });
          if (!quiz) return;
          const q = await prisma.question.findFirst({ where: { quizId: quiz.id, order: st.currentIndex } });
          if (!q) return;
          socket.emit("new_question", {
            index: st.currentIndex,
            total: quiz._count.questions,
            text: q.text,
            options: q.options,
            timer: q.timer,
            startedAt: st.startedAt,
            deadline: st.deadline,
          });
          if (st.phase === "reveal") {
            const raw = await redis.hgetall(K.answers(code, st.currentIndex));
            const distribution = q.options.map(() => 0);
            for (const en of parseAnswers(raw)) {
              if (en.opt >= 0 && en.opt < distribution.length) distribution[en.opt] += 1;
            }
            socket.emit("show_correct_answer", {
              index: st.currentIndex,
              correctIndex: st.correctIndex,
              distribution,
            });
          }
        }
        if (st.phase === "finished") {
          const finishedEntries = await leaderboardOf(code);
          socket.emit("leaderboard_update", { entries: finishedEntries });
          socket.emit("quiz_finished", { entries: finishedEntries });
        }
      } catch (e) {
        console.error("[sync]", e);
      }
    });

    socket.on("disconnect", async () => {
      try {
        const code = socket.data.code;
        const pid = socket.data.participantId;
        if (!code || !pid) return;
        const raw = await redis.hget(K.players(code), pid);
        if (raw) {
          const p = JSON.parse(raw);
          await redis.hset(K.players(code), pid, JSON.stringify({ ...p, connected: false }));
        }
        io.to(ROOM(code)).emit("players_update", {
          players: (await playersOf(code)).map(({ id, name, score, connected }) => ({ id, name, score, connected: connected !== false })),
        });
      } catch (e) {
        console.error("[disconnect]", e);
      }
    });
  });
}
