# Outlier — Production Polish Audit

_Full page-by-page pass of the app to take it from "semester project" to shippable product. Reviewed every view, UI primitive, the data layer, the edge function, build/CI, and config._

**Health check (good news first):**
- `npm run lint` (typecheck + eslint, zero-warning) → **pass**
- `npm test` → **202 tests / 21 files pass**
- `npm run build` (prod) → **pass**, cleanly code-split, no chunk-size warnings.
- Clean architecture (domain hooks + optimistic updates + Zod-derived types), no `console.log`/`TODO`/`FIXME`, no hardcoded secrets or URLs, proper `.gitignore`, edge function is genuinely production-grade.

So it compiles and CI is green — everything below is polish, not "make it work." Severity: **P0** = fix before public launch, **P1** = should fix, **P2** = nice-to-have.

> **Progress — §0 cross-cutting:** brand voice ✅ · dynamic build tag ✅ · icons→lucide ✅ · fonts ✅ · dead CSS ✅ · error.wav ✅ · .env.example ✅ · SEO meta ✅ · og-image ✅. Emoji → **kept** (owner opted to keep the small emoji accents). reduced-motion → deferred (dashboard kept as-is by owner). **§0 done.**
>
> **Progress — §1–3 (landing + auth):** dead footer GitHub link removed ✅ · legal links deferred by owner ⏸ · sign-up email-confirmation dead-end fixed ✅ · auth error clears on login/sign-up toggle ✅ · password show/hide + strength meter (shared `ui/PasswordInput`) on Auth + ResetPassword ✅.
>
> **Progress — §4–5 (profile setup + onboarding):** awaited save + "Saving…" state ✅ · CGPA cap follows grading scale (default 10, not 4) ✅ · onboarding shows real course-count progress + nudge + live bottom bar ✅ · course code/name stored as-typed, uppercased via CSS ✅.
>
> **Progress — §6–13 + §0 reduced-motion (dashboard → modal):** dashboard physics banner **kept by owner** (restored) ✅ · AI model name genericized ✅ · stale `daily-insight-*` keys pruned ✅ · CourseDetail native `confirm` → styled modal ✅ · `AIQuotaError` → dedicated toast ✅ · manual-mark hint ✅ · calendar 7 MB upload cap enforced + label fixed ✅ · exam heading no longer hardcoded "Finals" ✅ · Advanced Analytics hidden with zero courses ✅ · **Delete Account** (typed-confirm + `delete_user_account()` cascade RPC) ✅ · Settings CGPA cap follows grading scale ✅ · mobile drawer backdrop + close-on-nav ✅ · friendlier global error fallback (real reload) ✅ · modal focus trap ✅ · `prefers-reduced-motion` honored globally ✅. **Gate: lint clean · 202 tests · build clean.**
>
> **Remaining (owner action, not code):** §1 P0 legal links (deferred by owner) · §14 deployment config — including **applying the new `20260708000000_add_delete_account_rpc.sql` migration** to the live Supabase project.

---

## 0. Cross-cutting (affects many screens — fix once, big payoff)

- [x] **P0 — Brand-voice split personality.** ✅ Auth, ResetPassword, ProfileSetup, Onboarding rewritten to the product voice; "loadout" killed in UI. The landing page speaks a warm, confident product voice ("outlier / the curve / climb / Zee"). But **Auth, ResetPassword, ProfileSetup, and Onboarding** speak a totally different "industrial / military / terminal / forge" cosplay. Examples:
  - Auth: `Operator Email`, `Access Code`, `Enter Forge`, `Establish Record`, `Initiate Session`, `The Industrial Archive for Academic Dominance`, `SEC-01 / AUTH PROTOCOL`, placeholder `ID@outlier.com`.
  - ResetPassword: `Forge New Key`, `New Access Code`.
  - ProfileSetup: `FULL LEGAL ALIAS`, placeholder `USER_IDENTIFICATION`, `INIT_SEQUENCE_v0.9`, `01 // CORE IDENTITY`, `DATA_ENCRYPTION_ACTIVE`, `Privacy is structural`, `CORE_SYSTEM_01`.
  - Onboarding: `UNIT_CODE`, `WEIGHT_MATRIX`, `APPEND_TO_LEDGER`, `SYS_CHECK: NOMINAL`, `CAPACITY: UNLIMITED`, `COURSE_FORGE_02`.
  This is the #1 thing that reads as "student project." A student handing over their GPA needs to trust the app; the sci-fi labels undercut that. **Unify everything on the landing/Zee voice.**
- [x] **P1 — Fake system chrome.** ✅ Fake version stamps replaced by a real `git short-SHA` build tag (via Vite `define`, updates every commit); `STEP_01/02` → "Step 1/2 of 2"; "Next: Schedule Sync" → "Next: add your courses". Hardcoded fake version stamps (`v0.9.4 SYSTEM_BUILD`, `INIT_SEQUENCE_v0.9`, `LOADOUT_CONFIG_v1.0`), fake progress bars (ProfileSetup bottom bar is a static `w-1/2`; Onboarding is a static `w-[100%]`), `STEP_01` on ProfileSetup (it's actually the 2nd setup step), and `Next: Schedule Sync` (the next step is the course loadout, not a "schedule sync"). Remove or make real.
- [x] **P1 — Two icon systems.** ✅ ProfileSetup/Onboarding migrated to lucide; Material Symbols font `<link>` removed from index.html. Everything uses `lucide-react` except ProfileSetup/Onboarding, which use the **Material Symbols** icon font (`<span className="material-symbols-outlined">…`). That pulls a whole extra render-blocking Google Fonts stylesheet for two screens. Standardize on lucide and drop the Material Symbols `<link>` in `index.html`.
- [x] **P2 — Emoji vs. lucide mix.** ✅ **Kept by owner** — the small emoji accents (`🤖 AI Says…`, `📅 Deadlines`, `🏖 Break`, `📋 Tasks`) stay as intentional character. No change.
- [x] **P2 — Fonts loaded 2–3× via CDN.** ✅ Consolidated to one `<link>` in `<head>` (full weights), removed the duplicate + the slow CSS `@import`. Space Grotesk is imported in **both** `index.html` (weights 300–700) and `src/index.css` (`@import`, 300–900); Playfair in CSS; Material Symbols in HTML. Three render-blocking external font requests. Consolidate to one source (and consider self-hosting for launch reliability). Note the HTML copy caps at 700 but the app uses `font-black`/900 — the CSS import is what's actually saving you.
- [x] **P2 — `prefers-reduced-motion` not universally honored.** ✅ Added a global `@media (prefers-reduced-motion: reduce)` block in `index.css` that stops `.animate-marquee` and `.hazard-stripes`. (The Dashboard physics banner is kept by owner — see §6 — so it stays exempt by choice.)
- [x] **P2 — Dead CSS.** ✅ Removed `neo-brutal-card`, `neo-brutal-button`, `neo-brutal-shadow-pink`, `text-vertical` (verified unused). `neo-brutal-card`, `neo-brutal-button`, `neo-brutal-shadow-pink`, `text-vertical` are defined in `index.css` but unused in any component (components inline the styles). Either adopt them or delete. (`CLAUDE.md` claims `neo-brutal-card`/`neo-brutal-button` are the shared primitives — reality diverged.)
- [x] **P1 — Missing `error.wav`.** ✅ Generated a subtle two-note error tone in `public/sounds/`; error chime now plays. `src/utils/sound.ts` maps `error → /sounds/error.wav`, but `public/sounds/` only contains `save.wav`. Every `playSound('error')` (Auth, ResetPassword, and the global mutation-error handler) 404s and is silently swallowed. Add `error.wav` or remove the error-sound calls.
- [x] **P1 — No `.env.example`.** ✅ Added, with comments. `.gitignore` explicitly whitelists it (`!.env.example`) and the README tells contributors to create `.env.local`, but the template file doesn't exist. Add one with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- [x] **P1 — No SEO / social meta.** ✅ Added description, theme-color, Open Graph + Twitter tags, **and `/og-image.png` (1200×630)** — a branded neo-brutalist card (wordmark + tagline + Zee), rendered from `og-image.template.html` via Edge headless. og:image is root-relative; make it absolute at deploy. `index.html` previously had only `<title>` + favicon. Missing `<meta name="description">`, Open Graph / Twitter card tags, and `theme-color`. The landing page will have no preview when shared and no search snippet.

---

## 1. Landing page (`LandingPage.tsx`) — strong, minor gaps

Genuinely polished (the magnifier "lens" scene, scroll-driven curve HUD, magnetic CTA, Zee easter eggs). Only:
- [ ] **P0 — No legal links.** ⏸ **Deferred by owner** — no Privacy/Terms links needed pre-launch for now. Revisit before a wide public launch (private GPA data makes a Privacy Policy the eventual expectation).
- [x] **P1 — Footer "GitHub" link.** ✅ **Removed** the dead footer link (`Mibrahim2003/My-dashboard` — private/wrong-named repo). Product page ships no "view source" link; `HonestUI` test updated to assert its absence.

---

## 2. Auth (`Auth.tsx`) — one real dead-end

- [x] **P0 — Sign-up email-confirmation dead-end.** ✅ `handleEmailAuth` now splits login/sign-up; on sign-up it inspects `data.session` and, when there's no session (email confirmation ON), shows a "Check your email" state (mirrors the reset-sent screen) instead of bouncing to `/post-auth`.
- [x] **P2** — ✅ `authError` now clears when toggling login ↔ sign-up (`toggleMode`) and when returning via `backToLogin`.
- [x] **P2** — ✅ Password field now has a show/hide toggle and a live strength meter (signup only), via the shared `ui/PasswordInput`.
- [x] Voice — done in §0.

## 3. Reset password (`ResetPassword.tsx`)
- [x] **P2** — ✅ Show/hide toggle + strength meter (shared `ui/PasswordInput`) on the new-password field; keeps the min-6 + match validation and the expired-link fallback. Voice done in §0.

---

## 4. Profile setup (`ProfileSetup.tsx`)

- [x] **P0 — Voice + fake chrome** — done in §0 (labels now "Full name" / "e.g. Lamine Yamal"; real build tag).
- [x] **P1 — No submit/saving state.** ✅ `handleSubmit` is now async, awaits `setUserProfileAsync`, disables the button + shows a "Saving…" spinner, and only navigates on success (stays put with the global error toast on failure).
- [x] **P1 — CGPA hardcoded to a 4.0 scale.** ✅ `currentCgpa`/`targetGpa` max now follows the grading scale's top GPC when one is configured; at first-time setup (no scale yet) it allows up to 10 so 4.0/5.0/10.0 universities can all enter their real CGPA. Target placeholder mirrors the cap.

## 5. Onboarding (`Onboarding.tsx`)

- [x] **P0 — Voice + fake chrome** — done in §0; also the bottom progress bar is now real (see below), not a static `w-[100%]`.
- [x] **P2 — Ignores `courseCount`.** ✅ Shows `added / target` count, a live nudge ("N more to reach your M" / "All M added — you're set" / "N over your planned M"), and the bottom bar now fills to `courses.length / courseCount`. Never a hard gate.
- [x] **P2 — Force-uppercasing.** ✅ Course `code`/`name` now stored **as typed** (trimmed only) in both Onboarding and `CourseFormModal`; brand display sites (CourseCard, CourseDetail, Analytics, Onboarding list) uppercase via CSS. DB keeps proper case; AI prompts no longer get shouty names.

---

## 6. Dashboard (`Dashboard.tsx`) — the standout offender

- [x] **P0 — The banner physics simulation.** ✅ **Kept by owner.** The draggable/tossable `AssetCluster` physics banner is a signature piece the owner likes — restored to the original `PhysicsAsset` + rAF loop verbatim. (Note for later, owner's call: it still ignores `prefers-reduced-motion` and the `pointer-events-auto` layer can catch a drag on mobile — left as-is intentionally.)
- [x] **P1 — Leaks the AI vendor/model.** ✅ `Connecting to Gemini 2.5 Flash...` → `Zee is analyzing your semester…`. Model-agnostic, on-brand.
- [x] **P2 — localStorage insight keys leak.** ✅ Dashboard now prunes every `daily-insight-*` key except today's on mount, so it can't accrete a key per day.
- [x] **P2** — Emoji headings (`🤖`, `📅`) — kept by owner (see §0).

---

## 7. Courses

**`CourseList.tsx` / `ui/CourseCard.tsx` / `CourseFormModal.tsx`** — clean and production-quality. Validation, the `?action=add` deep-link, the delete "danger zone" with a typed confirmation, weightage-must-total-100 — all good. Only carryover: the uppercase-name note (§5).

**`CourseDetail.tsx`** (the big one, 1289 lines — mostly excellent):
- [x] **P1 — Native `window.confirm` for deleting a deliverable.** ✅ Replaced with a styled neo-brutalist confirm `Modal` (danger `variant`, "Keep" / "Yes, Delete", copy notes when a linked reminder goes with it). No more native dialog.
- [x] **P2 — Quota errors surface as "Sync Failed".** ✅ The global `MutationCache.onError` now special-cases `AIQuotaError` → a dedicated **"Daily AI limit reached"** toast with the proxy's friendly message; everything else stays "Sync Failed".
- [x] **P2 — Manual mark entry gives less insight silently.** ✅ Added a one-line hint under the manual Class Average field: "…switch to Bulk Paste and paste the class scores to unlock your Z-score & percentile."

---

## 8. Calendar (`AcademicCalendar.tsx`) — excellent, two small gaps

- [x] **P1 — "Max 10 MB" isn't enforced.** ✅ `handleFile` now rejects files over **7 MB** (below the proxy's ~7.8 MB-raw base64 cap) with a clear toast naming the file + its size; the advertised label is corrected to "Max 7 MB" so it no longer promises a size the backend refuses.
- [x] **P2 — Exam-day heading is hardcoded "Finals."** ✅ The parsed exam period carries no midterm/final label, so the heading now reads the owning semester's name (`"<Semester> Exams"`, or "Exam Week" if unnamed) instead of always claiming "Finals."
- [x] **P2** — Emoji usage kept by owner (§0). Otherwise a genuinely strong screen (drag-drop upload, manual fallback, week numbering, ICS export, filters).

## 9. Analytics (`Analytics.tsx`) — one of the most polished
- [x] **P2** — ✅ The "Advanced Analytics" section is now hidden entirely when there are zero courses (every panel inside needs course data to say anything). Still enforces the GPA-privacy rule (`GpaMask`, reveal-on-demand).

## 10. Settings (`Settings.tsx`) — production-quality
- [x] **P1 — No "Delete account."** ✅ Added a **Danger Zone → Delete Account** with a typed-"DELETE" confirmation modal. Backed by a new `delete_user_account()` `SECURITY DEFINER` RPC (migration `20260708000000_add_delete_account_rpc.sql`) that deletes the caller's `auth.users` row; **every public table cascades off it** (`ON DELETE CASCADE`), so profile/courses/marks/calendar/reminders/tasks all go in one shot. On success it signs out and returns to the landing page. ⚠️ **Deploy step:** apply this migration to the live DB (owner action — see §14).
- [x] **P2 — CGPA vs. grading-scale scale mismatch.** ✅ The profile CGPA cap now follows the grading scale's top GPC (default 10 when none is set) — same rule as §4; both CGPA inputs' native `max` and the Zod bound track it.

---

## 11. Layout & navigation (`Layout.tsx`)
- [x] **P1 — Mobile sidebar is a half-finished drawer.** ✅ Added a dimmed `bg-ink/40` backdrop (mobile only, click-to-dismiss, sits under the drawer/top-nav so the toggle stays live) and **close-on-navigate**: `SidebarItem` takes an `onNavigate` that closes the drawer, and Add Course closes it too.

## 12. Error boundaries (`ErrorBoundary.tsx`)
- [x] **P2** — ✅ The global (Tier-1) fallback now leads with a friendly line ("Something broke … reloading usually fixes it, and your saved data is safe"), **demotes the raw `error.message` into a collapsible "Technical details"**, and the primary button does a real `window.location.reload()` (it previously only reset the boundary, which tends to re-crash), with "Try Again" as the secondary.

## 13. Modal primitive (`ui/Modal.tsx`)
- [x] **P2 — No focus trap / initial focus.** ✅ On open, focus moves into the dialog (first focusable, else the container); Tab/Shift+Tab are trapped inside; focus is restored to the trigger on close. Keeps the existing Escape-to-close + scroll-lock + `aria-modal`.

---

## 14. Deployment config — NOT code, but required before/at deploy

These aren't bugs, but the app will misbehave in production if they're skipped:
- [ ] **P0 — Set `ALLOWED_ORIGINS`** on the edge function to your production domain(s): `supabase secrets set ALLOWED_ORIGINS="https://yourdomain.com"`. Localhost is auto-allowed; **production is not**, so without this every AI call is CORS-blocked in prod.
- [ ] **P0 — Set Supabase Auth URLs** for the prod domain (Site URL + redirect allow-list including `/post-auth` and `/reset-password`), or Google OAuth and password-reset links point back at localhost.
- [ ] **P1 — Confirm quota + key secrets in prod:** `GEMINI_API_KEY`, and tune `AI_USER_DAILY_LIMIT` / `AI_GLOBAL_DAILY_LIMIT` for real traffic.
- [ ] **P1 — Verify RLS is enabled on every table** in the actual deployed project (`profiles`, `courses`, `deadlines`, `todos`, `course_deliverables`, `academic_calendars`, `onboarding_states`, `ai_usage*`). The client relies entirely on RLS for isolation; confirm it in the live DB, not just the migrations.
- [ ] **P2 — Deploy the edge function** (`npx supabase functions deploy gemini-proxy`) — editing the file doesn't ship it.
- [ ] **P1 — Apply the delete-account migration** (`20260708000000_add_delete_account_rpc.sql`) to the live project (`npx supabase db push`, or run it in the SQL editor). Without it, Settings → Delete Account will error (`function delete_user_account() does not exist`). Verify a test account fully deletes and its rows cascade out.

---

## Suggested order of attack
1. **§0 voice unification + §6 dashboard banner** — highest visible "product vs. project" impact.
2. **§2 sign-up dead-end, §11 mobile drawer, §0 error.wav** — real functional/UX breaks.
3. **§14 deployment config** — do alongside the actual deploy.
4. Everything else P1 → P2 as time allows.

_Nothing here blocks the build. It all blocks "feels like a product."_
