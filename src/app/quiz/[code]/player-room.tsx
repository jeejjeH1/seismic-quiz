"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CountdownRing from "@/components/CountdownRing";
import TimerBar from "@/components/TimerBar";
import Confetti from "@/components/Confetti";
import SplashWord from "@/components/SplashWord";
import { getSocket } from "@/lib/socket";
import { drawResultCard } from "@/lib/result-card";
import type { LeaderboardEntry, PlayerInfo, QuestionPayload } from "@/types/quiz";

const OPTION_LABELS = ["A", "B", "C", "D"];
const OPTION_COLORS = ["#825A6D", "#9C7589", "#6B4959", "#B08CA0"];
const fmt = (n: number) => n.toLocaleString("en-US");

type Phase = "join" | "lobby" | "question" | "reveal" | "finished";

export default function PlayerRoom({ code }: { code: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("join");
  const [name, setName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [correctIndex, setCorrectIndex] = useState(-1);
  const [chosen, setChosen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    const nav = navigator as Navigator & { canShare?: (d: { files?: File[] }) => boolean };
    try {
      const probe = new File([new Blob(["x"])], "probe.png", { type: "image/png" });
      setCanShareFiles(!!nav.canShare?.({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
  }, []);

  useEffect(() => {
    setName(window.localStorage.getItem("sq_name") ?? "");
    setParticipantId(window.localStorage.getItem(`sq_pid_${code}`));
  }, [code]);

  useEffect(() => {
    const socket = getSocket();

    socket.on("new_question", (q: QuestionPayload) => {
      setQuestion(q);
      setChosen(null);
      setCorrectIndex(-1);
      setPhase("question");
    });

    socket.on("show_correct_answer", ({ correctIndex: ci }: { correctIndex: number }) => {
      setCorrectIndex(ci);
      setPhase("reveal");
    });

    socket.on("leaderboard_update", ({ entries: e }: { entries: LeaderboardEntry[] }) =>
      setEntries(e)
    );

    socket.on("players_update", ({ players: p }: { players: PlayerInfo[] }) => setPlayers(p));

    socket.on("quiz_finished", () => {
      setPhase("finished");
    });

    return () => {
      socket.off("new_question");
      socket.off("show_correct_answer");
      socket.off("leaderboard_update");
      socket.off("players_update");
      socket.off("quiz_finished");
    };
  }, []);

  const me = entries.find((e) => e.id === participantId) ?? null;
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);

  useEffect(() => {
    if (phase !== "finished" || !me || card) return;
    let alive = true;
    drawResultCard({
      name: window.localStorage.getItem("sq_name") || "Player",
      rank: me.rank,
      total: Math.max(me.rank, entries.length),
      score: me.score,
      code,
    })
      .then((b) => {
        if (!alive || !b) return;
        setCard({ url: URL.createObjectURL(b), blob: b });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [phase, me, entries.length, code, card]);

  const doJoin = useCallback(
    (playerName: string, existingId: string | null) => {
      if (joinedRef.current) return;
      joinedRef.current = true;
      setError(null);
      const socket = getSocket();
      socket.emit(
        "join_room",
        { code, name: playerName, participantId: existingId },
        (res: {
          ok: boolean;
          participantId?: string;
          state?: { phase: Phase };
          title?: string;
          error?: string;
        }) => {
          joinedRef.current = false;
          if (!res.ok) {
            setError(res.error ?? "Failed to join");
            return;
          }
          window.localStorage.setItem(`sq_pid_${code}`, res.participantId!);
          window.localStorage.setItem("sq_name", playerName);
          if (res.title) setQuizTitle(res.title);
          setParticipantId(res.participantId!);
          setPhase(res.state?.phase === "finished" ? "finished" : "lobby");
          socket.emit("sync_request");
        }
      );
    },
    [code]
  );

  // Re-join automatically after socket reconnects (no manual refresh needed)
  useEffect(() => {
    const socket = getSocket();
    const onConnect = () => {
      const pid = window.localStorage.getItem(`sq_pid_${code}`);
      const nm = window.localStorage.getItem("sq_name");
      if (pid && nm && participantId) {
        socket.emit("join_room", { code, name: nm, participantId: pid }, (res: { ok: boolean }) => {
          if (res.ok) socket.emit("sync_request");
        });
      }
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [code, participantId]);

  function pickOption(i: number) {
    if (phase !== "question" || chosen !== null || !question) return;
    setChosen(i);
    getSocket().emit(
      "submit_answer",
      { index: question.index, optionIndex: i },
      (res: { ok: boolean }) => {
        if (!res.ok) setChosen(null);
      }
    );
  }

  if (phase === "join") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="mb-3 inline-grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-extrabold"
          >
            S
          </Link>
          <h1 className="text-2xl font-extrabold">Join the match</h1>
          <p className="mt-2 text-sm text-muted">
            Room code:{" "}
            <span className="font-bold tracking-[0.35em] text-white" dir="ltr">
              {code}
            </span>
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const nm = name.trim();
            if (nm) doJoin(nm, participantId);
          }}
          className="card flex animate-pop flex-col gap-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Your display name</span>
            <input
              className="input text-center"
              placeholder="Nickname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              required
              autoFocus
            />
          </label>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full">
            Enter waiting room
          </button>
        </form>
      </main>
    );
  }

  async function shareResultCard() {
    if (!me || cardBusy) return;
    setCardBusy(true);
    setShareError(null);
    try {
      let blob = card?.blob;
      if (!blob) {
        blob = await drawResultCard({
          name: window.localStorage.getItem("sq_name") || "Player",
          rank: me.rank,
          total: Math.max(me.rank, entries.length),
          score: me.score,
          code,
        });
      }
      if (!blob) throw new Error("no blob");

      const file = new File([blob], `seismic-quiz-${code}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files?: File[] }) => boolean;
        share?: (d: { files?: File[]; title?: string; text?: string }) => Promise<void>;
      };

      if (canShareFiles && nav.share) {
        try {
          await nav.share({
            files: [file],
            title: "My Seismic Quiz result",
            text: `I finished #${me.rank} with ${fmt(me.score)} points!`,
          });
          return;
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setShareError("Could not create the card — please try again.");
    } finally {
      setCardBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-8">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="chip tracking-[0.3em]" dir="ltr">
            {code}
          </span>
          {quizTitle && (
            <span className="hidden truncate text-xs text-line sm:block">· {quizTitle}</span>
          )}
        </div>
        {me && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="chip">Rank {fmt(me.rank)}</span>
            <span className="chip !border-primary/50 font-bold tabular-nums !text-primary-light">
              {fmt(me.score)}
            </span>
          </div>
        )}
      </header>

      {phase === "lobby" && (
        <section className="card flex animate-fadeIn flex-col items-center gap-6 py-16 text-center">
          <h2 className="text-xl font-extrabold">Waiting room — waiting for the host…</h2>
          <p className="text-sm text-muted">The first question appears as soon as the match starts.</p>
          {players.length > 0 && (
            <div className="w-full max-w-lg">
              <p className="mb-3 text-xs text-line">
                Players here ({fmt(players.length)})
              </p>
              <ul className="flex max-h-44 flex-wrap justify-center gap-2 overflow-y-auto pl-1">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className={`chip ${
                      p.id === participantId ? "!border-primary/60 font-bold !text-primary-light" : ""
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${p.connected ? "bg-emerald-500" : "bg-line/50"}`}
                    />
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {(phase === "question" || phase === "reveal") && question && (
        <>
          <TimerBar
            deadline={question.deadline}
            timer={question.timer}
            resetKey={`${question.index}-${question.deadline}`}
          />
          <section className="animate-pop">
          <div className="card mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-xs text-line">
                Question {fmt(question.index + 1)} of {fmt(question.total)}
              </p>
              <h2 className="text-lg font-extrabold leading-8">{question.text}</h2>
            </div>
            <CountdownRing deadline={question.deadline} timer={question.timer} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {question.options.map((opt, i) => {
              const isChosen = chosen === i;
              const isCorrect = phase === "reveal" && i === correctIndex;
              const revealed = phase === "reveal";
              return (
                <button
                  key={i}
                  onClick={() => pickOption(i)}
                  disabled={revealed || chosen !== null}
                  className={`flex touch-manipulation items-center gap-3 rounded-xl border px-4 py-5 text-left text-base transition-all ${
                    isCorrect
                      ? "border-emerald-500 bg-emerald-500/15 font-bold"
                      : revealed && isChosen
                      ? "border-red-500 bg-red-500/15 opacity-80"
                      : revealed
                      ? "border-line/15 bg-surface opacity-50"
                      : isChosen
                      ? "scale-[0.98] border-primary bg-primary/20 ring-2 ring-white/60"
                      : "border-line/20 bg-surface transition hover:border-primary hover:bg-primary/10 active:scale-[0.97]"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold text-white ${
                      isCorrect ? "bg-emerald-500" : ""
                    }`}
                    style={
                      isCorrect
                        ? undefined
                        : { backgroundColor: isChosen ? "#825A6D" : OPTION_COLORS[i] }
                    }
                  >
                    {OPTION_LABELS[i]}
                  </span>
                  <span className="leading-6">{opt}</span>
                  {revealed && isChosen && (
                    <span className="ml-auto shrink-0 text-[11px] font-bold">
                      {isCorrect ? (
                        <span className="text-emerald-400">Correct!</span>
                      ) : (
                        <span className="text-red-300">Wrong</span>
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-xs text-line">
            {phase === "question"
              ? chosen !== null
                ? "Your answer is locked in — waiting for time to run out…"
                : "Pick an option — answering faster earns more points."
              : "The correct answer is shown; the leaderboard is updating."}
          </p>
        </section>
        </>
      )}

      {phase === "finished" && (
        <section className="flex animate-fadeIn flex-col items-center gap-5">
          <SplashWord text="GMIC" ms={2000} onDone={() => router.push(`/leaderboard/${code}`)} />
          {me && me.rank <= 3 && <Confetti />}
          <div className="card w-full max-w-md text-center">
            <h2 className="text-2xl font-extrabold">Match finished</h2>
            {me && (
              <p className="mt-2 text-sm text-muted">
                Your rank:{" "}
                <span className="font-extrabold text-primary-light">#{fmt(me.rank)}</span> with{" "}
                {fmt(me.score)} points
              </p>
            )}
            {me && me.rank <= 3 && (
              <p className="mt-1 text-sm font-bold text-[#F5C542]">Podium finish — well played!</p>
            )}
          </div>

          {card && (
            <img
              src={card.url}
              alt="Your result card"
              className="w-full max-w-xs rounded-2xl border border-line/20 shadow-2xl shadow-black/50"
            />
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button onClick={shareResultCard} disabled={cardBusy || !me} className="btn-primary !px-8">
              {cardBusy ? "Preparing…" : "Download card (PNG)"}
            </button>
            {canShareFiles && (
              <button onClick={shareResultCard} disabled={cardBusy || !me} className="btn-ghost">
                Share…
              </button>
            )}
            <Link href={`/leaderboard/${code}`} className="btn-ghost">
              Leaderboard
            </Link>
          </div>
          {shareError && <p className="text-xs text-red-300">{shareError}</p>}
          <Link href="/" className="btn-ghost !px-8">
            Home
          </Link>
        </section>
      )}
    </main>
  );
}
