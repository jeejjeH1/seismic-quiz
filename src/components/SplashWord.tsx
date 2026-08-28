"use client";

import { useEffect, useState } from "react";

export default function SplashWord({
  text = "GMIC",
  ms = 2000,
  onDone,
}: {
  text?: string;
  ms?: number;
  onDone?: () => void;
}) {
  const [fade, setFade] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), Math.max(0, ms - 450));
    const t2 = setTimeout(() => {
      setGone(true);
      onDone?.();
    }, ms);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]);

  if (gone) return null;

  return (
    <div className={`splash-wrap ${fade ? "splash-fadeout" : ""}`}>
      <div className="flex items-end justify-center">
        {text.split("").map((ch, i) => (
          <span key={i} className="splash-letter" style={{ animationDelay: `${i * 95}ms` }}>
            {ch}
          </span>
        ))}
      </div>
      <span className="splash-sub">match finished</span>
    </div>
  );
}
