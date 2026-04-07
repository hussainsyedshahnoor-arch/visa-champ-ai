
-- Guest sessions table
CREATE TABLE public.guest_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id TEXT NOT NULL UNIQUE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Guests need public read/write access (no auth)
CREATE POLICY "Anyone can read guest sessions" ON public.guest_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert guest sessions" ON public.guest_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update guest sessions" ON public.guest_sessions FOR UPDATE USING (true);

-- Allow chat_sessions to optionally track guest_id for migration
ALTER TABLE public.chat_sessions ADD COLUMN guest_id TEXT;

-- Allow chat_sessions without user_id for guests
ALTER TABLE public.chat_sessions ALTER COLUMN user_id DROP NOT NULL;

-- Add policy for guests to create sessions
CREATE POLICY "Guests can create sessions" ON public.chat_sessions FOR INSERT WITH CHECK (user_id IS NULL AND guest_id IS NOT NULL);
CREATE POLICY "Guests can view own sessions" ON public.chat_sessions FOR SELECT USING (guest_id IS NOT NULL AND user_id IS NULL);

-- Add policy for guests to insert messages into their sessions
CREATE POLICY "Guests can view own messages" ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND user_id IS NULL AND guest_id IS NOT NULL));
CREATE POLICY "Guests can create messages in guest sessions" ON public.chat_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND user_id IS NULL AND guest_id IS NOT NULL));

-- Function to migrate guest data to user account
CREATE OR REPLACE FUNCTION public.migrate_guest_to_user(_guest_id TEXT, _user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET user_id = _user_id, guest_id = NULL
  WHERE guest_id = _guest_id AND user_id IS NULL;

  DELETE FROM public.guest_sessions WHERE guest_id = _guest_id;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_guest_sessions_updated_at
  BEFORE UPDATE ON public.guest_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
