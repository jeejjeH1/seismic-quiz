import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function tokenOf(req: Request) {
  return req.headers.get("x-host-token");
}

export async function GET(req: Request, { params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: params.quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz || !tokenOf(req) || quiz.hostToken !== tokenOf(req))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      code: quiz.code,
      questions: quiz.questions.map((q) => ({
        id: q.id,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        timer: q.timer,
        order: q.order,
      })),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz || !tokenOf(req) || quiz.hostToken !== tokenOf(req))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (!title || title.length > 120)
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });

  const updated = await prisma.quiz.update({ where: { id: quiz.id }, data: { title } });
  return NextResponse.json({ ok: true, quiz: updated });
}

export async function DELETE(req: Request, { params }: { params: { quizId: string } }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId } });
  if (!quiz || !tokenOf(req) || quiz.hostToken !== tokenOf(req))
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.quiz.delete({ where: { id: quiz.id } });
  return NextResponse.json({ ok: true });
}
