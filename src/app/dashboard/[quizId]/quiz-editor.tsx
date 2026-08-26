"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuestionDTO } from "@/types/quiz";

const OPTION_LABELS = ["A", "B", "C", "D"];
const TIMER_PRESETS = [10, 15, 20, 30, 45, 60];
const fmt = (n: number) => n.toLocaleString("en-US");

interface Draft {
  text: string;
  options: string[];
  correctIndex: number;
  timer: number;
}

const emptyDraft = (): Draft => ({ text: "", options: ["", "", "", ""], correctIndex: 0, timer: 20 });

export default function QuizEditor({
  token,
  quiz,
}: {
  token: string;
  quiz: { id: string; title: string; code: string };
}) {
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/quizzes/${quiz.id}`, { headers: { "x-host-token": token } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Failed to load"))))
      .then((data) => {
        if (alive) setQuestions((data.quiz.questions as QuestionDTO[]) ?? []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [quiz.id, token]);

  function updateOption(i: number, value: string) {
    setDraft((d) => ({ ...d, options: d.options.map((o, idx) => (idx === i ? value : o)) }));
  }

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.text.trim() || draft.options.some((o) => !o.trim())) {
      setError("Question text and all four options are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-host-token": token },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add question");
      setQuestions((qs) => [...qs, data.question as QuestionDTO]);
      setDraft(emptyDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function removeQuestion(id: string) {
    if (!window.confirm("Delete this question?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
        headers: { "x-host-token": token },
      });
      if (res.ok) setQuestions((qs) => qs.filter((q) => q.id !== id));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(q: QuestionDTO, patch: Partial<QuestionDTO>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-host-token": token },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.question) {
        setQuestions((qs) => qs.map((x) => (x.id === q.id ? (data.question as QuestionDTO) : x)));
      }
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    navigator.clipboard?.writeText(quiz.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-line transition hover:text-white">← Dashboard</Link>
          <h1 className="mt-2 text-2xl font-extrabold">{quiz.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyCode} className="chip cursor-pointer tracking-[0.35em]" dir="ltr" title="Copy room code">
            {quiz.code}
          </button>
          {copied && <span className="text-xs text-primary-light">Copied</span>}
          <Link href={`/host/${quiz.code}`} className="btn-primary !py-2 text-xs">
            Enter host room
          </Link>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold text-line">
          Questions ({fmt(questions.length)}) — at least one question is required to start a match
          {questions.length > 0 && (
            <span className="chip !border-primary/40 !text-primary-light">
              Total time ≈ {fmt(questions.reduce((a, q) => a + q.timer, 0))}s
            </span>
          )}
        </h2>

        {loading ? (
          <div className="card text-center text-sm text-muted">Loading…</div>
        ) : questions.length === 0 ? (
          <div className="card text-center text-sm text-muted">No questions added yet.</div>
        ) : (
          <ol className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <li key={q.id} className="card animate-fadeIn">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/20 text-xs font-bold text-primary-light">
                    {fmt(i + 1)}
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      className="input !w-auto !px-2 !py-1.5 text-xs"
                      value={q.timer}
                      onChange={(e) => saveEdit(q, { timer: Number(e.target.value) })}
                      disabled={busy}
                      aria-label="Timer"
                    >
                      {TIMER_PRESETS.map((t) => (
                        <option key={t} value={t}>{fmt(t)}s</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeQuestion(q.id)}
                      className="btn-ghost !px-3 !py-1.5 text-xs hover:!border-red-500/50 hover:!text-red-300"
                      disabled={busy}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <p className="mb-3 font-semibold leading-7">{q.text}</p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      disabled={busy}
                      onClick={() => saveEdit(q, { correctIndex: oi })}
                      title="Click to mark as the correct answer"
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        q.correctIndex === oi
                          ? "border-primary bg-primary/15 text-white"
                          : "border-line/20 bg-ink text-muted hover:border-line"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-xs font-bold ${
                          q.correctIndex === oi ? "bg-primary text-white" : "bg-surface text-line"
                        }`}
                      >
                        {OPTION_LABELS[oi]}
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-bold text-line">Add a new question</h2>
        <form onSubmit={addQuestion} className="card flex flex-col gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs text-muted">Question text</span>
            <textarea
              className="input min-h-[72px] resize-y"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              maxLength={500}
              required
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            {draft.options.map((opt, i) => (
              <label key={i} className={`block rounded-xl border p-2 transition ${draft.correctIndex === i ? "border-primary bg-primary/10" : "border-line/20"}`}>
                <span className="mb-1 flex items-center justify-between text-xs text-muted">
                  Option {OPTION_LABELS[i]}
                  <span className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="correct"
                      checked={draft.correctIndex === i}
                      onChange={() => setDraft((d) => ({ ...d, correctIndex: i }))}
                      className="accent-[#825A6D]"
                    />
                    Correct
                  </span>
                </span>
                <input
                  className="input !py-2"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  required
                />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs text-muted">Time limit</span>
              <select
                className="input !w-auto"
                value={draft.timer}
                onChange={(e) => setDraft((d) => ({ ...d, timer: Number(e.target.value) }))}
              >
                {TIMER_PRESETS.map((t) => (
                  <option key={t} value={t}>{fmt(t)} seconds</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "…" : "+ Add question"}
            </button>
          </div>

          {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
        </form>
      </section>
    </main>
  );
}
