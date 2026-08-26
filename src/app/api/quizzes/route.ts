import { randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const hostName = String(body.hostName ?? "").trim().slice(0, 60);
  if (!title || title.length > 120)
    return NextResponse.json({ error: "Invalid title" }, { status: 400 });
  if (!hostName)
    return NextResponse.json({ error: "Host name is required" }, { status: 400 });

  let code = "";
  for (let i = 0; i < 12; i++) {
    const c = String(randomInt(0, 1_000_000)).padStart(6, "0");
    if (!(await prisma.quiz.findUnique({ where: { code: c } }))) {
      code = c;
      break;
    }
  }
  if (!code) return NextResponse.json({ error: "Could not generate room code" }, { status: 500 });

  const quiz = await prisma.quiz.create({
    data: {
      title,
      code,
      hostToken: randomBytes(24).toString("hex"),
      hostName,
    },
  });

  return NextResponse.json({
    ok: true,
    quiz: { id: quiz.id, title: quiz.title, code: quiz.code, hostToken: quiz.hostToken },
  });
}
