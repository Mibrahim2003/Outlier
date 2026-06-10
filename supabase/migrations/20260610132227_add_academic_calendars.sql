CREATE TABLE IF NOT EXISTS public.academic_calendars (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    semesters jsonb NOT NULL DEFAULT '[]'::jsonb,
    raw_text text,
    uploaded_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT academic_calendars_pkey PRIMARY KEY (id),
    CONSTRAINT academic_calendars_user_id_key UNIQUE (user_id),
    CONSTRAINT academic_calendars_semesters_array CHECK (jsonb_typeof(semesters) = 'array')
);

ALTER TABLE public.academic_calendars ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own academic calendars" 
    ON public.academic_calendars 
    FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
