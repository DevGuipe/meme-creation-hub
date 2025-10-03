-- Update enum values to be more POPCAT themed
ALTER TYPE reaction_type RENAME VALUE 'chad' TO 'popcat';

-- Update popcat_source enum to rename chad-related values  
CREATE TYPE popcat_source_new AS ENUM (
  'save_meme',
  'face_upload',
  'publish', 
  'reaction',
  'weekly_challenge',
  'tournament',
  'reaction_flex',
  'reaction_popcat',
  'publish_group',
  'reaction_moai',
  'weekly_winner',
  'reaction_thumbs',
  'reaction_laugh'
);

-- Update the table to use new enum
ALTER TABLE popcat_events 
ALTER COLUMN source TYPE popcat_source_new USING 
  CASE source::text
    WHEN 'self_chad' THEN 'face_upload'::popcat_source_new
    WHEN 'reaction_chad' THEN 'reaction_popcat'::popcat_source_new
    ELSE source::text::popcat_source_new
  END;

-- Drop old enum
DROP TYPE popcat_source;

-- Rename new enum to final name
ALTER TYPE popcat_source_new RENAME TO popcat_source;