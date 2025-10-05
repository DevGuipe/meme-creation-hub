-- Clean all data from database for production deployment
-- Removes all memes, reactions, events, and users

-- Delete in order to respect foreign key constraints
DELETE FROM public.reactions;
DELETE FROM public.popcat_events;
DELETE FROM public.memes;
DELETE FROM public.users;

-- Note: Storage files in 'memes' bucket need to be cleaned via cleanup-storage edge function