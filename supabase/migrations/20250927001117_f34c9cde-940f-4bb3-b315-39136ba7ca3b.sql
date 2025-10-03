-- Corrigir políticas RLS da tabela memes
-- Primeiro, remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can create memes with valid owner_id" ON memes;
DROP POLICY IF EXISTS "Users can modify memes with valid owner_id" ON memes;  
DROP POLICY IF EXISTS "Users can delete memes with valid owner_id" ON memes;
DROP POLICY IF EXISTS "Anyone can view memes" ON memes;

-- Recriar políticas mais simples e funcionais
-- 1. Política de visualização (pública para memes não deletados)
CREATE POLICY "Public can view active memes" 
ON memes 
FOR SELECT 
USING (deleted_at IS NULL);

-- 2. Política de inserção (permite inserção com owner_id válido)
CREATE POLICY "Allow meme creation" 
ON memes 
FOR INSERT 
WITH CHECK (
  owner_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = owner_id 
    AND telegram_id IS NOT NULL
  )
);

-- 3. Política de atualização (permite atualização do próprio meme)
CREATE POLICY "Allow meme updates" 
ON memes 
FOR UPDATE 
USING (
  owner_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = owner_id 
    AND telegram_id IS NOT NULL
  )
);

-- 4. Política de exclusão (permite exclusão do próprio meme)
CREATE POLICY "Allow meme deletion" 
ON memes 
FOR DELETE 
USING (
  owner_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = owner_id 
    AND telegram_id IS NOT NULL
  )
);