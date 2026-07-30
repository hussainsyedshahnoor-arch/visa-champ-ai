-- 1. Guest sessions: remove wide-open access
DROP POLICY IF EXISTS "Anyone can read guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can insert guest sessions" ON public.guest_sessions;
DROP POLICY IF EXISTS "Anyone can update guest sessions" ON public.guest_sessions;
REVOKE ALL ON public.guest_sessions FROM anon, authenticated;
GRANT ALL ON public.guest_sessions TO service_role;

-- 2. Chat attachments: owner scoped policies
DROP POLICY IF EXISTS "Anyone can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;

CREATE POLICY "Users can upload own chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat-attachments' AND public.has_role(auth.uid(), 'admin'));

-- 3. Eligibility docs: no anonymous direct uploads (edge function issues signed upload URLs)
DROP POLICY IF EXISTS "Anyone can upload eligibility docs" ON storage.objects;

-- 4. Eligibility document submissions
DROP POLICY IF EXISTS "Anyone can submit eligibility documents" ON public.eligibility_document_submissions;
CREATE POLICY "Users can view own eligibility document submissions"
ON public.eligibility_document_submissions FOR SELECT TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 5. Eligibility leads
CREATE POLICY "Users can view own eligibility leads"
ON public.eligibility_leads FOR SELECT TO authenticated
USING (user_id IS NOT NULL AND user_id = auth.uid());

-- 6. Application notes
CREATE POLICY "Applicants can view notes on own applications"
ON public.application_notes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.applications a
  WHERE a.id = application_notes.application_id AND a.user_id = auth.uid()
));

-- 7. SECURITY DEFINER functions must not be callable from the API
DROP FUNCTION IF EXISTS public.migrate_guest_to_user(text, uuid);
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;