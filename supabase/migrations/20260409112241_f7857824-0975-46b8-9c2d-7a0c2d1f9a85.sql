
-- Create chat attachments bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Allow anyone to upload
CREATE POLICY "Anyone can upload chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-attachments');

-- Allow anyone to view
CREATE POLICY "Anyone can view chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat-attachments');
