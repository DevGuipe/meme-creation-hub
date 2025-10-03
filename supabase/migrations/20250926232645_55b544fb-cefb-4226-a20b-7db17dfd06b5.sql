-- Update template keys to match new POPCAT branding
-- Only update if the old keys exist to avoid errors

UPDATE templates 
SET key = 'popcat_vs_normie' 
WHERE key = 'virgin_vs_chad';

UPDATE templates 
SET key = 'yes_popcat' 
WHERE key = 'yes_chad';

UPDATE templates 
SET key = 'popcat_classic' 
WHERE key = 'chad_classic';

UPDATE templates 
SET key = 'popcat_gamer' 
WHERE key = 'chad_pc';

-- Update any existing memes that reference the old template keys
UPDATE memes 
SET template_key = 'popcat_vs_normie' 
WHERE template_key = 'virgin_vs_chad';

UPDATE memes 
SET template_key = 'yes_popcat' 
WHERE template_key = 'yes_chad';

UPDATE memes 
SET template_key = 'popcat_classic' 
WHERE template_key = 'chad_classic';

UPDATE memes 
SET template_key = 'popcat_gamer' 
WHERE template_key = 'chad_pc';