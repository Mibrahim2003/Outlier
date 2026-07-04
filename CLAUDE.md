# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Outlier is

Outlier is a web app for university students. It tracks course grades, predicts GPA, and shows each student where they stand against their class — turning raw marksheets into clear standing (class average, standard deviation, Z-score, gap to the topper) and guiding the student toward the weak topics worth studying before the next exam. The aim is insight a student would not get on their own.

**Current stage: MVP. Treat this as a real product — build for quality and consistency, not speed.**

### Product vision

- Help every student raise their GPA toward a goal they set.
- Turn raw marksheets into clear cohort standing: class average, standard deviation, Z-score, gap to the topper.
- Predict course grades and semester GPA from real data, not guesses.
- Guide the student to the weak topics worth studying before the next exam.

## Tech stack

| Concern | Choice |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite (SPA) |
| Routing | react-router-dom v7 (routes declared in [src/App.tsx](src/App.tsx); there is **no** `pages/` or `routes/` folder) |
| Styling | Tailwind CSS v4 (`@theme` tokens in [src/index.css](src/index.css)), neo-brutalist design system |
| Data / backend | **Supabase** — Postgres is the source of truth (not Firebase/Firestore) |
| Auth | Supabase Auth — Google OAuth **and** email/password |
| AI | Google Gemini (`gemini-2.5-flash`), called **only** through a Supabase Edge Function proxy |
| Server cache | TanStack Query v5 |
| Forms / validation | react-hook-form + Zod |
| Animation | `motion` (Framer Motion) |
| Toasts | `sonner` |
| Package manager | npm |
| Hosting | Not configured in-repo — confirm with the owner before assuming a target |

## Commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server on port 3000 (host 0.0.0.0)
- `npm run build` — production build
- `npm run lint` — full gate: `typecheck` (tsc, no emit) **then** `eslint . --max-warnings=0`. Zero-warning tolerance — unused imports/vars fail the build.
- `npm run typecheck` / `npm run eslint` — run either half of the lint gate alone
- `npm run test` — run the Vitest suite once (`vitest run`)
- Single test file: `npx vitest run src/components/__tests__/Dashboard.test.tsx`
- Tests matching a name: `npx vitest run -t "deadline"`
- `npx supabase functions deploy gemini-proxy` — ship the AI proxy after editing [supabase/functions/gemini-proxy/index.ts](supabase/functions/gemini-proxy/index.ts) (editing the file does **not** deploy it)

Tests use Vitest + Testing Library in `jsdom` (configured inline in [vite.config.ts](vite.config.ts)). There is no global setup file — each test needing DOM matchers imports `'@testing-library/jest-dom/vitest'` at the top. Component tests `vi.mock` the domain hooks (see [Dashboard.test.tsx](src/components/__tests__/Dashboard.test.tsx)) so components render against fixed data without touching Supabase.

## Environment

Local dev needs a `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. [src/lib/supabase.ts](src/lib/supabase.ts) throws at import time if either is missing, so the app will not boot without them. The Gemini key (`GEMINI_API_KEY`) lives **only** as a Supabase Edge Function secret — never in the frontend. Set it with `npx supabase secrets set GEMINI_API_KEY="..."`.

## Project structure

- [src/components/](src/components/) — both top-level views and presentational components. Views: `Dashboard`, `Analytics`, `CourseList`, `CourseDetail`, `AcademicCalendar`, `Settings`, `Onboarding`, `ProfileSetup`, `Auth`, `LandingPage`. Reusable primitives live in [src/components/ui/](src/components/ui/).
- [src/domain/](src/domain/) — one folder per persisted entity (`courses`, `deadlines`, `todos`, `deliverables`, `profile`, `onboarding`, `calendar`), each exporting a `useX()` hook. **The only place Supabase tables are touched.**
- [src/hooks/](src/hooks/) — feature hooks: `useAI`, `useCalendarParser`, `useCourseProgress`, `useLocalStorage`.
- [src/lib/](src/lib/) — `supabase` client, `aiClient` (proxy caller), `promptBuilder`.
- [src/utils/](src/utils/) — `gpaEngine` (grade/GPA math), `dateUtils` (greeting + calendar week math), `impactStyles` (**the course color system**), `icsExport`, `cn`.
- [src/context/](src/context/) — `AuthContext`.
- [src/schemas.ts](src/schemas.ts) / [src/types.ts](src/types.ts) — Zod schemas and the types inferred from them.
- [supabase/](supabase/) — `functions/gemini-proxy/` (Deno edge function) and `migrations/` (timestamped SQL).

## Architecture

React 19 SPA. Supabase is the source of truth (auth + Postgres); TanStack Query is the client cache; all AI runs through a Supabase Edge Function proxy.

### Data layer: the `domain/` pattern

Every persisted entity has a folder under [src/domain/](src/domain/) exporting a single `useX()` hook. These hooks are the **only** place that talks to Supabase tables — components never call `supabase.from(...)` directly. Each hook follows the same shape:

- `useQuery` keyed by `['entity', userId]`, `enabled: !!userId`.
- Mutations use **optimistic updates**: `onMutate` snapshots + patches the cache, `onError` rolls back from the snapshot, `onSettled` invalidates. Follow this exact pattern for new mutations.
- A `normalizeX(row)` function maps DB rows → domain types and absorbs legacy/migrated shapes. The DB is `snake_case` (`grade_progress`, `impact_level`); the app is `camelCase`. `normalize` tolerates both because old rows may carry either. See `normalizeCourse` in [useCourses.ts](src/domain/courses/useCourses.ts). Row shapes are typed in [src/domain/db-types.ts](src/domain/db-types.ts).

Global config in [src/App.tsx](src/App.tsx): a `MutationCache.onError` shows a Sonner error toast for every failed mutation unless `mutation.meta.silent` is set; queries default to 5-min `staleTime` and `retry: 1`.

### Row Level Security — the security boundary

All private data (GPA, marks, profiles, everything) sits behind the **public anon key**, so the *database*, not the client, is what isolates accounts. **Every table has RLS enabled with `auth.uid() = user_id` policies** — see [supabase/migration.sql](supabase/migration.sql) plus the per-feature migrations covering `profiles`, `courses`, `deadlines`, `onboarding_states`, `todos`, `course_deliverables`, `academic_calendars`, and `ai_usage`/`ai_usage_global`. A user can only ever read or write their own rows; the gemini-proxy uses a token-scoped client so `auth.uid()` resolves to the caller there too. This is the boundary protecting the privacy stance on GPA — do not weaken it.

Implications for new code:
- **A new table must enable RLS and add `auth.uid() = user_id` policies in the same migration**, or it ships world-readable/writable through the anon key.
- Domain hooks still scope every query and mutation by `user_id` (e.g. `.eq('user_id', userId)`). Keep doing so — it's defense-in-depth and intent-revealing; RLS is the enforced backstop, not a license to drop the filter.

### Types & validation

Domain types are **derived from Zod schemas**, not hand-written. [src/schemas.ts](src/schemas.ts) defines schemas; [src/types.ts](src/types.ts) re-exports them as `z.infer<...>`. Change a field on the schema and the type follows. Zod also validates AI responses at runtime (see AI subsystem).

### Auth & routing

- [src/context/AuthContext.tsx](src/context/AuthContext.tsx) wraps the app (in [main.tsx](src/main.tsx), outside the Router) and exposes `{ user, session, loading }`.
- All routing decisions funnel through one place: [PostAuthGate.tsx](src/components/PostAuthGate.tsx) is the canonical post-login redirector (both Google OAuth and email auth land on `/post-auth`). Its tiers — no user → `/auth`, no profile → `/profile-setup`, no committed loadout → `/onboarding`, else `/dashboard` — are mirrored by [ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) (`requireProfile` / `requireLoadout` props) guarding routes in [App.tsx](src/App.tsx). **Keep these two in sync** when changing the onboarding flow.

### AI subsystem

The frontend never calls Gemini directly. Flow:

1. **`useAI()`** ([src/hooks/useAI.ts](src/hooks/useAI.ts)) and **`useCalendarParser()`** define each AI feature (dashboard insight, study priorities, course insight/critical action, project scope + milestones, calendar OCR, class-mark extraction).
2. **`buildPrompt()`** ([src/lib/promptBuilder.ts](src/lib/promptBuilder.ts)) assembles structured prompts (`[TASK]`, `[INPUT DATA]`, `[REASONING RULES]`, `[OUTPUT CONTRACT]`, `[VOICE PROFILE]`). The user's `aiPersona` (`tactical` / `supportive` / `bare_minimum`) selects a voice; for JSON output the voice is swapped for a strict data-only persona to protect the JSON.
3. **`invokeAI()`** ([src/lib/aiClient.ts](src/lib/aiClient.ts)) calls the `gemini-proxy` Edge Function, retries 500/502/503 with exponential backoff, and throws a non-retryable `AIQuotaError` on HTTP 429.
4. JSON responses are stripped of code fences and **validated with the matching Zod schema** before use.

The proxy ([supabase/functions/gemini-proxy/index.ts](supabase/functions/gemini-proxy/index.ts), Deno) verifies the caller's JWT, validates the body, enforces per-user + global daily quotas via the `consume_ai_quota` Postgres RPC (fails **closed** — no quota check, no paid call), then calls `gemini-2.5-flash` at `temperature: 0.2`. CORS allows any localhost port plus origins in the `ALLOWED_ORIGINS` secret. Quotas and origins are tunable via secrets without redeploying, but **code changes to the proxy require `npx supabase functions deploy gemini-proxy`** to take effect.

### Database migrations

SQL lives in [supabase/migrations/](supabase/migrations/) (timestamped) plus some standalone `migration_*.sql` files at the [supabase/](supabase/) root. Tables and expected columns are documented in [README.md](README.md). When adding a column, update all of: the migration, the `Db*Row` interface in [db-types.ts](src/domain/db-types.ts), the `normalize`/`toPayload` mappers in the relevant domain hook, **and** the Zod schema.

## Core domain concepts

These are the product rules. Implement to them; don't drift.

### Grading model — category-weighted average

Each course has weighted categories the student sets during onboarding; weights sum to 100%. The five categories are fixed (`weightage` in `CourseSchema`): **quizzes, assignments, midterm, final, project** (e.g. 15 / 5 / 30 / 40 / 10).

For each category with results:

1. The student uploads the full class marksheet (PDF/image), or enters their own marks + class average by hand.
2. Gemini parses the sheet (columns: registration number, name, obtained marks) via `useAI.extractClassMarks`.
3. Match the student by **registration number first, name second**.
4. Compute class average, standard deviation, Z-score, full-marks count, and number of toppers.
5. Store these per category on `course_deliverables.metadata` (`classAvg`, `classStdDev`, `highestScore`, `toppersCount`, `obtainedMarks`, `totalMarks`, …).

Then ([src/utils/gpaEngine.ts](src/utils/gpaEngine.ts)): predict the course grade as a letter from the weighted categories and the grading scale (relative Z-score curve when class stats exist, else absolute percentage), aggregate predicted course grades into a predicted **semester GPA**, and compare it against the student's goal. The grading scale is per-profile (`gradingScale`, editable in Settings) and falls back to `DEFAULT_GRADING_SCALE`.

### GPA & CGPA

Collected at signup: current CGPA, current semester, total semesters, goal CGPA. From these, compute the per-semester GPA needed to hit the goal across remaining semesters.

**GPA/CGPA is private: keep it hidden by default behind an explicit reveal action. Never render it on load.**

### Reminders

The **Add Quiz** action sets a reminder for an upcoming quiz on a date. Capture the quiz number (1–5) and the source lecture range (e.g. lectures 1–5). **No score input at the reminder stage** — marks upload is a separate action.

### Analytics

- **Cohort comparison**: the student's standing vs. the class, gap to the topper, and percentile from the Z-score.
- **AI guidance**: flag weak topics from low quiz/assignment scores; prompt study of concepts likely to repeat on the mid/final.
- **Advanced Analytics** sits behind a button to keep onboarding light. **Only include advanced metrics approved by the product owner (Ibrahim). Do not add advanced metrics on your own.**

### Academic calendar

The student uploads an academic calendar PDF; Gemini parses it (`useCalendarParser`). Week numbering (`getSemesterWeekNumber` in [src/utils/dateUtils.ts](src/utils/dateUtils.ts)): Week 1 starts at the semester start (aligned to its Monday boundary), weeks run in sequence through finals (finals week is the last week), **breaks are not numbered**, and numbering resets to Week 1 at the next semester start. The header label reads **WEEK**, never "WK". Render holidays neo-brutalist: bold color, bold type, hard shadows.

### Courses

- The sidebar **Courses** tab lists enrolled courses as cards ([CourseList.tsx](src/components/CourseList.tsx)); detail view in [CourseDetail.tsx](src/components/CourseDetail.tsx) with sections: quizzes, assignments, mids, finals, projects, AI insights.
- Each course has an accent color picked during onboarding from a **fixed palette of five**. The chosen color applies to **both** the course card and the inside of the detail page — same color, both places.
- **The color system already exists — reuse it, do not build a second one.** It lives in [src/utils/impactStyles.ts](src/utils/impactStyles.ts): `themeColor` is a `ThemeColor` enum (`yellow | pink | green | blue | purple`) and `getThemeBgClass` / `getThemeBorderClass` / `getThemeBottomBorderClass` map it to the hex values. (Separately, `impactLevel` `heavy/standard/minimal` drives `getImpactStyles`.)

### Dashboard banner

- Greeting reads **"Good [morning/afternoon/evening], [Full name]"** on one line (`getGreeting()` in [dateUtils.ts](src/utils/dateUtils.ts), used in [Dashboard.tsx](src/components/Dashboard.tsx)).
- Stationery assets are animated SVGs ([BannerAssets.tsx](src/components/BannerAssets.tsx)). Keep motion **light** — mouse reaction or gentle drift, no heavy gravity simulation.

## Design system

Neo-brutalist: bold colors, bold typography, hard offset shadows, thick borders, square corners. Reusable utilities (`neo-brutal-card`, `neo-brutal-button`, `neo-brutal-shadow*`, `hazard-stripes`, …) and theme tokens are defined in [src/index.css](src/index.css). Fonts: Space Grotesk (sans/headline), Playfair Display (luxury accents).

Theme tokens (current values in code):

- Background `#FFF6E3` (cream) · Ink `#1A1A1A`
- Primary `#6c5a00` / **primary-container `#ffde59` (yellow — the dominant accent)**
- Secondary `#a8275a` (magenta) · Tertiary `#006761` (teal-green)
- **Course accent palette (five):** yellow `#fff1c9`, pink `#f5c3bb`, green `#daf5bc`, blue `#a2d9f9`, purple `#d7bcf5`


## How to work on this codebase

Read this before making changes.

- **Read the existing code first.** Understand a system end to end before touching it. The color system is the clearest example: trace onboarding color selection → card → course page before editing.
- **Plan before writing code.** Think the change through, then implement.
- **Follow the instructions given.** Do not add features, screens, or logic nobody asked for.
- **Keep the codebase one unit.** Reuse existing systems; no duplicate implementations of the same concept.
- **Ask when a requirement is unclear.** A short question beats a wrong guess.
- **This is a product, not a throwaway.** Hold the quality bar.

## Out of scope for now

Planned — **do not build yet**:

- Bring-your-own LLM key in Settings (Claude, OpenAI, Gemini, others) with a low-cost default; parsing and insights then run on the student's chosen model.
- Custom emojis in the banner.
- Pre-finals cohort comparison: one week before finals, prompt the student to upload the pre-finals marksheet (every mark except the final), then show the cohort comparison.
- AI resource recommendations: after the weakness scan flags a weak topic, Gemini recommends one specific study resource for it (replaces the removed hardcoded "Recommended Resource" card in CourseDetail).
