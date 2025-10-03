-- Add new reaction types to the enum
ALTER TYPE reaction_type ADD VALUE IF NOT EXISTS 'flex';
ALTER TYPE reaction_type ADD VALUE IF NOT EXISTS 'chad';

-- Add new testosterone event sources for the new reactions  
ALTER TYPE testo_source ADD VALUE IF NOT EXISTS 'reaction_flex';
ALTER TYPE testo_source ADD VALUE IF NOT EXISTS 'reaction_chad';