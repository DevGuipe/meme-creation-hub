-- Clean all data from tables for production deployment
-- This will delete all memes, reactions, events, and users

-- Delete in order to respect foreign key constraints
DELETE FROM public.reactions;
DELETE FROM public.popcat_events;
DELETE FROM public.memes;
DELETE FROM public.users;

-- Reset sequences if needed (none in this schema)

-- Note: To clean up storage files in the 'memes' bucket, 
-- you'll need to call the cleanup-storage edge function separately