const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  await p.quiz.deleteMany({ where: { code: "135790" } });

  let host = await p.user.findUnique({ where: { email: "e2e@test.local" } });
  if (!host) {
    host = await p.user.create({
      data: { name: "میزبان تست", email: "e2e@test.local", password: "seed:not-a-login" },
    });
  }

  await p.quiz.create({
    data: {
      title: "تست E2E",
      code: "135790",
      hostToken: "testtoken123",
      hostId: host.id,
      isActive: false,
      questions: {
        create: {
          text: "پایتخت ایران کدام است؟",
          options: ["اصفهان", "شیراز", "تهران", "تبریز"],
          correctIndex: 2,
          timer: 5,
          order: 0,
        },
      },
    },
  });
  console.log("seeded quiz 135790");
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
