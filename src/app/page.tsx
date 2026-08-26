"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function JoinBox() {
  const router = useRouter();
  const [code, setCode] = useState("");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("code");
    if (fromUrl) {
      setCode(fromUrl.replace(/\D/g, "").slice(0, 6));
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const c = code.trim().toUpperCase();
        if (c.length > 0) router.push(`/quiz/${encodeURIComponent(c)}`);
      }}
      className="flex w-full max-w-sm items-center gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="6-digit room code"
        inputMode="numeric"
        className="input text-center tracking-[0.4em]"
      />
      <button type="submit" className="btn-primary whitespace-nowrap">
        Join
      </button>
    </form>
  );
}

const features = [
  {
    title: "Host-designed questions",
    body: "Build multiple-choice questions with a separate timer for each one — fully dynamic.",
  },
  {
    title: "Real-time gameplay",
    body: "Hundreds of players at once over WebSockets; answers are recorded and scored instantly.",
  },
  {
    title: "Live leaderboard",
    body: "Ranks refresh after every question with rank-change animation and medals for the top three.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-extrabold">S</span>
          <span className="text-lg font-extrabold tracking-tight">Seismic Quiz</span>
        </div>
        <Link href="/dashboard" className="btn-ghost !py-2">
          Host panel
        </Link>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-16 text-center animate-fadeIn">
        <span className="chip border-primary/40 !text-primary-light">Real-time Quiz Platform</span>
        <h1 className="max-w-2xl text-4xl font-extrabold leading-tight md:text-6xl md:leading-tight">
          Host a live quiz.
          <br />
          <span className="text-primary-light">Everyone plays together.</span>
        </h1>
        <p className="max-w-xl text-muted">
          The host designs the questions, players join with a room code, and the leaderboard
          updates live after every single question.
        </p>

        <JoinBox />
      </section>

      <footer className="border-t border-line/15 py-5 text-center text-xs text-line">
        Seismic Quiz — Minimal · High Contrast · Real-time
      </footer>
    </main>
  );
}
