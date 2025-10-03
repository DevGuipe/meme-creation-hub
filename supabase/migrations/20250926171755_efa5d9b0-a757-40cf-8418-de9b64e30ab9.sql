-- Clear all data from the database tables
-- This will reset the system to a clean state

-- Delete all reactions first (references memes)
DELETE FROM public.reactions;

-- Delete all reports (references memes)  
DELETE FROM public.reports;

-- Delete all testosterone events (references users and memes)
DELETE FROM public.testo_events;

-- Delete all leaderboard snapshots (references users)
DELETE FROM public.leaderboard_snapshots;

-- Delete all memes (references users)
DELETE FROM public.memes;

-- Delete all users (main user table)
DELETE FROM public.users;

-- Reset any sequences if needed (optional, but ensures clean start)
-- Note: UUIDs don't use sequences, but keeping for completeness