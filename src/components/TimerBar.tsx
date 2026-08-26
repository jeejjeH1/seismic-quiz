"use client";

import { useEffect, useState } from "react";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function stageColor(frac: number) {
  if (frac > 0.5) return "#22C55E";
  if (frac > 0.22) return "#F59E0B";
  return "#EF4444";
}

export default function TimerBar({
  deadline,
  timer,
  resetKey,
}: {
  deadline: number;
  timer: number;
  resetKey: string | number;
}) {
  const [frac, setFrac] = useState(() =>
    clamp01((deadline - Date.now()) / Math.max(1, timer * 1000))
  );

  useEffect(() => {
    setFrac(clamp01((deadline - Date.now()) / Math.max(1, timer * 1000)));
    const id = setInterval(() => {
      setFrac(clamp01((deadline - Date.now()) / Math.max(1, timer * 1000)));
    }, 100);
    return () => clearInterval(id);
  }, [deadline, timer, resetKey]);

  const color = stageColor(frac);

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1.5 bg-black/50">
      <div
        className="ml-auto h-full"
        style={{
          width: `${frac * 100}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: "width .12s linear, background .3s",
        }}
      />
    </div>
  );
}
