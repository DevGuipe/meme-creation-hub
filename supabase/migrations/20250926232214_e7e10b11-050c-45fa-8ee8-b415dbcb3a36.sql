-- Create new popcat_source enum and update references
CREATE TYPE popcat_source AS ENUM (
  'save_meme',
  'self_chad', 
  'publish',
  'reaction',
  'weekly_challenge',
  'tournament',
  'reaction_flex',
  'reaction_chad',
  'publish_group',
  'reaction_moai',
  'weekly_winner',
  'reaction_thumbs',
  'reaction_laugh'
);

-- Update popcat_events table to use new enum
ALTER TABLE popcat_events 
ALTER COLUMN source TYPE popcat_source USING source::text::popcat_source;

-- Update foreign key names to reflect new table name
ALTER TABLE popcat_events 
  DROP CONSTRAINT IF EXISTS testo_events_meme_id_fkey,
  DROP CONSTRAINT IF EXISTS testo_events_user_id_fkey;

ALTER TABLE popcat_events 
  ADD CONSTRAINT popcat_events_meme_id_fkey 
    FOREIGN KEY (meme_id) REFERENCES memes(id),
  ADD CONSTRAINT popcat_events_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);