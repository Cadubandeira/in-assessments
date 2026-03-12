/**
 * Utilitário para trabalhar com versionamento de assessments
 */
import { supabase } from '../supabaseClient';

/**
 * Busca a versão ativa de um assessment
 * @param {string} assessmentId - ID do assessment
 * @returns {Promise<Object>} Versão ativa do assessment
 */
export async function getActiveAssessmentVersion(assessmentId) {
  const { data, error } = await supabase
    .from('assessment_versions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  // Retrocompatibilidade: assessments legados/duplicados podem não ter versão ativa ainda.
  const { data: latestVersion, error: latestError } = await supabase
    .from('assessment_versions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;
  if (!latestVersion) throw new Error('Nenhuma versão encontrada para este assessment.');

  return latestVersion;
}

/**
 * Busca uma versão específica de um assessment
 * @param {string} versionId - ID da versão
 * @returns {Promise<Object>} Versão do assessment
 */
export async function getAssessmentVersion(versionId) {
  const { data, error } = await supabase
    .from('assessment_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Versão não encontrada.');

  return data;
}

/**
 * Cria uma nova versão de um assessment
 * @param {string} assessmentId - ID do assessment
 * @param {string} previousVersionId - ID da versão anterior (para copiar dados)
 * @returns {Promise<Object>} Nova versão criada
 */
export async function createNewAssessmentVersion(assessmentId, previousVersionId = null) {
  // 1. Buscar o assessment pai para pegar visualization_type default
  const { data: assessmentData } = await supabase
    .from('assessments')
    .select('visualization_type')
    .eq('id', assessmentId)
    .single();

  // 2. Buscar a versão anterior se existir
  let previousVersionData = null;
  if (previousVersionId) {
    const { data: prevVersion } = await supabase
      .from('assessment_versions')
      .select('version_number, visualization_type, introduction_html')
      .eq('id', previousVersionId)
      .single();
    previousVersionData = prevVersion;
  }

  // 3. Buscar o número da última versão
  const { data: versions } = await supabase
    .from('assessment_versions')
    .select('version_number')
    .eq('assessment_id', assessmentId)
    .order('version_number', { ascending: false })
    .limit(1);

  const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1;
  
  // Determinar visualization_type: usar da versão anterior, senão do assessment pai, senão default
  let visualizationType = ["radar"]; // Default em JavaScript
  if (previousVersionData?.visualization_type) {
    visualizationType = previousVersionData.visualization_type;
  } else if (assessmentData?.visualization_type) {
    visualizationType = assessmentData.visualization_type;
  }

  // Copiar introduction_html da versão anterior, se existir
  const introductionHtml = previousVersionData?.introduction_html || '';

  // 4. Criar nova versão (inativa por padrão)
  const { data: newVersion, error: versionError } = await supabase
    .from('assessment_versions')
    .insert([{
      assessment_id: assessmentId,
      version_number: nextVersionNumber,
      is_active: false,
      visualization_type: visualizationType,
      introduction_html: introductionHtml
    }])
    .select()
    .single();

  if (versionError) throw versionError;

  // 5. Se há versão anterior, copiar indicadores, ranges e overall_ranges
  if (previousVersionId) {
    // Buscar indicadores da versão anterior
    const { data: oldIndicators, error: indicatorsError } = await supabase
      .from('assessment_indicators')
      .select('*, assessment_indicator_ranges(*)')
      .eq('assessment_version_id', previousVersionId);

    if (indicatorsError) throw indicatorsError;

    // Copiar indicadores para nova versão
    if (oldIndicators && oldIndicators.length > 0) {
      for (const oldInd of oldIndicators) {
        const { data: newIndicator, error: newIndError } = await supabase
          .from('assessment_indicators')
          .insert([{
            assessment_version_id: newVersion.id,
            indicator_master_id: oldInd.indicator_master_id,
            display_order: oldInd.display_order
          }])
          .select()
          .single();

        if (newIndError) throw newIndError;

        // Copiar ranges
        if (oldInd.assessment_indicator_ranges && oldInd.assessment_indicator_ranges.length > 0) {
          const rangesToInsert = oldInd.assessment_indicator_ranges.map(range => ({
            assessment_indicator_id: newIndicator.id,
            min_score: range.min_score,
            max_score: range.max_score,
            label: range.label,
            interpretation: range.interpretation
          }));

          const { error: rangesError } = await supabase
            .from('assessment_indicator_ranges')
            .insert(rangesToInsert);

          if (rangesError) throw rangesError;
        }
      }
    }

    // Copiar overall_ranges da versão anterior (Novo - Retrocompatível)
    const { data: oldOverallRanges, error: overallRangesError } = await supabase
      .from('assessment_overall_ranges')
      .select('*')
      .eq('assessment_version_id', previousVersionId);

    if (overallRangesError) {
      console.warn('⚠️ Aviso ao copiar overall_ranges:', overallRangesError);
      // Não lançar erro aqui - é retrocompatível, versões antigas podem não ter overall_ranges
    }

    if (oldOverallRanges && oldOverallRanges.length > 0) {
      const overallRangesToInsert = oldOverallRanges.map(range => ({
        assessment_version_id: newVersion.id,
        min_score: range.min_score,
        max_score: range.max_score,
        label: range.label,
        interpretation: range.interpretation
      }));

      const { error: insertOvError } = await supabase
        .from('assessment_overall_ranges')
        .insert(overallRangesToInsert);

      if (insertOvError) {
        console.error('❌ Erro ao copiar overall_ranges:', insertOvError);
        throw insertOvError;
      }
      console.log(`✅ ${overallRangesToInsert.length} overall_range(s) copiada(s) da versão anterior`);
    }
  }

  return newVersion;
}

/**
 * Ativa uma versão específica de um assessment (desativa as outras)
 * @param {string} assessmentId - ID do assessment
 * @param {string} versionId - ID da versão a ser ativada
 */
export async function activateAssessmentVersion(assessmentId, versionId) {
  // 1. Desativar todas as versões do assessment
  const { error: deactivateError } = await supabase
    .from('assessment_versions')
    .update({ is_active: false })
    .eq('assessment_id', assessmentId);

  if (deactivateError) throw deactivateError;

  // 2. Ativar a versão específica
  const { error: activateError } = await supabase
    .from('assessment_versions')
    .update({ is_active: true })
    .eq('id', versionId);

  if (activateError) throw activateError;

  // 3. Garantir que o assessment pai fique ativo/publicado
  const { error: activateAssessmentError } = await supabase
    .from('assessments')
    .update({ is_active: true })
    .eq('id', assessmentId);

  if (activateAssessmentError) throw activateAssessmentError;
}

/**
 * Lista todas as versões de um assessment
 * @param {string} assessmentId - ID do assessment
 * @returns {Promise<Array>} Lista de versões
 */
export async function listAssessmentVersions(assessmentId) {
  const { data, error } = await supabase
    .from('assessment_versions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return data || [];
}
