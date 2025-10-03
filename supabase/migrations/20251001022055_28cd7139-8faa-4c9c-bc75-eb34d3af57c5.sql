-- Populate templates table with all available templates
INSERT INTO public.templates (key, name, manifest_json, thumb_url) VALUES
  (
    'popcat_vs_normie',
    'POPCAT vs Normie',
    '{"description": "Compare normie vs POPCAT lifestyle", "layers": ["background", "body_left", "head_left", "text_left", "body_right", "head_right", "text_right"]}'::jsonb,
    NULL
  ),
  (
    'yes_popcat',
    'Yes POPCAT',
    '{"description": "Classic agreeing POPCAT meme", "layers": ["background", "body", "head", "text"]}'::jsonb,
    NULL
  ),
  (
    'popcat_classic',
    'POPCAT Classic',
    '{"description": "Classic POPCAT template", "layers": ["background", "body", "head", "text"]}'::jsonb,
    NULL
  ),
  (
    'popcat_gamer',
    'POPCAT Gamer',
    '{"description": "POPCAT at gaming setup", "layers": ["background", "body", "head", "text", "props"]}'::jsonb,
    NULL
  ),
  (
    'before_after',
    'Before/After',
    '{"description": "Transformation comparison template", "layers": ["background", "body_before", "head_before", "text_before", "body_after", "head_after", "text_after"]}'::jsonb,
    NULL
  ),
  (
    'warrior_mode',
    'Warrior Mode',
    '{"description": "Epic warrior POPCAT template", "layers": ["background", "body", "head", "text", "trophy"]}'::jsonb,
    NULL
  )
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  manifest_json = EXCLUDED.manifest_json;