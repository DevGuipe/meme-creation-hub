-- Seed required templates to satisfy FK on memes.template_key
INSERT INTO public.templates (key, name, thumb_url, manifest_json)
VALUES 
  ('virgin_vs_chad', 'Virgin vs Chad', NULL, '{}'::jsonb),
  ('yes_chad', 'Yes Chad', NULL, '{}'::jsonb),
  ('chad_classic', 'Chad Classic', NULL, '{}'::jsonb),
  ('chad_pc', 'Chad on PC', NULL, '{}'::jsonb),
  ('before_after', 'Before/After', NULL, '{}'::jsonb),
  ('warrior_mode', 'Warrior Mode', NULL, '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;