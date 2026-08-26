"use client";

import { useEffect, useRef } from "react";
import type { LeaderboardEntry } from "@/types/quiz";

const MEDAL_COLORS = ["#F5C542", "#C7CBD1", "#CD8554"];
const fmt = (n: number) => n.toLocaleString("en-US");

function Medal({ rank }: { rank: number }) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold text-black/80"
      style={{ background: MEDAL_COLORS[rank - 1], boxShadow: `0 0 0 3px ${MEDAL_COLORS[rank - 1]}33` }}
    >
      {fmt(rank)}
    </span>
  );
}

export default function Leaderboard({
  entries,
  currentId,
}: {
  entries: LeaderboardEntry[];
  currentId?: string | null;
}) {
  const prevRanks = useRef<Map<string, number>>(new Map());
  const moves = new Map<string, number>();

  for (const e of entries) {
    const prev = prevRanks.current.get(e.id);
    if (prev !== undefined && prev !== e.rank) moves.set(e.id, prev - e.rank);
  }

  useEffect(() => {
    prevRanks.current = new Map(entries.map((e) => [e.id, e.rank]));
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="card text-center text-sm text-muted">
        No scores recorded yet.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {entries.map((e) => {
        const move = moves.get(e.id) ?? 0;
        const isCurrent = currentId === e.id;
        return (
          <li
            key={e.id}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
              move > 0
                ? "animate-rise"
                : move < 0
                ? "animate-fall"
                : "animate-fadeIn"
            } ${
              isCurrent
                ? "border-primary bg-primary/15 shadow-md shadow-primary/10"
                : "border-line/15 bg-surface"
            }`}
          >
            {e.rank <= 3 ? (
              <Medal rank={e.rank} />
            ) : (
              <span className="grid h-7 w-7 shrink-0 place-items-center text-xs font-bold text-line tabular-nums">
                {fmt(e.rank)}
              </span>
            )}

            <span className={`min-w-0 flex-1 truncate text-sm ${isCurrent ? "font-bold" : "font-semibold"}`}>
              {e.name}
              {isCurrent && <span className="ml-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold">You</span>}
            </span>

            <span className="text-sm font-extrabold tabular-nums text-primary-light">
              {fmt(e.score)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
