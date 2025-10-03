-- Limpar todos os dados do projeto (mantendo estrutura)

-- Deletar todos os eventos POPCAT
DELETE FROM public.popcat_events;

-- Deletar todas as reações
DELETE FROM public.reactions;

-- Deletar todos os reports
DELETE FROM public.reports;

-- Deletar todos os snapshots do leaderboard  
DELETE FROM public.leaderboard_snapshots;

-- Deletar todos os memes
DELETE FROM public.memes;

-- Deletar todos os usuários (exceto dados de auth)
DELETE FROM public.users;

-- Limpar storage bucket de memes
DELETE FROM storage.objects WHERE bucket_id = 'memes';

-- Reset sequences se necessário
SELECT setval(pg_get_serial_sequence('public.popcat_events', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.reactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.reports', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.leaderboard_snapshots', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.memes', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('public.users', 'id'), 1, false);