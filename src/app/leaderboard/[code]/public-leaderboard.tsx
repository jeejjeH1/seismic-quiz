"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Leaderboard from "@/components/Leaderboard";
import { getSocket } from "@/lib/socket";
import type { LeaderboardEntry } from "@/types/quiz";

const fmt = (n: number) => n.toLocaleString("en-US");

export default function PublicLeaderboard({ code }: { code: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.on("leaderboard_update", ({ entries: e }: { entries: LeaderboardEntry[] }) => {
      setEntries(e);
      setOk(true);
    });
    socket.emit(
      "watch_room",
      { code },
      (res: { ok: boolean; title?: string }) => {
        setOk(res.ok);
        if (res.title) setTitle(res.title);
      }
    );
    socket.emit("leaderboard_request");
    return () => {
      socket.off("leaderboard_update");
    };
  }, [code]);

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
          <Leaderboard entries={entries} />
        </>
      )}
    </main>
  );
}
