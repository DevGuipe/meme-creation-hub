-- ============================================
-- LIMPAR BANCO DE DADOS PARA TESTES
-- Remove todos os dados das tabelas (mantém estrutura)
-- ============================================

-- 1. Deletar dados de tabelas dependentes primeiro
DELETE FROM public.reactions;
DELETE FROM public.reports;
DELETE FROM public.leaderboard_snapshots;
DELETE FROM public.popcat_events;

-- 2. Deletar memes (tem FK para users)
DELETE FROM public.memes;

-- 3. Por último, deletar users (cascata vai limpar referências restantes)
DELETE FROM public.users;

-- 4. Resetar sequências se houver (não temos, mas deixo como exemplo)
-- ALTER SEQUENCE IF EXISTS some_sequence RESTART WITH 1;

-- LOG de confirmação
DO $$
BEGIN
  RAISE NOTICE '✅ Banco de dados limpo com sucesso!';
  RAISE NOTICE 'Todas as tabelas foram esvaziadas mas a estrutura foi mantida.';
  RAISE NOTICE '⚠️ ATENÇÃO: Limpe manualmente o bucket "memes" no Supabase Dashboard > Storage';
END $$;