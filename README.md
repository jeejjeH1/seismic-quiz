# Seismic Quiz

پلتفرم برگزاری مسابقه کوئیز به‌صورت **بی‌درنگ (Real-time)** — طراحی سوال توسط میزبان، ورود بازیکنان با کد ۶ رقمی و لیدربرد زنده پس از هر سوال.

## پشته فناوری

| بخش | تکنولوژی | استقرار |
|---|---|---|
| فرانت‌اند | Next.js 14 (App Router) + TypeScript | Vercel |
| سرور سوکت | Express + Socket.IO (`backend/`) | Render |
| دیتابیس | PostgreSQL + Prisma ORM | Supabase |
| کش / لیدربرد | Redis | Upstash |
| احراز هویت میزبان | NextAuth.js (Credentials + JWT، رمز با scrypt) | — |

معماری دو بخشی است:
- **فرانت** (`/` ریشه): صفحات + API Routes (احراز هویت و CRUD کوئیز) — فقط به Supabase وصل است
- **بک‌اند سوکت** (`backend/`): موتور بازی realtime — به Supabase + Upstash وصل است و CORS آن با `CORS_ORIGIN` کنترل می‌شود

## هویت بصری

| کاربرد | رنگ |
|---|---|
| اصلی (Primary) | `#825A6D` |
| پس‌زمینه اصلی | `#161616` |
| پس‌زمینه ثانویه | `#282826` |
| متن توضیحات | `#D4D4D4` |
| خطوط جداکننده | `#A4A3A1` |

فونت: Vazirmatn (فارسی) + Inter — حالت مینیمال با کنتراست بالا.

## پیش‌نیازها (اجرای محلی)

- Node.js ≥ 18
- PostgreSQL و Redis در حال اجرا (یا Docker):
  ```bash
  docker run -d --name sq-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=seismic_quiz -p 5432:5432 postgres:16
  docker run -d --name sq-redis -p 6379:6379 redis:7
  ```

## راه‌اندازی محلی

```bash
npm install                 # فرانت + prisma generate
cd backend && npm install && cd ..   # بک‌اند سوکت
npx prisma migrate dev --name init   # از ریشه — schema اصلی در /prisma است
npm run dev:all             # فرانت :3000 + سوکت :4000 با هم
```

سپس `http://localhost:3000` را باز کنید.

### متغیرهای محیطی

**ریشه (`.env`):**
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seismic_quiz?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

**بک‌اند (`backend/.env`)** — نمونه در `backend/.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seismic_quiz?schema=public"
REDIS_URL="redis://localhost:6379"
CORS_ORIGIN="http://localhost:3000"
```

> نکته: `prisma generate` بک‌اند به schema ریشه (`../prisma/schema.prisma`) اشاره می‌کند؛ پس backend باید داخل همین مخزن نصب شود. Migration فقط از ریشه اجرا می‌شود.

## استقرار ابری (رایگان)

### ۱) Supabase (دیتابیس)
پروژه بسازید ← `Project Settings → Database → Connection string (URI)` را کپی کنید.
- برای **Vercel**: پورت `6543` با `?pgbouncer=true`
- برای **Render**: پورت `6543` هم کار می‌کند (Pooler)

### ۲) Upstash (Redis)
دیتابیس رایگان بسازید ← مقدار `rediss://...` را کپی کنید (دو s = TLS).

### ۳) Render (سرور سوکت)
1. ریپو را به GitHub پوش کنید
2. Render ← New ← Blueprint ← ریپو را انتخاب کنید (`render.yaml` آماده است، Root Directory خودکار روی `backend` تنظیم می‌شود)
3. متغیرها را پر کنید:
   - `DATABASE_URL` ← آدرس Supabase
   - `REDIS_URL` ← آدرس Upstash (`rediss://`)
   - `CORS_ORIGIN` ← فعلاً `*` (بعداً دامنه Vercel را بگذارید)
4. دامنه‌ای مثل `https://seismic-quiz-socket.onrender.com` می‌گیرید

> ⚠️ پلن رایگان Render بعد از ~۱۵ دقیقه بی‌کاری خاموش می‌شود؛ اولین ورود ~۳۰ ثانیه طول می‌کشد. برای مسابقه زنده، چند لحظه قبل سرویس را باز کنید تا گرم شود.

### ۴) Vercel (فرانت)
1. ریپو را Import کنید (ریشه مخزن، بدون تغییر Root Directory)
2. متغیرها:
   - `DATABASE_URL` ← Supabase (پورت 6543)
   - `NEXTAUTH_URL` ← دامنه Vercel
   - `NEXTAUTH_SECRET` ← رشته تصادفی بلند
   - `NEXT_PUBLIC_SOCKET_URL` ← دامنه Render مرحله ۳
3. Deploy
4. برگردید به Render و `CORS_ORIGIN` را دقیقاً دامنه Vercel کنید (مثلاً `https://your-app.vercel.app`)

## مسیرها

| مسیر | نقش |
|---|---|
| `/` | صفحه اصلی + ورود سریع با کد اتاق |
| `/auth/signin` | ورود/ثبت‌نام میزبان |
| `/dashboard` | لیست کوئیز‌ها + ساخت کوئیز جدید |
| `/dashboard/[quizId]` | ادیتور سوالات (۴ گزینه‌ای + تایمر هر سوال + انتخاب پاسخ صحیح با کلیک) |
| `/host/[code]` | اتاق کنترل زنده میزبان: شروع، نمایش پاسخ، سوال بعدی، آمار لحظه‌ای |
| `/quiz/[code]` | سمت بازیکن: لابی ← سوال ← پاسخ ← نتایج |
| `/leaderboard/[code]` | لیدربرد عمومی زنده (برای نمایش روی پروژکتور) |

## رویدادهای Socket.IO

**کلاینت → سرور:** `join_room`, `watch_room`, `host_auth`, `submit_answer`, `host_start_quiz`, `host_reveal_answer`, `host_next_question`, `leaderboard_request`, `sync_request`

**سرور → کلاینت:** `new_question`, `show_correct_answer`, `leaderboard_update`, `players_update`, `stats_update`, `quiz_finished`

## منطق امتیازدهی

پاسخ صحیح = تا سقف `1000 × (زمانِ باقی‌مانده ÷ مدت سوال)` امتیاز؛ یعنی پاسخ سریع‌تر، امتیاز بیشتر. امتیازها ابتدا در Redis (Sorted Set) تجمیع و هم‌زمان در PostgreSQL ماندگار می‌شوند.

## ساختار کلیدی

```
server.mjs (ریشه)           ← حذف شده؛ سرور سوکت به backend منتقل شد
backend/
  server.mjs                سرور مستقل Express + Socket.IO (Render)
  src/game-server.mjs       موتور بازی realtime (state machine + scoring)
prisma/schema.prisma        مدل‌های User, Quiz, Question, Participant (مشترک)
src/app/...                 صفحات و API Routes فرانت
src/components/             Leaderboard (انیمیشن رتبه + مدال)، CountdownRing
render.yaml                 بلوپرینت دیپلوی Render
```

## تست چندکاربره

دو مرورگر (یا یک نرمال و یک ناشناس) باز کنید؛ یکی میزبان و بقیه بازیکن با کد اتاق.
