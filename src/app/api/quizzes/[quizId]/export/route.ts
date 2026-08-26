import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvCell(v: string | number) {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: Request, { params }: { params: { quizId: string } }) {
  const url = new URL(req.url);
  const token = req.headers.get("x-host-token") || url.searchParams.get("t");
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: { participants: { orderBy: [{ score: "desc" }, { createdAt: "asc" }] } },
  });
  if (!quiz || !token || quiz.hostToken !== token)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const header = "Rank,Name,Score,Correct Answers,Total Answers,Accuracy %";
  const lines = quiz.participants.map((p, i) => {
    let answers: Record<string, { choice?: number; correct?: boolean; points?: number }> = {};
    try {
      answers =
        p.answers && typeof p.answers === "object"
          ? (p.answers as typeof answers)
          : {};
    } catch {}
    const values = Object.values(answers);
    const totalA = values.length;
    const correctA = values.filter((a) => a.correct === true).length;
    const acc = totalA ? Math.round((correctA / totalA) * 100) : 0;
    return [i + 1, p.name, p.score, correctA, totalA, acc].map(csvCell).join(",");
  });

  const csv = "\ufeff" + [header, ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="results-${quiz.code}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
