-- ================================
-- QUERIES PARA DEBUG - VIOLÊNCIA ZERO
-- ================================

-- 1. Verificar o assessment e seu schema
SELECT id, name, schema, version, is_active, created_at
FROM assessments
WHERE name LIKE '%Viol%'
ORDER BY created_at DESC;

-- 2. Verificar a versão ativa do assessment
-- (Substitua o ID do assessment na linha abaixo)
SELECT av.id, av.version_number, av.is_active, av.schema, av.level_mode,
       av.introduction_html IS NOT NULL as has_intro,
       av.final_reflection IS NOT NULL as has_reflection,
       av.result_introduction IS NOT NULL as has_result_intro
FROM assessment_versions av
WHERE av.assessment_id = 'COLE_AQUI_O_ID_DO_ASSESSMENT'
ORDER BY av.version_number DESC;

-- 3. Verificar overall_ranges (Faixas de interpretação global)
-- (Substitua o ID da versão na linha abaixo)
SELECT id, min_score, max_score, label, interpretation
FROM assessment_overall_ranges
WHERE assessment_version_id = 'COLE_AQUI_O_ID_DA_VERSAO'
ORDER BY min_score ASC;

-- 4. Verificar níveis (assessment_levels)
-- (Substitua o ID da versão na linha abaixo)
SELECT id, name, description, display_order, 
       acquire_threshold, potential_threshold
FROM assessment_levels
WHERE assessment_version_id = 'COLE_AQUI_O_ID_DA_VERSAO'
ORDER BY display_order ASC;

-- 5. Verificar questões por nível
-- (Substitua o ID do nível na linha abaixo)
SELECT id, text, response_type, is_required, display_order
FROM questions
WHERE level_id = 'COLE_AQUI_O_ID_DO_NIVEL'
ORDER BY display_order ASC;

-- 6. Verificar alternativas de uma questão
-- (Substitua o ID da questão na linha abaixo)
SELECT id, text, score_value, score_target, display_order
FROM alternatives
WHERE question_id = 'COLE_AQUI_O_ID_DA_QUESTAO'
ORDER BY display_order ASC;

-- ================================
-- QUERIES COMPLETAS (JOIN)
-- ================================

-- 7. Ver TUDO do assessment Violência Zero de uma vez
SELECT 
    a.name as assessment_name,
    a.schema as assessment_schema,
    av.version_number,
    av.schema as version_schema,
    av.level_mode,
    al.name as level_name,
    al.display_order as level_order,
    q.text as question_text,
    q.display_order as question_order,
    alt.text as alternative_text,
    alt.score_value,
    alt.score_target,
    alt.display_order as alt_order
FROM assessments a
JOIN assessment_versions av ON av.assessment_id = a.id
LEFT JOIN assessment_levels al ON al.assessment_version_id = av.id
LEFT JOIN questions q ON q.level_id = al.id
LEFT JOIN alternatives alt ON alt.question_id = q.id
WHERE a.name LIKE '%Viol%'
  AND av.is_active = true
ORDER BY al.display_order, q.display_order, alt.display_order;

-- 8. Contar dados por tabela
SELECT 
    'Assessments' as tabela,
    COUNT(*) as total
FROM assessments
WHERE name LIKE '%Viol%'

UNION ALL

SELECT 
    'Versions',
    COUNT(*)
FROM assessment_versions av
JOIN assessments a ON a.id = av.assessment_id
WHERE a.name LIKE '%Viol%'

UNION ALL

SELECT 
    'Overall Ranges',
    COUNT(*)
FROM assessment_overall_ranges aor
JOIN assessment_versions av ON av.id = aor.assessment_version_id
JOIN assessments a ON a.id = av.assessment_id
WHERE a.name LIKE '%Viol%'

UNION ALL

SELECT 
    'Levels',
    COUNT(*)
FROM assessment_levels al
JOIN assessment_versions av ON av.id = al.assessment_version_id
JOIN assessments a ON a.id = av.assessment_id
WHERE a.name LIKE '%Viol%'

UNION ALL

SELECT 
    'Questions',
    COUNT(*)
FROM questions q
JOIN assessment_levels al ON al.id = q.level_id
JOIN assessment_versions av ON av.id = al.assessment_version_id
JOIN assessments a ON a.id = av.assessment_id
WHERE a.name LIKE '%Viol%'

UNION ALL

SELECT 
    'Alternatives',
    COUNT(*)
FROM alternatives alt
JOIN questions q ON q.id = alt.question_id
JOIN assessment_levels al ON al.id = q.level_id
JOIN assessment_versions av ON av.id = al.assessment_version_id
JOIN assessments a ON a.id = av.assessment_id
WHERE a.name LIKE '%Viol%';

-- 9. Ver apenas os overall_ranges do Violência Zero
SELECT 
    a.name as assessment,
    aor.min_score,
    aor.max_score,
    aor.label,
    LEFT(aor.interpretation, 50) as interpretation_preview
FROM assessment_overall_ranges aor
JOIN assessment_versions av ON av.id = aor.assessment_version_id
JOIN assessments a ON a.id = av.assessment_id
WHERE a.name LIKE '%Viol%'
  AND av.is_active = true
ORDER BY aor.min_score;
