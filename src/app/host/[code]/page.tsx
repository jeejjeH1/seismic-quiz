"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import HostRoom from "./host-room";

interface QuizEntry {
  id: string;
  title: string;
  code: string;
}

export default function HostPage() {
  const params = useParams<{ code: string }>();
  const raw = params.code;
  const code = (typeof raw === "string" ? decodeURIComponent(raw) : "").toUpperCase();

  const [loaded, setLoaded] = useState(false);
  const [entry, setEntry] = useState<QuizEntry | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem("sq_my_quizzes") ?? "[]") as QuizEntry[];
      setEntry(list.find((q) => q.code === code) ?? null);
    } catch {
      setEntry(null);
    }
    setLoaded(true);
  }, [code]);

  useEffect(() => {
    if (entry) setToken(window.localStorage.getItem(`sq_tok_${entry.id}`));
  }, [entry]);

  if (!loaded) {
    return <main className="min-h-screen" />;
  }

  if (!entry || !token) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="mb-2 text-xl font-extrabold">Host room — {code}</h1>
        <p className="text-muted">
          This quiz was created in another browser. Open the dashboard in the browser you used to
          create it.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">Dashboard</Link>
      </main>
    );
  }

  return <HostRoom quizId={entry.id} code={code} hostToken={token} title={entry.title} />;
}
