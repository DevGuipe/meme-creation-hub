-- Reset database - Clear all user data and memes
-- This will remove all user-generated content but keep templates and assets

-- Clear all user-generated data in the correct order (respecting foreign keys)
DELETE FROM public.reactions;
DELETE FROM public.reports; 
DELETE FROM public.testo_events;
DELETE FROM public.leaderboard_snapshots;
DELETE FROM public.memes;
DELETE FROM public.users;

-- Clear storage bucket (remove all meme images)
DELETE FROM storage.objects WHERE bucket_id = 'memes';

-- Reset any sequences if needed
-- Note: UUID primary keys don't use sequences, so no action needed

-- Verify cleanup
SELECT 'Users' as table_name, COUNT(*) as remaining_records FROM public.users
UNION ALL
SELECT 'Memes' as table_name, COUNT(*) as remaining_records FROM public.memes  
UNION ALL
SELECT 'Reactions' as table_name, COUNT(*) as remaining_records FROM public.reactions
UNION ALL
SELECT 'Reports' as table_name, COUNT(*) as remaining_records FROM public.reports
UNION ALL
SELECT 'Testo Events' as table_name, COUNT(*) as remaining_records FROM public.testo_events
UNION ALL
SELECT 'Leaderboard Snapshots' as table_name, COUNT(*) as remaining_records FROM public.leaderboard_snapshots
UNION ALL
SELECT 'Storage Objects' as table_name, COUNT(*) as remaining_records FROM storage.objects WHERE bucket_id = 'memes';