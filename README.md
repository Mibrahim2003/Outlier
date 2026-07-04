## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create `.env.local` and configure:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Configure Edge Function secrets:
   - `GEMINI_API_KEY` (using `npx supabase secrets set GEMINI_API_KEY="..."`)
4. Run the app:
   `npm run dev`

## Supabase persistence

The app now uses Supabase as the source of truth for:
- `profiles`
- `courses`
- `deadlines`
- `todos`
- `course_deliverables`
- `academic_calendars`
- `onboarding_states`

Expected columns:

### `profiles`
- `user_id` (unique, text/uuid)
- `name`, `degree`, `university_name`, `graduation_year`, `current_cgpa`, `target_gpa`, `semester`, `course_count`
- `grading_scale` (json), `ai_persona` (text), `auto_generate_insights` (boolean), `sound_enabled` (boolean, default true)

### `courses`
- `id` (text)
- `user_id`
- `code`, `name`, `credits`, `grade_progress`, `impact_level`, `grade`, `weightage` (json)

### `deadlines`
- `id` (text)
- `user_id`
- `title`, `course`, `topic`, `due_date`, `priority`

### `onboarding_states`
- `user_id` (unique)
- `loadout_committed` (boolean)
- `committed_at` (timestamp nullable)
- `version` (number)

### `todos`
- `id` (text)
- `user_id`
- `title`, `completed`, `dueDate`, `courseId` (optional), `createdAt`

### `course_deliverables`
- `id` (text)
- `user_id`
- `title`, `type`, `course_id`, `due_date`, `weight`, `score`, `max_score`, `completed`

### `academic_calendars`
- `id` (uuid)
- `user_id`
- `semesters` (jsonb), `raw_text`, `uploaded_at`, `created_at`
