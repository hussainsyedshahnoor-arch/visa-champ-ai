
-- Applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  visa_type_id UUID REFERENCES public.visa_types(id),
  country_id UUID REFERENCES public.countries(id),
  status TEXT NOT NULL DEFAULT 'draft',
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  passport_number TEXT,
  travel_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all applications" ON public.applications FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all applications" ON public.applications FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Application documents table
CREATE TABLE public.application_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own docs" ON public.application_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = application_documents.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can upload own docs" ON public.application_documents FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = application_documents.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can delete own docs" ON public.application_documents FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = application_documents.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Admins can view all docs" ON public.application_documents FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update doc status" ON public.application_documents FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_application_documents_updated_at BEFORE UPDATE ON public.application_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Status history table
CREATE TABLE public.application_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own status history" ON public.application_status_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.applications WHERE applications.id = application_status_history.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Admins can manage status history" ON public.application_status_history FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Storage bucket for application documents
INSERT INTO storage.buckets (id, name, public) VALUES ('application-documents', 'application-documents', false);

CREATE POLICY "Users can upload own app docs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own app docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own app docs" ON storage.objects FOR DELETE
  USING (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all app docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'application-documents' AND has_role(auth.uid(), 'admin'));
