-- Add video and FAQ settings to platform_settings
INSERT INTO platform_settings (key, value, description)
VALUES 
  ('landing_video_url', '', 'URL for the landing page tutorial video'),
  ('user_dashboard_video_url', '', 'URL for the user dashboard tutorial video'),
  ('faq_items', '[]', 'JSON array of FAQ items with question and answer fields')
ON CONFLICT (key) DO NOTHING;

-- Create a storage bucket for videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video uploads
CREATE POLICY "Admins can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Public can view videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'videos');

CREATE POLICY "Admins can delete videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);