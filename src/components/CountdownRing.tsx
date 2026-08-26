"use client";

import { useEffect, useRef, useState } from "react";

export default function CountdownRing({
  deadline,
  timer,
}: {
  deadline: number;
  timer: number;
}) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, (deadline - Date.now()) / 1000)
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const id = setInterval(() => {
      setRemaining(Math.max(0, (deadline - Date.now()) / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [deadline]);

  const frac = Math.min(1, Math.max(0, remaining / Math.max(1, timer)));
  const color = frac > 0.5 ? "#22C55E" : frac > 0.22 ? "#F59E0B" : "#EF4444";

  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#282826" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset .12s linear, stroke .3s" }}
        />
      </svg>
      <span
        className="text-2xl font-extrabold tabular-nums"
        style={{ color }}
      >
        {Math.ceil(remaining).toLocaleString("en-US")}
      </span>
    </div>
  );
}
