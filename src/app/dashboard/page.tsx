"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const fmt = (n: number) => n.toLocaleString("en-US");

interface QuizEntry {
  id: string;
  title: string;
  code: string;
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [quizzes, setQuizzes] = useState<QuizEntry[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(window.localStorage.getItem("sq_host_name"));
    setQuizzes(readJson<QuizEntry[]>("sq_my_quizzes", []));
  }, []);

  const saveName = useCallback((value: string) => {
    const v = value.trim().slice(0, 60);
    if (!v) return;
    window.localStorage.setItem("sq_host_name", v);
    setName(v);
  }, []);

  async function createQuiz(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, hostName: name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create quiz");

      const q = data.quiz as QuizEntry & { hostToken: string };
      window.localStorage.setItem(`sq_tok_${q.id}`, q.hostToken);
      const list = readJson<QuizEntry[]>("sq_my_quizzes", []);
      window.localStorage.setItem(
        "sq_my_quizzes",
        JSON.stringify([{ id: q.id, title: q.title, code: q.code }, ...list])
      );
      router.push(`/dashboard/${q.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Host panel</h1>
          {name && <p className="mt-1 text-sm text-muted">Hosting as {name}</p>}
        </div>
        <Link href="/" className="btn-ghost !py-2">Home</Link>
      </header>

      {!name ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveName(nameInput);
          }}
          className="card mx-auto flex max-w-md animate-pop flex-col gap-4 text-center"
        >
          <h2 className="text-lg font-extrabold">What&apos;s your name, host?</h2>
          <p className="text-sm text-muted">
            No account needed — your name is saved on this device.
          </p>
          <input
            className="input text-center"
            placeholder="Display name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={60}
            required
            autoFocus
          />
          <button type="submit" className="btn-primary w-full">Continue</button>
        </form>
      ) : (
        <>
          <form onSubmit={createQuiz} className="card flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1.5 block text-xs text-muted">New quiz title</span>
              <input
                className="input"
                placeholder="e.g. Autumn general knowledge contest"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
            </label>
            <button type="submit" className="btn-primary sm:w-40" disabled={busy}>
              {busy ? "…" : "+ Create quiz"}
            </button>
            {error && <p className="text-xs text-red-300">{error}</p>}
          </form>

          <section className="mt-10">
            <h2 className="mb-4 text-sm font-bold text-line">
              Your quizzes ({fmt(quizzes.length)}) — stored on this device
            </h2>

            {quizzes.length === 0 ? (
              <div className="card text-center text-muted">
                No quizzes yet — create your first match with the form above.
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {quizzes.map((q) => (
                  <li key={q.id} className="card flex flex-col gap-3 animate-fadeIn">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold leading-7">{q.title}</h3>
                      <span className="chip tracking-[0.25em]" dir="ltr">{q.code}</span>
                    </div>
                    <div className="mt-auto flex gap-2 pt-1">
                      <Link href={`/dashboard/${q.id}`} className="btn-primary flex-1 !py-2 text-xs">
                        Edit questions
                      </Link>
                      <Link href={`/host/${q.code}`} className="btn-ghost flex-1 !py-2 text-xs">
                        Host room
                      </Link>
                      <Link
                        href={`/leaderboard/${q.code}`}
                        className="btn-ghost !px-3 !py-2 text-xs"
                        title="Public live leaderboard"
                      >
                        Leaderboard
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
