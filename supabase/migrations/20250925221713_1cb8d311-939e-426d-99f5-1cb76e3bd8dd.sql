-- Insert all template data required by the application
INSERT INTO public.templates (key, name, thumb_url, manifest_json) VALUES
('virgin_vs_chad', 'Virgin vs Chad', '/placeholder.svg', '{"type": "comparison", "description": "Classic Virgin vs Chad comparison meme template"}'),
('yes_chad', 'Yes Chad', '/placeholder.svg', '{"type": "single", "description": "Confident Chad agreeing with a statement"}'),
('chad_classic', 'Chad Classic', '/placeholder.svg', '{"type": "single", "description": "Classic Chad pose with inspirational text"}'),
('chad_pc', 'Chad PC', '/placeholder.svg', '{"type": "single", "description": "Chad sitting at computer like a boss"}'),
('before_after', 'Before After', '/placeholder.svg', '{"type": "transformation", "description": "Before and after transformation meme"}'),
('warrior_mode', 'Warrior Mode', '/placeholder.svg', '{"type": "achievement", "description": "Chad in warrior mode with trophy"}')
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  thumb_url = EXCLUDED.thumb_url,
  manifest_json = EXCLUDED.manifest_json;