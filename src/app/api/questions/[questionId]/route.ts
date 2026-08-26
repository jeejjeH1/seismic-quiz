import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function ownedQuestion(questionId: string, token: string | null) {
  if (!token) return null;
  const q = await prisma.question.findUnique({ where: { id: questionId }, include: { quiz: true } });
  if (!q || q.quiz.hostToken !== token) return null;
  return q;
}

export async function PATCH(req: Request, { params }: { params: { questionId: string } }) {
  const existing = await ownedQuestion(params.questionId, req.headers.get("x-host-token"));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (typeof body.text === "string" && body.text.trim()) data.text = body.text.trim();
  if (Array.isArray(body.options)) {
    const options = (body.options as unknown[]).map((o) => String(o ?? "").trim()).slice(0, 4);
    if (options.length === 4 && options.every((o) => o)) data.options = options;
    else return NextResponse.json({ error: "All four options are required" }, { status: 400 });
  }
  if (body.correctIndex !== undefined) {
    const ci = Number(body.correctIndex);
    if (!Number.isInteger(ci) || ci < 0 || ci > 3)
      return NextResponse.json({ error: "Invalid correct option" }, { status: 400 });
    data.correctIndex = ci;
  }
  if (body.timer !== undefined) {
    data.timer = Math.min(300, Math.max(5, Number(body.timer) || 20));
  }

  const question = await prisma.question.update({ where: { id: params.questionId }, data });
  return NextResponse.json({ ok: true, question });
}

export async function DELETE(req: Request, { params }: { params: { questionId: string } }) {
  const existing = await ownedQuestion(params.questionId, req.headers.get("x-host-token"));
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.question.delete({ where: { id: params.questionId } });
  return NextResponse.json({ ok: true });
}
