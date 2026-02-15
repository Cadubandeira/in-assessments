-- SQL: Remover user_email (erro anterior) e adicionar user_display_name em assessment_events
-- Execute no Supabase SQL Editor

-- Remover coluna user_email (coluna adicionada por erro)
ALTER TABLE assessment_events
DROP COLUMN IF EXISTS user_email;

-- Adicionar coluna user_display_name se não existir
ALTER TABLE assessment_events
ADD COLUMN IF NOT EXISTS user_display_name TEXT;

-- Comentário (opcional)
COMMENT ON COLUMN assessment_events.user_display_name IS 'Nome de exibição do usuário (ex: do perfil Google Auth)';

-- ==================================================================
-- Preencher retroativamente user_display_name dos assessments antigos
-- ==================================================================
-- Atualizar registros que ainda não possuem display_name
UPDATE assessment_events ae
SET user_display_name = COALESCE(
  au.raw_user_meta_data->>'name',
  au.raw_user_meta_data->>'full_name',
  au.email,
  'Usuário'
)
FROM auth.users au
WHERE ae.user_id = au.id
AND ae.user_display_name IS NULL;

-- Verificar resultado
SELECT COUNT(*) as registros_atualizados
FROM assessment_events
WHERE user_display_name IS NOT NULL;
