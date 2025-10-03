-- Enable realtime for popcat_events table
ALTER TABLE public.popcat_events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.popcat_events;