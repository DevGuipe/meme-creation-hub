-- 3. Configurar cron job automático (toda segunda-feira 00:00 UTC)
SELECT cron.schedule(
  'weekly-competition-reset',
  '0 0 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://imyajbdqytdrefdnvgej.supabase.co/functions/v1/weekly-reset',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlteWFqYmRxeXRkcmVmZG52Z2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2OTcwMTMsImV4cCI6MjA3NDI3MzAxM30.g-L3kqDeb9S0V80e_xLZb067_Cwnwv_ooH4NLR-TG-A"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);