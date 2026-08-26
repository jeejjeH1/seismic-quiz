"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import QuizEditor from "./quiz-editor";

interface QuizEntry {
  id: string;
  title: string;
  code: string;
}

export default function QuizEditPage() {
  const params = useParams<{ quizId: string }>();
  const quizId = typeof params.quizId === "string" ? params.quizId : "";
  const [loaded, setLoaded] = useState(false);
  const [entry, setEntry] = useState<QuizEntry | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem("sq_my_quizzes") ?? "[]") as QuizEntry[];
      setEntry(list.find((q) => q.id === quizId) ?? null);
      setToken(window.localStorage.getItem(`sq_tok_${quizId}`));
    } catch {
      setEntry(null);
      setToken(null);
    }
    setLoaded(true);
  }, [quizId]);

  if (!loaded) {
    return <main className="min-h-screen" />;
  }

  if (!entry || !token) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <p className="text-muted">
          This quiz isn&apos;t found on this device. Quizzes are tied to the browser they were
          created in.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">Back to dashboard</Link>
      </main>
    );
  }

  return <QuizEditor token={token} quiz={{ id: entry.id, title: entry.title, code: entry.code }} />;
}
