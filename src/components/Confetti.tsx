"use client";

import { useMemo } from "react";

const COLORS = ["#825A6D", "#9C7589", "#F5C542", "#C7CBD1", "#CD8554", "#FFFFFF"];

export default function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.4,
        dur: 2.8 + Math.random() * 2.4,
        w: 5 + Math.random() * 7,
        h: 8 + Math.random() * 10,
        color: COLORS[i % COLORS.length],
      })),
    [count]
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.w,
            height: p.h,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
