
-- User document vault
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'other',
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  notes text,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all documents" ON public.documents FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Document requests from officers
CREATE TABLE public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  response_file_path text,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own doc requests" ON public.document_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = document_requests.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Users can update own doc requests" ON public.document_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM applications WHERE applications.id = document_requests.application_id AND applications.user_id = auth.uid()));
CREATE POLICY "Admins can view all doc requests" ON public.document_requests FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create doc requests" ON public.document_requests FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update doc requests" ON public.document_requests FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete doc requests" ON public.document_requests FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_document_requests_updated_at BEFORE UPDATE ON public.document_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for user documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('user-documents', 'user-documents', false);

CREATE POLICY "Users can upload own docs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own docs" ON storage.objects FOR DELETE
  USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all user docs" ON storage.objects FOR SELECT
  USING (bucket_id = 'user-documents' AND public.has_role(auth.uid(), 'admin'));
