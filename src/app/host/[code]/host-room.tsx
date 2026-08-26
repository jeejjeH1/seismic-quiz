"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CountdownRing from "@/components/CountdownRing";
import TimerBar from "@/components/TimerBar";
import Leaderboard from "@/components/Leaderboard";
import SplashWord from "@/components/SplashWord";
import { getSocket } from "@/lib/socket";
import type { LeaderboardEntry, QuestionPayload, StatsPayload } from "@/types/quiz";

const OPTION_LABELS = ["A", "B", "C", "D"];
const fmt = (n: number) => n.toLocaleString("en-US");

type Phase = "connecting" | "lobby" | "question" | "reveal" | "finished";

export default function HostRoom({
  quizId,
  code,
  hostToken,
  title,
}: {
  quizId: string;
  code: string;
  hostToken: string;
  title: string;
}) {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [question, setQuestion] = useState<QuestionPayload | null>(null);
  const [correctIndex, setCorrectIndex] = useState<number>(-1);
  const [distribution, setDistribution] = useState<number[]>([]);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<StatsPayload>({ answered: 0, total: 0 });
  const [online, setOnline] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [exporting, setExporting] = useState(false);

  const hostEmit = useCallback(
    (event: string) => {
      const socket = getSocket();
      setBusy(true);
      setError(null);
      socket.emit(event, { hostToken }, (res: { ok: boolean; error?: string }) => {
        setBusy(false);
        if (!res?.ok && res?.error) setError(res.error);
      });
    },
    [hostToken]
  );

  useEffect(() => {
    const socket = getSocket();

    socket.on("new_question", (q: QuestionPayload) => {
      setQuestion(q);
      setCorrectIndex(-1);
      setDistribution([]);
      setStats({ answered: 0, total: 0 });
      setPhase("question");
    });

    socket.on(
      "show_correct_answer",
      ({ correctIndex: ci, distribution: dist }: { correctIndex: number; distribution?: number[] }) => {
        setCorrectIndex(ci);
        setDistribution(dist ?? []);
        setPhase("reveal");
      }
    );

    socket.on("leaderboard_update", ({ entries: e }: { entries: LeaderboardEntry[] }) =>
      setEntries(e)
    );

    socket.on("stats_update", (s: StatsPayload) => setStats(s));

    socket.on("players_update", ({ players }: { players: unknown[] }) => setOnline(players.length));

    socket.on("quiz_finished", ({ entries: e }: { entries: LeaderboardEntry[] }) => {
      setEntries(e);
      setQuestion(null);
      setPhase("finished");
    });

    socket.emit(
      "host_auth",
      { code, hostToken },
      (res: { ok: boolean; state?: { phase: Phase }; error?: string }) => {
        if (!res.ok) {
          setError(res.error ?? "Connection failed");
          return;
        }
        setPhase(res.state?.phase === "finished" ? "finished" : "lobby");
        socket.emit("sync_request");
      }
    );

    return () => {
      socket.off("new_question");
      socket.off("show_correct_answer");
      socket.off("leaderboard_update");
      socket.off("stats_update");
      socket.off("players_update");
      socket.off("quiz_finished");
    };
  }, [code, hostToken]);

  const totalQ = question?.total ?? 0;
  const answeredPct = Math.min(
    100,
    Math.round((stats.answered / Math.max(1, Math.max(stats.total, online))) * 100)
  );

  const inviteUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/?code=${code}`
      : `/?code=${code}`;

  function copyInvite() {
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
    });
  }

  async function shareInvite() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: "Seismic Quiz", text: `Join my quiz! Room code ${code}`, url: inviteUrl });
        return;
      } catch {}
    }
    copyInvite();
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/export?t=${encodeURIComponent(hostToken)}`);
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `results-${code}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export CSV");
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="sticky top-0 z-40 -mx-6 mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line/10 bg-ink/85 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="btn-ghost !px-3 !py-2 text-xs">Exit</Link>
          <h1 className="text-lg font-extrabold">{title}</h1>
          <span className="chip tracking-[0.35em]" dir="ltr">{code}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip">Online: {fmt(online)}</span>
          <span className={`chip ${phase === "question" ? "!border-primary/50 !text-primary-light" : ""}`}>
            {phase === "connecting" && "Connecting…"}
            {phase === "lobby" && "Ready to start"}
            {phase === "question" && `Question ${fmt((question?.index ?? 0) + 1)} of ${fmt(totalQ)}`}
            {phase === "reveal" && "Answer revealed"}
            {phase === "finished" && "Finished"}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="flex flex-col gap-5">
          {error && (
            <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">{error}</p>
          )}

          {(phase === "question" || phase === "reveal") && question && (
            <>
              <TimerBar
                deadline={question.deadline}
                timer={question.timer}
                resetKey={`${question.index}-${question.deadline}`}
              />
              <div className="card animate-pop">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="mb-2 text-xs text-line">
                    Question {fmt((question.index ?? 0) + 1)} of {fmt(totalQ)}
                  </p>
                  <h2 className="text-xl font-extrabold leading-9">{question.text}</h2>
                </div>
                <CountdownRing deadline={question.deadline} timer={question.timer} />
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {question.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
                      phase === "reveal" && correctIndex === i
                        ? "border-emerald-500 bg-emerald-500/15 font-bold text-white"
                        : phase === "reveal"
                        ? "border-line/15 bg-surface opacity-60"
                        : "border-line/20 bg-surface"
                    }`}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-primary/25 text-xs font-bold text-primary-light">
                      {OPTION_LABELS[i]}
                    </span>
                    {opt}
                    {phase === "reveal" && correctIndex === i && (
                      <span className="ml-auto text-xs font-bold text-emerald-400">Correct answer</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Answers received</span>
                  <span className="tabular-nums">
                    {fmt(stats.answered)} / {fmt(Math.max(stats.total, online))}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${answeredPct}%` }}
                  />
                </div>
              </div>

              {phase === "reveal" && distribution.length > 0 && (
                <div className="mt-6 border-t border-line/10 pt-4">
                  <p className="mb-3 text-xs font-bold text-line">Answer distribution</p>
                  <div className="flex flex-col gap-2">
                    {question.options.map((_, i) => {
                      const count = distribution[i] ?? 0;
                      const total = distribution.reduce((a, b) => a + b, 0);
                      const pct = total ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span
                            className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold ${
                              correctIndex === i ? "bg-emerald-500 text-white" : "bg-primary/25 text-primary-light"
                            }`}
                          >
                            {OPTION_LABELS[i]}
                          </span>
                          <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-ink">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                correctIndex === i ? "bg-emerald-500" : "bg-primary/70"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-20 shrink-0 text-left text-xs tabular-nums text-muted">
                            {fmt(count)} · {fmt(pct)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            </>
          )}

          {phase === "lobby" && (
            <div className="card flex flex-col items-center gap-4 py-14 text-center animate-fadeIn">
              <p className="text-sm text-muted">Players join with this room code:</p>
              <p className="rounded-2xl border border-primary/40 bg-primary/10 px-10 py-4 text-4xl font-extrabold tracking-[0.45em] text-white" dir="ltr">
                {code}
              </p>
              <p className="text-xs text-line">{fmt(online)} player(s) online</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button onClick={copyInvite} className="btn-ghost !py-2 text-xs">
                  {copiedInvite ? "Link copied!" : "Copy invite link"}
                </button>
                <button onClick={shareInvite} className="btn-primary !py-2 text-xs">
                  Share invite
                </button>
              </div>
              <button onClick={() => hostEmit("host_start_quiz")} disabled={busy || online === 0} className="btn-primary mt-2 !px-10">
                Start match
              </button>
            </div>
          )}

          {phase === "finished" && (
            <div className="card py-12 text-center animate-fadeIn">
              <SplashWord text="GMIC" ms={2000} />
              <h2 className="mb-1 text-2xl font-extrabold">Match finished</h2>
              <p className="mb-8 text-sm text-muted">Final scores are recorded on the leaderboard.</p>
              <div className="mx-auto grid max-w-sm grid-cols-3 items-end gap-3">
                {[1, 0, 2].map((slot) => {
                  const e = entries[slot];
                  if (!e) return <div key={slot} />;
                  const h = slot === 0 ? "h-24" : slot === 1 ? "h-[72px]" : "h-14";
                  const bg = slot === 0 ? "bg-[#F5C542]/90" : slot === 1 ? "bg-[#C7CBD1]/80" : "bg-[#CD8554]/70";
                  return (
                    <div key={slot} className="flex flex-col items-center gap-2">
                      <span className="max-w-full truncate text-xs font-bold">{e.name}</span>
                      <div className={`w-full rounded-t-xl ${bg} ${h}`} />
                      <span className="text-[10px] tabular-nums text-muted">{fmt(e.score)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link href={`/leaderboard/${code}`} className="btn-primary">
                  Go to leaderboard
                </Link>
                <button onClick={exportCsv} disabled={exporting} className="btn-ghost">
                  {exporting ? "Preparing…" : "Export results (CSV)"}
                </button>
                <button onClick={() => hostEmit("host_start_quiz")} disabled={busy} className="btn-ghost">
                  Run again
                </button>
              </div>
            </div>
          )}

          {(phase === "question" || phase === "reveal") && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => hostEmit("host_reveal_answer")}
                disabled={busy || phase !== "question"}
                className="btn-ghost"
              >
                Reveal answer
              </button>
              <button
                onClick={() => hostEmit("host_next_question")}
                disabled={busy || phase !== "reveal"}
                className="btn-primary"
              >
                Next question
              </button>
            </div>
          )}
        </section>

        <aside>
          <h3 className="mb-3 flex items-center justify-between text-sm font-bold text-line">
            Live leaderboard
            <Link href={`/leaderboard/${code}`} className="text-[11px] font-normal text-primary-light hover:underline">
              Public page ↗
            </Link>
          </h3>
          <Leaderboard entries={entries} />
        </aside>
      </div>
    </main>
  );
}
