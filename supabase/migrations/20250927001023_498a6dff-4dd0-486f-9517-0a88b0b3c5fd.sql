-- Corrigir política RLS da tabela memes para permitir inserção sem autenticação Supabase
-- O sistema usa validação própria via telegram_id

-- Remover política restritiva atual
DROP POLICY IF EXISTS "Users can create their own memes" ON memes;

-- Criar nova política que permite inserção para qualquer owner_id válido de usuário existente
CREATE POLICY "Users can create memes with valid owner_id" 
ON memes 
FOR INSERT 
WITH CHECK (
  -- Verificar se o owner_id corresponde a um usuário válido na tabela users
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = memes.owner_id 
    AND telegram_id IS NOT NULL
  )
);

-- Também ajustar a política de UPDATE para ser menos restritiva
DROP POLICY IF EXISTS "Users can modify their own memes" ON memes;

CREATE POLICY "Users can modify memes with valid owner_id" 
ON memes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = memes.owner_id 
    AND telegram_id IS NOT NULL
  )
);

-- Ajustar política de DELETE
DROP POLICY IF EXISTS "Users can delete their own memes" ON memes;

CREATE POLICY "Users can delete memes with valid owner_id" 
ON memes 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = memes.owner_id 
    AND telegram_id IS NOT NULL
  )
);