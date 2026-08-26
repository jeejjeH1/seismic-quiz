import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { quizId: string } }) {
  const token = req.headers.get("x-host-token");
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: { _count: { select: { questions: true } } },
  });
  if (!quiz || !token || quiz.hostToken !== token)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? "").trim();
  const options = Array.isArray(body.options)
    ? (body.options as unknown[]).map((o) => String(o ?? "").trim()).slice(0, 4)
    : [];
  const correctIndex = Number(body.correctIndex);
  const timer = Math.min(300, Math.max(5, Number(body.timer) || 20));

  if (!text) return NextResponse.json({ error: "Question text is required" }, { status: 400 });
  if (options.length !== 4 || options.some((o) => !o))
    return NextResponse.json({ error: "All four options are required" }, { status: 400 });
  if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3)
    return NextResponse.json({ error: "Invalid correct option" }, { status: 400 });
  if (quiz._count.questions >= 100)
    return NextResponse.json({ error: "Question limit reached" }, { status: 400 });

  const question = await prisma.question.create({
    data: {
      quizId: quiz.id,
      text,
      options,
      correctIndex,
      timer,
      order: quiz._count.questions,
    },
  });
  return NextResponse.json({ ok: true, question });
}
