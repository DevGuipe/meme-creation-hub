-- Complete database and storage reset
-- Delete all data from tables in reverse dependency order
DELETE FROM public.reactions;
DELETE FROM public.reports;
DELETE FROM public.leaderboard_snapshots;
DELETE FROM public.testo_events;
DELETE FROM public.memes;
DELETE FROM public.users;
DELETE FROM public.templates;
DELETE FROM public.assets;

-- Clear all files from storage buckets
DELETE FROM storage.objects WHERE bucket_id = 'memes';

-- Reset any sequences if needed
SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('memes', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('reactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('reports', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('testo_events', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('leaderboard_snapshots', 'id'), 1, false);