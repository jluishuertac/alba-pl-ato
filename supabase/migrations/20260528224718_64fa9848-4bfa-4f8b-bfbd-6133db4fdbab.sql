
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "recipe photos public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-photos');

CREATE POLICY "users upload own recipe photo"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own recipe photo"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own recipe photo"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recipe-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
