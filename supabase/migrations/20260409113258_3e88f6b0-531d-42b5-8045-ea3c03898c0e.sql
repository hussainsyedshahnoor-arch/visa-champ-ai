
-- Audit log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  target_table text,
  target_id text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);

-- Flagged AI responses table
CREATE TABLE public.flagged_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE SET NULL,
  message_content text NOT NULL,
  flag_reason text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'pending',
  reviewer_id uuid,
  reviewer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.flagged_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view flagged responses" ON public.flagged_responses
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update flagged responses" ON public.flagged_responses
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert flagged responses" ON public.flagged_responses
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_flagged_responses_updated_at
  BEFORE UPDATE ON public.flagged_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Application notes table
CREATE TABLE public.application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notes" ON public.application_notes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create notes" ON public.application_notes
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update own notes" ON public.application_notes
  FOR UPDATE USING (author_id = auth.uid());
CREATE POLICY "Admins can delete own notes" ON public.application_notes
  FOR DELETE USING (author_id = auth.uid());

CREATE TRIGGER update_application_notes_updated_at
  BEFORE UPDATE ON public.application_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.application_notes;
