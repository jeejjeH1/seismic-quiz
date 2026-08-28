"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import SplashWord from "@/components/SplashWord";
import { getSocket } from "@/lib/socket";
import { drawResultCard } from "@/lib/result-card";
import type { LeaderboardEntry } from "@/types/quiz";

const fmt = (n: number) => n.toLocaleString("en-US");

export default function PublicLeaderboard({ code }: { code: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);
  const [card, setCard] = useState<{ url: string; blob: Blob } | null>(null);
  const [cardBusy, setCardBusy] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.on("leaderboard_update", ({ entries: e }: { entries: LeaderboardEntry[] }) => {
      setEntries(e);
      setOk(true);
    });
    const watch = () =>
      socket.emit("watch_room", { code }, (res: { ok: boolean; title?: string }) => {
        setOk(res.ok);
        if (res.title) setTitle(res.title);
      });
    watch();
    socket.emit("leaderboard_request");
    socket.on("connect", watch);
    return () => {
      socket.off("leaderboard_update");
      socket.off("connect", watch);
    };
  }, [code]);

  const meId =
    typeof window !== "undefined" ? window.localStorage.getItem(`sq_pid_${code}`) : null;
  const me = meId ? entries.find((e) => e.id === meId) ?? null : null;

  async function downloadCard() {
    if (!me || cardBusy) return;
    setCardBusy(true);
    try {
      const blob = await drawResultCard({
        name: window.localStorage.getItem("sq_name") || me.name,
        rank: me.rank,
        total: Math.max(me.rank, entries.length),
        score: me.score,
        code,
      });
      if (blob) {
        setCard({ url: URL.createObjectURL(blob), blob });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `seismic-quiz-${code}.png`;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      /* ignore */
    } finally {
      setCardBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-6 py-10">
      <header className="mb-6 text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-extrabold">
          Live leaderboard
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          {title ? `${title} · ` : ""}Room{" "}
          <span className="font-bold tracking-[0.35em] text-primary-light" dir="ltr">
            {code}
          </span>{" "}
          — updates in real time after every answer
        </p>
        <Link href="/" className="mt-3 inline-block text-xs text-line transition hover:text-white">
          ← Home
        </Link>
      </header>

      {ok === false ? (
        <div className="card text-center text-sm text-muted">Room not found.</div>
      ) : (
        <>
          {entries.length >= 3 && (
            <div className="mb-6 grid grid-cols-3 items-end gap-3">
              {[1, 0, 2].map((slot) => {
                const e = entries[slot];
                if (!e) return <div key={slot} />;
                const heights = ["h-24", "h-[72px]", "h-14"];
                const bgs = ["bg-[#F5C542]/90", "bg-[#C7CBD1]/80", "bg-[#CD8554]/70"];
                return (
                  <div key={slot} className="flex animate-rise flex-col items-center gap-2 text-center">
                    <span className="max-w-full truncate text-xs font-bold">{e.name}</span>
                    <div
                      className={`grid w-full place-items-start justify-center rounded-t-2xl pt-2 ${bgs[slot]} ${heights[slot]}`}
                    >
                      <span className="text-[11px] font-extrabold tabular-nums text-black/70">
                        {fmt(e.score)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Leaderboard entries={entries} currentId={meId} />

          {me && (
            <section className="card mt-6 flex flex-col items-center gap-4 text-center">
              <p className="text-sm text-muted">
                <span className="font-bold text-white">{me.name}</span> — rank{" "}
                <span className="font-extrabold text-primary-light">#{fmt(me.rank)}</span> ·{" "}
                {fmt(me.score)} pts
              </p>
              <button onClick={downloadCard} disabled={cardBusy} className="btn-primary !px-8">
                {cardBusy ? "Preparing…" : "Get my result card (PNG)"}
              </button>
              {card && (
                <img
                  src={card.url}
                  alt="Your result card"
                  className="w-full max-w-xs rounded-2xl border border-line/20 shadow-2xl shadow-black/50"
                />
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
