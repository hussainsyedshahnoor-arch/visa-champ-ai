CREATE TABLE public.eligibility_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_token UUID NOT NULL UNIQUE,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  whatsapp TEXT,
  country_name TEXT,
  visa_type_name TEXT,
  current_step INTEGER,
  furthest_step INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score INTEGER,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.eligibility_leads TO authenticated;
GRANT ALL ON public.eligibility_leads TO service_role;

ALTER TABLE public.eligibility_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view leads" ON public.eligibility_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update leads" ON public.eligibility_leads FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete leads" ON public.eligibility_leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_eligibility_leads_updated_at BEFORE UPDATE ON public.eligibility_leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_eligibility_leads_status ON public.eligibility_leads(status);