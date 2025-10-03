-- Reset database by clearing all user-generated data
-- Keep users, templates, and assets but clear memes and related data

-- Clear all reactions first (foreign key to memes)
DELETE FROM public.reactions;

-- Clear all reports (foreign key to memes)  
DELETE FROM public.reports;

-- Clear all testosterone events
DELETE FROM public.testo_events;

-- Clear all leaderboard snapshots
DELETE FROM public.leaderboard_snapshots;

-- Clear all memes
DELETE FROM public.memes;

-- Reset any sequences if needed
-- Note: UUIDs use gen_random_uuid() so no sequence reset needed