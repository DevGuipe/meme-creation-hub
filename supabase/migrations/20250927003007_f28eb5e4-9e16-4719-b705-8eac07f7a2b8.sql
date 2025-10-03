-- Clear all user data for fresh testing
-- Keep table structures, only delete data

-- Clear memes table
DELETE FROM public.memes;

-- Clear popcat events  
DELETE FROM public.popcat_events;

-- Clear reactions
DELETE FROM public.reactions;

-- Clear reports
DELETE FROM public.reports;

-- Clear leaderboard snapshots
DELETE FROM public.leaderboard_snapshots;

-- Clear users table (this will cascade to related data)
DELETE FROM public.users;