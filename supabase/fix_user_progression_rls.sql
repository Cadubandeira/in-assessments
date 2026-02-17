-- IMPORTANTE: Corrigir RLS policies para permitir que usuários insiram sua própria progressão
-- As policies anteriores bloqueavam inserção de usuários normais (apenas service_role era permitido)

-- Remover a policy que só permitia service_role
DROP POLICY IF EXISTS "Service role can insert/update progression" ON user_progression;

-- Criar policies corretas:

-- 1. Usuários podem visualizar sua própria progressão
DROP POLICY IF EXISTS "Users can view own progression" ON user_progression;
CREATE POLICY "Users can view own progression"
  ON user_progression FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Usuários podem atualizar sua própria progressão
DROP POLICY IF EXISTS "Users can update own progression" ON user_progression;
CREATE POLICY "Users can update own progression"
  ON user_progression FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. NOVO: Usuários podem inserir sua própria progressão (isso estava faltando!)
DROP POLICY IF EXISTS "Users can insert own progression" ON user_progression;
CREATE POLICY "Users can insert own progression"
  ON user_progression FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Verificar policies
SELECT schemaname, tablename, policyname FROM pg_policies WHERE tablename = 'user_progression';
