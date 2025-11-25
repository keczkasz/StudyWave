-- Add column to track total time actually listened (not just duration)
ALTER TABLE public.audio_files
ADD COLUMN IF NOT EXISTS total_listened_seconds integer DEFAULT 0;

COMMENT ON COLUMN public.audio_files.total_listened_seconds IS 'Total time in seconds that the user has actually listened to this audiobook';