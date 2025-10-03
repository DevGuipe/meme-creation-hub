-- Add the new testo_source value for weekly winners
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'weekly_winner' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'testo_source')) THEN
        ALTER TYPE testo_source ADD VALUE 'weekly_winner';
    END IF;
END $$;