ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS student_count integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS difficult_moment text NOT NULL DEFAULT '';

ALTER TABLE public.model_configurations
  ADD COLUMN IF NOT EXISTS turn_model text;

UPDATE public.model_configurations SET turn_model = 'google/gemini-3.7-flash' WHERE turn_model IS NULL;