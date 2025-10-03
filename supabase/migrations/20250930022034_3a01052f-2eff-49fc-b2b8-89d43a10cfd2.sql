-- 🧹 PRODUCTION DATABASE CLEANUP SCRIPT
-- This script will remove all test/development data while preserving:
-- - Database structure (tables, columns, indexes)
-- - RLS policies and security settings
-- - Database functions and triggers
-- - Templates and assets (core content)
-- - Storage bucket configuration

-- Step 1: Clean up user-generated data (in dependency order)
BEGIN;

-- Delete reactions (references memes)
DELETE FROM public.reactions;

-- Delete reports (references memes)
DELETE FROM public.reports;

-- Delete popcat_events (references users and memes)
DELETE FROM public.popcat_events;

-- Delete leaderboard_snapshots (references users)
DELETE FROM public.leaderboard_snapshots;

-- Delete memes (references users)
DELETE FROM public.memes;

-- Delete users (root table)
DELETE FROM public.users;

-- Step 2: Clean up storage files
-- Note: Storage cleanup will be handled via Edge Function call after this migration

COMMIT;

-- Verify cleanup
DO $$
DECLARE
    user_count INTEGER;
    meme_count INTEGER;
    event_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO meme_count FROM public.memes;
    SELECT COUNT(*) INTO event_count FROM public.popcat_events;
    
    RAISE NOTICE '✅ Cleanup completed:';
    RAISE NOTICE 'Users: % records', user_count;
    RAISE NOTICE 'Memes: % records', meme_count;
    RAISE NOTICE 'Events: % records', event_count;
    
    IF user_count = 0 AND meme_count = 0 AND event_count = 0 THEN
        RAISE NOTICE '🎉 Database successfully cleaned for production!';
    ELSE
        RAISE WARNING '⚠️ Some records may still exist';
    END IF;
END $$;