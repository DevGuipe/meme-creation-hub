-- Add missing and new enum values
DO $$ BEGIN
  -- for testo events when publishing in groups
  ALTER TYPE testo_source ADD VALUE IF NOT EXISTS 'publish_group';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- new reaction type for moai
  ALTER TYPE reaction_type ADD VALUE IF NOT EXISTS 'moai';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- testo source for moai reaction
  ALTER TYPE testo_source ADD VALUE IF NOT EXISTS 'reaction_moai';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
