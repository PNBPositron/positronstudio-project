CREATE TABLE public.public_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  tokens jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.public_themes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_themes TO authenticated;
GRANT ALL ON public.public_themes TO service_role;

ALTER TABLE public.public_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public themes" ON public.public_themes FOR SELECT USING (true);
CREATE POLICY "Users can publish their own themes" ON public.public_themes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own themes" ON public.public_themes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own themes" ON public.public_themes FOR DELETE TO authenticated USING (auth.uid() = user_id);