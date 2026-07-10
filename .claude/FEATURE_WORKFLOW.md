# Feature Workflow — how to add features without breaking the live site

This is GitHub Flow, the same process used at GitHub, Shopify, Vercel, and most
modern product teams. The core idea: `main` is sacred — it is always deployable,
and nothing reaches it without passing the CI gate. All work happens on short-lived
branches.

The live site deploys automatically from `main` (see `.github/workflows/ci.yml`),
so protecting `main` protects production.

---

## The flow, step by step

### 0. Start clean

```
git checkout main
git pull
npm install
```

Always branch from fresh `main` so you build on what is actually live.

### 1. Create a feature branch

```
git checkout -b feat/short-name
```

Naming: `feat/quiz-reminders`, `fix/gpa-rounding`, `chore/update-deps`.
One branch = one feature. Small branches merge fast and break less.

### 2. Build the feature

Follow the architecture rules in `CLAUDE.md`. The ones that keep the core safe:

- Data access only through `src/domain/` hooks — components never call
  `supabase.from(...)` directly.
- New DB table? RLS enabled + `auth.uid() = user_id` policies **in the same
  migration**, or the table is world-readable.
- New field? Update all four: migration, `db-types.ts` row interface,
  the domain hook's `normalize`/`toPayload`, and the Zod schema.
- Reuse existing systems (colors, toasts, query patterns). No duplicates.

### 3. Database changes need extra care

```
npm run db:backup                     # insurance first, always
npx supabase migration new my_change  # creates timestamped file in supabase/migrations/
```

Write SQL in the generated file. Never run SQL by hand in the Supabase
dashboard — CI applies migrations on merge, and hand-applied changes drift
out of sync with the files.

### 4. Verify locally before pushing

```
npm run lint    # typecheck + eslint, zero warnings allowed
npm test        # unit tests
npm run dev     # click through the feature yourself
```

If lint or tests fail locally, they will fail in CI too — fix here, faster loop.

### 5. Push the branch and open a Pull Request

```
git push -u origin feat/short-name
```

Then open a PR on GitHub (banner appears on the repo page, or
`gh pr create` from the terminal). The PR is the "request to enter main".
CI runs the full gate (lint + tests + build) on every PR automatically.

### 6. Merge only on green

Wait for the green check on the PR. Red X = fix on the branch, push again,
CI reruns. When green: **Squash and merge** (keeps main history one clean
commit per feature). Delete the branch after merge — it is disposable.

### 7. Merge = deploy

Merging to `main` triggers the pipeline: migrations + edge function first,
then the frontend. Watch it at GitHub → Actions. When green, verify the
feature live at https://outlierlabs.tech.

### 8. If production breaks anyway

Do not debug on main under pressure. Revert first, investigate calmly:

```
git checkout main && git pull
git revert <bad-commit-hash>
git push
```

Revert creates an "undo" commit; CI redeploys the previous working state
in minutes. (DB migrations do not auto-undo — that is what the backup
from step 3 is for.)

---

## Hard rules

1. Never commit directly to `main`. Everything through a branch + PR.
2. Never merge a red PR "just this once".
3. Never change the database by hand in the dashboard — migrations only.
4. `npm run db:backup` before every migration.
5. Branches live days, not weeks. Big feature? Slice it into small PRs.

## One-time upgrade (recommended)

Make GitHub enforce rule 1 and 2 for you: repo → Settings → Branches →
Add branch ruleset for `main` → require a pull request before merging +
require status checks to pass (select "Lint, Test & Build"). After this,
even an accidental direct push to main is blocked.
