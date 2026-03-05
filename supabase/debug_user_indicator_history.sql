-- ================================
-- DEBUG: user_indicator_history FK violation
-- ================================

-- 1. Ver todos os indicator_ids em user_indicator_history que NÃO existem em indicators_master
SELECT uih.id, uih.user_id, uih.indicator_id, uih.indicator_name, uih.source_event_id, uih.created_at
FROM user_indicator_history uih
WHERE uih.indicator_id IS NOT NULL
  AND uih.indicator_id NOT IN (SELECT id FROM indicators_master)
ORDER BY uih.created_at DESC
LIMIT 20;

-- 2. Ver todos os IDs válidos em indicators_master (para confirmar o mapeamento)
SELECT id, name, created_at
FROM indicators_master
ORDER BY created_at DESC;

-- 3. Ver última tentativa de insert em assessment_events (seu último assessment)
SELECT id, user_id, assessment_id, total_score, max_possible_score, 
       indicator_scores_snapshot, created_at
FROM assessment_events
ORDER BY created_at DESC
LIMIT 1;

-- 4. Ver qual assessment é do tipo 'niveis'
SELECT id, name, schema, type, is_active
FROM assessments
WHERE schema = 'niveis'
  OR type = 'niveis'
ORDER BY created_at DESC;

-- 5. Ver assessment_version_id do seu último assessment
SELECT id, assessment_id, version_number, is_active, schema, level_mode
FROM assessment_versions
WHERE schema = 'niveis'
  AND is_active = true
ORDER BY created_at DESC;

-- 6. Ver assessment_indicators (que deveriam ter indicator_master_id válido)
SELECT ai.id, ai.assessment_version_id, ai.indicator_master_id, am.name as indicator_name
FROM assessment_indicators ai
LEFT JOIN indicators_master am ON am.id = ai.indicator_master_id
WHERE ai.indicator_master_id IS NULL
ORDER BY ai.created_at DESC;

-- 7. Ver todas as tentativas de insert que falharam NAS LOGS (se disponível)
-- Esta query depende da configuração de logs do Supabase
SELECT event_id, error_message, created_at
FROM realtime.messages
WHERE error_message LIKE '%user_indicator_history%'
ORDER BY created_at DESC
LIMIT 10;
