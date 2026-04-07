
-- Countries table
CREATE TABLE public.countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  flag_emoji TEXT NOT NULL DEFAULT '🏳️',
  region TEXT NOT NULL DEFAULT 'Other',
  visa_required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (true);

-- Visa types table
CREATE TABLE public.visa_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  processing_days_min INTEGER,
  processing_days_max INTEGER,
  validity_days INTEGER,
  stay_days INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visa_types" ON public.visa_types FOR SELECT USING (true);

-- Required documents table
CREATE TABLE public.visa_required_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_type_id UUID NOT NULL REFERENCES public.visa_types(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  description TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_required_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visa_required_documents" ON public.visa_required_documents FOR SELECT USING (true);

-- Eligibility criteria table
CREATE TABLE public.visa_eligibility_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visa_type_id UUID NOT NULL REFERENCES public.visa_types(id) ON DELETE CASCADE,
  criteria_name TEXT NOT NULL,
  criteria_description TEXT,
  criteria_type TEXT NOT NULL DEFAULT 'text',
  min_value TEXT,
  max_value TEXT,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_eligibility_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read visa_eligibility_criteria" ON public.visa_eligibility_criteria FOR SELECT USING (true);

-- Eligibility checks table (user submissions)
CREATE TABLE public.eligibility_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visa_type_id UUID NOT NULL REFERENCES public.visa_types(id) ON DELETE CASCADE,
  form_data JSONB NOT NULL DEFAULT '{}',
  result TEXT,
  score INTEGER,
  ai_analysis TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eligibility_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own checks" ON public.eligibility_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create checks" ON public.eligibility_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anon can create checks" ON public.eligibility_checks FOR INSERT WITH CHECK (user_id IS NULL);

-- Admin role for CMS management
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin policies for knowledge base tables
CREATE POLICY "Admins manage countries" ON public.countries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage visa_types" ON public.visa_types FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage visa_required_documents" ON public.visa_required_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage visa_eligibility_criteria" ON public.visa_eligibility_criteria FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view user roles
CREATE POLICY "Admins view roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Timestamp triggers
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_visa_types_updated_at BEFORE UPDATE ON public.visa_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
