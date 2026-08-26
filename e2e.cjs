const { io } = require("socket.io-client");

const URL = "http://localhost:4000";
const CODE = "135790";
const TOKEN = "testtoken123";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass++;
    console.log(`PASS ${name}`);
  } else {
    fail++;
    console.log(`FAIL ${name}`);
  }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(fn, label, timeoutMs = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (fn()) return true;
    await wait(120);
  }
  return false;
}

(async () => {
  const player = io(URL, { transports: ["websocket"] });
  const host = io(URL, { transports: ["websocket"] });
  const watcher = io(URL, { transports: ["websocket"] });

  let participantId = null;
  let gotQuestion = false;
  let gotReveal = null;
  let lbScore = -1;
  let finished = false;

  player.on("new_question", (q) => {
    gotQuestion = q && q.text && Array.isArray(q.options);
  });
  player.on("show_correct_answer", ({ correctIndex }) => (gotReveal = correctIndex));
  player.on("quiz_finished", () => (finished = true));
  watcher.on("leaderboard_update", ({ entries }) => {
    if (entries.length > 0) lbScore = entries[0].score;
  });

  await new Promise((r) => player.on("connect", r));
  await new Promise((r) => host.on("connect", r));
  await new Promise((r) => watcher.on("connect", r));

  // 1) ورود بازیکن
  const joined = await new Promise((res) =>
    player.emit("join_room", { code: CODE, name: "بازیکن‌تست" }, res)
  );
  check("join_room", joined.ok === true && !!joined.participantId);
  participantId = joined.participantId;

  // 2) احراز میزبان غلط و درست
  const badAuth = await new Promise((res) =>
    host.emit("host_auth", { code: CODE, hostToken: "wrong" }, res)
  );
  check("host_auth(wrong token rejected)", badAuth.ok === false);
  const auth = await new Promise((res) =>
    host.emit("host_auth", { code: CODE, hostToken: TOKEN }, res)
  );
  check("host_auth", auth.ok === true);

  // 3) تماشاگر
  const watch = await new Promise((res) => watcher.emit("watch_room", { code: CODE }, res));
  check("watch_room", watch.ok === true);

  // 4) شروع مسابقه
  const started = await new Promise((res) => host.emit("host_start_quiz", { hostToken: TOKEN }, res));
  check("host_start_quiz", started.ok === true);

  check("new_question received", await waitUntil(() => gotQuestion, "new_question", 10000));

  // 5) پاسخ صحیح سریع (گزینه سوم)
  const ans = await new Promise((res) =>
    player.emit("submit_answer", { index: 0, optionIndex: 2 }, res)
  );
  check("submit_answer", ans.ok === true);

  // 6) منتظر ریویل خودکار (~5.4s + تاخیر شبکه)
  check("show_correct_answer(auto)", await waitUntil(() => gotReveal === 2, "reveal", 12000));
  check("leaderboard scored", lbScore > 500);

  // 7) پاسخ دیرهنگام رد شود
  const late = await new Promise((res) =>
    player.emit("submit_answer", { index: 0, optionIndex: 1 }, res)
  );
  check("late answer rejected", late.ok === false);

  // 8) سوال بعدی = پایان (فقط یک سوال داریم)
  const nxt = await new Promise((res) =>
    host.emit("host_next_question", { hostToken: TOKEN }, res)
  );
  check("host_next_question", nxt.ok === true);
  check("quiz_finished", await waitUntil(() => finished, "finished", 8000));

  player.close();
  host.close();
  watcher.close();
  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
