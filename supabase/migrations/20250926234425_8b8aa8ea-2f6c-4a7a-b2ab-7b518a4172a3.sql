-- Fix RLS policies for popcat_events table
-- Remove old policies with testo naming
DROP POLICY IF EXISTS "Users can view their own testo events" ON public.popcat_events;
DROP POLICY IF EXISTS "System can create testo events" ON public.popcat_events;

-- Create proper POPCAT policies
CREATE POLICY "Users can view their own popcat events" 
ON public.popcat_events 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

CREATE POLICY "System can create popcat events" 
ON public.popcat_events 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert events for themselves
CREATE POLICY "Users can create their own popcat events" 
ON public.popcat_events 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());