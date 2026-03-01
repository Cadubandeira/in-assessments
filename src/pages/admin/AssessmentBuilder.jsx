import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, GitBranch } from 'lucide-react';
import IntroductionEditor from '../../components/IntroductionEditor';
import OverallRangesEditor from '../../components/OverallRangesEditor';
import AssessmentBuilderSkeleton from '../../components/skeletons/admin/AssessmentBuilderSkeleton';
import { 
  getActiveAssessmentVersion, 
  createNewAssessmentVersion, 
  activateAssessmentVersion,
  listAssessmentVersions 
} from '../../utils/assessmentVersions';

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const makeTempId = () => `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function AssessmentBuilder() {
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();
  const [assessments, setAssessments] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [selectedIndicators, setSelectedIndicators] = useState([]);
  const [ranges, setRanges] = useState({}); // { indicatorId: [{ min, max, label, interpretation }] }
  const [overallRanges, setOverallRanges] = useState([]); // Faixas globais do assessment
  const [introductionHtml, setIntroductionHtml] = useState(''); // Conteúdo introdutório
  const [finalReflection, setFinalReflection] = useState(''); // Reflexao final opcional
  const [resultIntroduction, setResultIntroduction] = useState(''); // Introdução ao resultado opcional
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [assessmentData, setAssessmentData] = useState(null);
  const [assessmentIndicatorsData, setAssessmentIndicatorsData] = useState([]);
  const [questionsData, setQuestionsData] = useState([]);
  const [indicatorsMap, setIndicatorsMap] = useState({}); // Mapa de indicator_master_id -> { id, assessment_id }
  // Estados para edição
  const [assessmentDataEdited, setAssessmentDataEdited] = useState(null);
  const [assessmentIndicatorsEdited, setAssessmentIndicatorsEdited] = useState([]);
  const [questionsEdited, setQuestionsEdited] = useState([]);
  const [indicatorToAdd, setIndicatorToAdd] = useState('');



  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      navigate('/dashboard');
      return;
    }

    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const [assRes, indRes] = await Promise.all([
          supabase.from('assessments').select('id, name, description'),
          supabase.from('indicators_master').select('id, name'),
        ]);

        if (assRes.error) throw assRes.error;
        if (indRes.error) throw indRes.error;

        if (mounted) {
          setAssessments(assRes.data || []);
          setIndicators(indRes.data || []);
        }
      } catch (err) {
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (role === 'admin') fetch();
    return () => { mounted = false; };
  }, [role, roleLoading, navigate]);

  const handleSelectAssessment = async (assessmentId) => {
    setSelectedAssessment(assessmentId);
    setSelectedIndicators([]);
    setRanges({});
    setAssessmentData(null);
    setAssessmentIndicatorsData([]);
    setQuestionsData([]);

    try {
      // 1. Buscar dados do assessment
      const { data: assData, error: assError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      
      if (assError) throw assError;
      
      // Normalizar visualization_type para array
      let normalized = assData;
      if (normalized.visualization_type) {
        if (typeof normalized.visualization_type === 'string') {
          // Se for string, converter para array
          normalized.visualization_type = [normalized.visualization_type];
        } else if (!Array.isArray(normalized.visualization_type)) {
          // Se for objeto (JSONB do banco), já está como array
          normalized.visualization_type = normalized.visualization_type || ['radar'];
        }
      } else {
        normalized.visualization_type = ['radar'];
      }
      
      setAssessmentData(normalized);
      // Inicializar cópia para edição
      setAssessmentDataEdited(JSON.parse(JSON.stringify(normalized)));

      // 2. Buscar versão ativa
      const activeVer = await getActiveAssessmentVersion(assessmentId);
      setCurrentVersion(activeVer);

      // 3. Listar todas as versões
      const allVersions = await listAssessmentVersions(assessmentId);
      setVersions(allVersions);

      // 4. Carregar indicadores e ranges da versão ativa
      await loadVersionIndicators(activeVer.id, assessmentId);
    } catch (err) {
      console.error('Erro ao carregar assessment:', err);
      alert('Erro ao carregar assessment: ' + err.message);
    }
  };

  const handleInitNewAssessment = () => {
    setSelectedAssessment('new');
    setAssessmentData({}); // Objeto vazio para passar nas verificações de renderização
    setAssessmentDataEdited({
      name: '',
      description: '',
      type: 'default',
      aggregation_type: 'sum',
      visualization_type: ['radar'],
      availability_type: 'free_for_all',
      is_active: true
    });
    setAssessmentIndicatorsEdited([]);
    setQuestionsEdited([]);
    setCurrentVersion({ id: 'temp-new', version_number: 1, is_active: true });
    setVersions([]);
    setSelectedIndicators([]);
    setRanges({});
    setOverallRanges([]);
    setIntroductionHtml('');
    setFinalReflection('');
    setAssessmentIndicatorsData([]);
    setQuestionsData([]);
  };

  const loadVersionIndicators = async (versionId, assessmentId) => {
    const { data: assessmentIndicators, error: assIndError } = await supabase
      .from('assessment_indicators')
      .select(`
        *,
        indicators_master:indicator_master_id (id, name, description),
        assessment_indicator_ranges (*)
      `)
      .eq('assessment_version_id', versionId)
      .order('display_order', { ascending: true });

    if (assIndError) {
      console.error('Erro ao carregar assessment indicators:', assIndError);
      return;
    }

    // Buscar introduction_html, reflexao final e overall_ranges da versão
    const { data: versionData, error: versionError } = await supabase
      .from('assessment_versions')
      .select('introduction_html, final_reflection, result_introduction')
      .eq('id', versionId)
      .single();

    if (!versionError && versionData) {
      setIntroductionHtml(versionData.introduction_html || '');
      setFinalReflection(versionData.final_reflection || '');
      setResultIntroduction(versionData.result_introduction || '');
    }

    // Buscar overall_ranges
    const { data: overallRangesData, error: overallRangesError } = await supabase
      .from('assessment_overall_ranges')
      .select('*')
      .eq('assessment_version_id', versionId)
      .order('min_score', { ascending: true });

    if (!overallRangesError && overallRangesData) {
      setOverallRanges(overallRangesData);
    }

    // Buscar questions associadas aos indicadores
    const { data: indicatorsOld, error: indOldError } = await supabase
      .from('indicators')
      .select(`
        id,
        indicator_master_id,
        name,
        conceptual_description,
        display_order,
        weight,
        questions (
          *,
          alternatives (*)
        )
      `)
      .eq('assessment_id', assessmentId)
      .order('display_order', { ascending: true });

    if (indOldError) {
      console.error('Erro ao carregar indicadores antigos:', indOldError);
    }

    // Criar mapa de indicator_master_id -> indicator (para referência correta de IDs)
    const indMap = {};
    (indicatorsOld || []).forEach(ind => {
      const masterId = ind.indicator_master_id || ind.id;
      indMap[masterId] = {
        id: ind.id,
        assessment_id: ind.assessment_id,
        name: ind.name,
        display_order: ind.display_order
      };
    });

    // Mapear questions por indicator_master_id para evitar duplicação
    const questionsByMasterId = {};
    (indicatorsOld || []).forEach(ind => {
      const masterId = ind.indicator_master_id || ind.id;
      if (!questionsByMasterId[masterId]) {
        questionsByMasterId[masterId] = [];
      }
      const sorted = (ind.questions || [])
        .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        .map(q => ({
          ...q,
          alternatives: (q.alternatives || [])
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
        }));
      questionsByMasterId[masterId] = sorted;
    });

    // Construir dados para edição com assessment_indicators + questions
    const indicatorsWithQuestions = (assessmentIndicators || []).map(assInd => ({
      id: assInd.id,
      indicator_master_id: assInd.indicator_master_id,
      name: assInd.indicators_master?.name || '',
      description: assInd.indicators_master?.description || '',
      display_order: assInd.display_order,
      weight: assInd.weight,
      assessment_indicator_ranges: assInd.assessment_indicator_ranges || [],
      questions: questionsByMasterId[assInd.indicator_master_id] || [],
      indicators_master: assInd.indicators_master,
      actual_indicator_id: indMap[assInd.indicator_master_id]?.id
    }));

    setAssessmentIndicatorsData(assessmentIndicators || []);
    setQuestionsData(indicatorsOld || []);
    setQuestionsEdited(indicatorsWithQuestions);
    setAssessmentIndicatorsEdited(JSON.parse(JSON.stringify(assessmentIndicators || [])));
    setIndicatorsMap(indMap);

    const indicatorIds = (assessmentIndicators || []).map(ind => ind.indicator_master_id);
    setSelectedIndicators(indicatorIds);

    const rangesMap = {};
    (assessmentIndicators || []).forEach(ind => {
      rangesMap[ind.indicator_master_id] = (ind.assessment_indicator_ranges || [])
        .sort((a, b) => a.min_score - b.min_score)
        .map(r => ({
          min: r.min_score,
          max: r.max_score,
          label: r.label,
          interpretation: r.interpretation
        }));
    });
    setRanges(rangesMap);
  };

  const handleAddIndicator = (indicatorId) => {
    if (!selectedIndicators.includes(indicatorId)) {
      setSelectedIndicators([...selectedIndicators, indicatorId]);
      setRanges({ ...ranges, [indicatorId]: [] });
    }
  };

  const handleRemoveIndicator = (indicatorId) => {
    setSelectedIndicators(selectedIndicators.filter(id => id !== indicatorId));
    const newRanges = { ...ranges };
    delete newRanges[indicatorId];
    setRanges(newRanges);
  };

  const handleAddRange = (indicatorId) => {
    if (!ranges[indicatorId]) ranges[indicatorId] = [];
    ranges[indicatorId].push({ min: 0, max: 100, label: '', interpretation: '' });
    setRanges({ ...ranges });
  };

  const handleUpdateRange = (indicatorId, index, field, value) => {
    ranges[indicatorId][index][field] = field === 'min' || field === 'max' ? parseInt(value) || 0 : value;
    setRanges({ ...ranges });
  };

  const handleRemoveRange = (indicatorId, index) => {
    ranges[indicatorId].splice(index, 1);
    setRanges({ ...ranges });
  };

  const handleAddIndicatorFromMaster = () => {
    if (!indicatorToAdd) return;
    const master = indicators.find(item => item.id === indicatorToAdd);
    if (!master) return;

    const newIndicator = {
      id: makeTempId(),
      indicator_master_id: master.id,
      indicators_master: { id: master.id, name: master.name, description: master.description || '' },
      display_order: assessmentIndicatorsEdited.length + 1,
      weight: 1,
      assessment_indicator_ranges: []
    };

    const newIndicatorQuestions = {
      id: makeTempId(),
      indicator_master_id: master.id,
      name: master.name,
      description: master.description || '',
      display_order: questionsEdited.length + 1,
      questions: []
    };

    setAssessmentIndicatorsEdited([...assessmentIndicatorsEdited, newIndicator]);
    setQuestionsEdited([...questionsEdited, newIndicatorQuestions]);
    setIndicatorToAdd('');
  };

  const handleRemoveIndicatorFromAssessment = (indicatorMasterId, indicatorName) => {
    setAssessmentIndicatorsEdited(prev => prev.filter(ind => ind.indicator_master_id !== indicatorMasterId));
    setQuestionsEdited(prev => prev.filter(ind => {
      const masterMatch = ind.indicator_master_id && ind.indicator_master_id === indicatorMasterId;
      const nameMatch = indicatorName && ind.name === indicatorName;
      return !masterMatch && !nameMatch;
    }));
  };

  const handleAddQuestion = (indicatorIndex) => {
    const updated = [...questionsEdited];
    const indicator = updated[indicatorIndex];
    const newQuestion = {
      id: makeTempId(),
      text: '',
      response_type: 'single_choice',
      is_required: true,
      display_order: (indicator.questions?.length || 0) + 1,
      alternatives: []
    };
    indicator.questions = [...(indicator.questions || []), newQuestion];
    updated[indicatorIndex] = { ...indicator };
    setQuestionsEdited(updated);
  };

  const handleRemoveQuestion = (indicatorIndex, questionIndex) => {
    const updated = [...questionsEdited];
    const indicator = updated[indicatorIndex];
    indicator.questions = (indicator.questions || []).filter((_, idx) => idx !== questionIndex);
    updated[indicatorIndex] = { ...indicator };
    setQuestionsEdited(updated);
  };

  const handleAddAlternative = (indicatorIndex, questionIndex) => {
    const updated = [...questionsEdited];
    const question = updated[indicatorIndex].questions[questionIndex];
    const newAlt = {
      id: makeTempId(),
      text: '',
      score_value: 0,
      display_order: (question.alternatives?.length || 0) + 1
    };
    question.alternatives = [...(question.alternatives || []), newAlt];
    setQuestionsEdited(updated);
  };

  const handleRemoveAlternative = (indicatorIndex, questionIndex, altIndex) => {
    const updated = [...questionsEdited];
    const question = updated[indicatorIndex].questions[questionIndex];
    question.alternatives = (question.alternatives || []).filter((_, idx) => idx !== altIndex);
    setQuestionsEdited(updated);
  };

  const handleAddRangeToIndicator = (indicatorIndex) => {
    const updated = [...assessmentIndicatorsEdited];
    const indicator = updated[indicatorIndex];
    const newRange = {
      id: makeTempId(),
      min_score: 0,
      max_score: 100,
      label: '',
      interpretation: ''
    };
    indicator.assessment_indicator_ranges = [...(indicator.assessment_indicator_ranges || []), newRange];
    updated[indicatorIndex] = { ...indicator };
    setAssessmentIndicatorsEdited(updated);
  };

  const handleRemoveRangeFromIndicator = (indicatorIndex, rangeIndex) => {
    const updated = [...assessmentIndicatorsEdited];
    const indicator = updated[indicatorIndex];
    indicator.assessment_indicator_ranges = (indicator.assessment_indicator_ranges || []).filter((_, idx) => idx !== rangeIndex);
    updated[indicatorIndex] = { ...indicator };
    setAssessmentIndicatorsEdited(updated);
  };

  const validateBeforeSave = () => {
    const issues = [];

    if (!assessmentIndicatorsEdited.length) {
      issues.push('Adicione pelo menos um indicador.');
    }

    if (!questionsEdited.length) {
      issues.push('Adicione pelo menos um indicador com questoes.');
    }

    questionsEdited.forEach((indicator, indIdx) => {
      const indicatorLabel = indicator.name || `Indicador ${indIdx + 1}`;
      const displayOrder = Number(indicator.display_order || 0);
      const hasMatchingIndicator = assessmentIndicatorsEdited.some(ai =>
        ai.indicator_master_id === indicator.indicator_master_id ||
        ai.indicators_master?.name === indicator.name
      );

      if (!indicator.name || !indicator.name.trim()) {
        issues.push(`Indicador ${indIdx + 1}: nome obrigatorio.`);
      }

      if (!hasMatchingIndicator) {
        issues.push(`${indicatorLabel}: nao esta vinculado aos indicadores do assessment.`);
      }

      if (!Number.isFinite(displayOrder) || displayOrder <= 0) {
        issues.push(`${indicatorLabel}: ordem do indicador deve ser maior que 0.`);
      }

      const questions = indicator.questions || [];
      if (!questions.length) {
        issues.push(`${indicatorLabel}: adicione pelo menos uma questao.`);
      }

      questions.forEach((question, qIdx) => {
        const questionLabel = `${indicatorLabel} - Questao ${qIdx + 1}`;
        const questionOrder = Number(question.display_order || 0);

        if (!question.text || !question.text.trim()) {
          issues.push(`${questionLabel}: texto obrigatorio.`);
        }

        if (!Number.isFinite(questionOrder) || questionOrder <= 0) {
          issues.push(`${questionLabel}: ordem da questao deve ser maior que 0.`);
        }

        const alternatives = question.alternatives || [];
        if (!alternatives.length) {
          issues.push(`${questionLabel}: adicione pelo menos uma alternativa.`);
        }

        alternatives.forEach((alt, aIdx) => {
          const altLabel = `${questionLabel} - Alternativa ${aIdx + 1}`;
          const altOrder = Number(alt.display_order || 0);
          const altScore = Number(alt.score_value);

          if (!alt.text || !alt.text.trim()) {
            issues.push(`${altLabel}: texto obrigatorio.`);
          }

          if (!Number.isFinite(altOrder) || altOrder <= 0) {
            issues.push(`${altLabel}: ordem da alternativa deve ser maior que 0.`);
          }

          if (!Number.isFinite(altScore)) {
            issues.push(`${altLabel}: score deve ser numerico.`);
          }
        });
      });
    });

    if (issues.length > 0) {
      alert(`Corrija os seguintes itens antes de salvar:\n\n- ${issues.join('\n- ')}`);
      return false;
    }

    return true;
  };

  const handleConfirmSave = async () => {
    // Proteção contra múltiplos cliques
    if (isSaving) {
      console.warn('⚠️ Operação de save já em andamento, ignorando novo clique');
      return;
    }

    if ((!selectedAssessment && selectedAssessment !== 'new') || !currentVersion) {
      alert('Nenhuma versão selecionada.');
      return;
    }

    if (!validateBeforeSave()) {
      return;
    }

    setIsSaving(true);
    try {
      let targetAssessmentId = selectedAssessment;
      let targetVersionId = null;
      let newVersionObj = null;

      // CENÁRIO 1: CRIAR NOVO ASSESSMENT
      if (selectedAssessment === 'new') {
        // 1. Inserir Assessment
        const { data: newAssData, error: newAssError } = await supabase
          .from('assessments')
          .insert([{
            name: assessmentDataEdited.name,
            description: assessmentDataEdited.description,
            type: assessmentDataEdited.type,
            aggregation_type: assessmentDataEdited.aggregation_type,
            visualization_type: assessmentDataEdited.visualization_type,
            availability_type: assessmentDataEdited.availability_type,
            is_active: assessmentDataEdited.is_active,
            version: '1'
          }])
          .select()
          .single();

        if (newAssError) throw newAssError;
        targetAssessmentId = newAssData.id;

        // 2. Inserir Versão 1
        const { data: newVerData, error: newVerError } = await supabase
          .from('assessment_versions')
          .insert([{
            assessment_id: targetAssessmentId,
            version_number: 1,
            is_active: true,
            introduction_html: introductionHtml,
            final_reflection: finalReflection || null,
            result_introduction: resultIntroduction || null,
            visualization_type: assessmentDataEdited.visualization_type || '["radar"]'
          }])
          .select()
          .single();

        if (newVerError) throw newVerError;
        targetVersionId = newVerData.id;
        newVersionObj = newVerData;

      } else {
        // CENÁRIO 2: ATUALIZAR EXISTENTE (CRIAR NOVA VERSÃO)
        
        // 1. Criar nova versão copiando a anterior (mas vamos sobrescrever os indicadores depois)
        newVersionObj = await createNewAssessmentVersion(selectedAssessment, currentVersion.id);
        targetVersionId = newVersionObj.id;

        // 2. Atualizar dados do assessment se mudou algo
        if (assessmentDataEdited && assessmentData) {
          const changeFields = {};
          ['name', 'type', 'aggregation_type', 'visualization_type', 'availability_type', 'is_active', 'description'].forEach(field => {
            if (assessmentDataEdited[field] !== assessmentData[field]) {
              changeFields[field] = assessmentDataEdited[field];
            }
          });
          
          if (Object.keys(changeFields).length > 0) {
            const { error: updateError } = await supabase
              .from('assessments')
              .update(changeFields)
              .eq('id', selectedAssessment);
            if (updateError) throw updateError;
          }
        }

        // 2.1. Atualizar visualization_type, introduction_html e reflexao final da nova versão
        const versionUpdateFields = {};
        if (assessmentDataEdited?.visualization_type) {
          versionUpdateFields.visualization_type = assessmentDataEdited.visualization_type;
        }
        if (introductionHtml !== undefined) {
          versionUpdateFields.introduction_html = introductionHtml;
        }
        if (resultIntroduction !== undefined) {
          versionUpdateFields.result_introduction = resultIntroduction || null;
        }
        if (finalReflection !== undefined) {
          versionUpdateFields.final_reflection = finalReflection || null;
        }
        
        if (Object.keys(versionUpdateFields).length > 0) {
          const { error: updateVersionError } = await supabase
            .from('assessment_versions')
            .update(versionUpdateFields)
            .eq('id', targetVersionId);
          if (updateVersionError) throw updateVersionError;
        }

        // 3. Limpar indicadores copiados automaticamente (pois vamos salvar o estado atual do editor)
        const { error: deleteError } = await supabase
          .from('assessment_indicators')
          .delete()
          .eq('assessment_version_id', targetVersionId);

        if (deleteError) throw deleteError;
      }

      // 3. Salvar assessment_indicators e assessment_indicator_ranges na NOVA versão
      for (let i = 0; i < assessmentIndicatorsEdited.length; i++) {
        const indicator = assessmentIndicatorsEdited[i];
        const displayOrder = indicator.display_order || (i + 1);
        
        const { data: aiData, error: aiError } = await supabase
          .from('assessment_indicators')
          .insert([{ 
            assessment_version_id: targetVersionId,
            indicator_master_id: indicator.indicator_master_id, 
            display_order: displayOrder,
            weight: indicator.weight || 0
          }])
          .select();

        if (aiError) throw aiError;
        const assessmentIndicatorId = aiData?.[0]?.id;

        // Salvar ranges
        if (indicator.assessment_indicator_ranges && indicator.assessment_indicator_ranges.length > 0) {
          const rangeData = indicator.assessment_indicator_ranges.map(r => ({
            assessment_indicator_id: assessmentIndicatorId,
            min_score: parseFloat(r.min_score) || 0,
            max_score: parseFloat(r.max_score) || 0,
            label: r.label || '',
            interpretation: r.interpretation || ''
          }));

          console.log('💾 DEBUG handleConfirmSave: Ranges a serem salvas:', rangeData);

          const { error: rangeError } = await supabase
            .from('assessment_indicator_ranges')
            .insert(rangeData);

          if (rangeError) {
            console.error('❌ Erro ao salvar ranges:', rangeError);
            throw rangeError;
          }
        }
      }

      // 3.5. Salvar overall_ranges (faixas globais do assessment)
      if (targetVersionId) {
        console.log(`🔄 Iniciando salvamento de overall_ranges para versão ${targetVersionId}`);
        
        // Deletar overall_ranges antigos da versão específica
        const { error: deleteError } = await supabase
          .from('assessment_overall_ranges')
          .delete()
          .eq('assessment_version_id', targetVersionId);

        if (deleteError) {
          console.error('❌ Erro ao deletar overall_ranges antigos:', deleteError);
          throw deleteError;
        }
        console.log(`✅ Ranges antigos deletados`);

        // Inserir novos overall_ranges
        if (overallRanges && overallRanges.length > 0) {
          // Validar e preparar ranges com rigor: cada range deve ter label, min_score e max_score válidos
          const overallRangesData = overallRanges
            .filter(r => {
              // Validação rigorosa: garantir que todos os campos obrigatórios estão preenchidos
              const label = String(r.label || '').trim();
              const minScore = r.min_score !== undefined && r.min_score !== null && r.min_score !== '' 
                ? Number(r.min_score) 
                : null;
              const maxScore = r.max_score !== undefined && r.max_score !== null && r.max_score !== '' 
                ? Number(r.max_score) 
                : null;
              
              // Validações
              const hasLabel = label.length > 0;
              const hasValidMinScore = !isNaN(minScore) && minScore !== null;
              const hasValidMaxScore = !isNaN(maxScore) && maxScore !== null;
              const isValidRange = hasValidMinScore && hasValidMaxScore && minScore <= maxScore;
              
              console.log(`🔍 Validando range:`, { label, minScore, maxScore, hasLabel, isValidRange });
              
              return hasLabel && isValidRange;
            })
            .map(r => {
              // Converter com type-safety após validação
              const minScore = Number(r.min_score);
              const maxScore = Number(r.max_score);
              
              return {
                assessment_version_id: targetVersionId,
                min_score: minScore,
                max_score: maxScore,
                label: String(r.label || '').trim(),
                interpretation: String(r.interpretation || '').trim()
              };
            });

          console.log(`💾 Overall Ranges a salvar: ${overallRangesData.length} faixas`, overallRangesData);

          if (overallRangesData.length > 0) {
            const { error: overallRangesError } = await supabase
              .from('assessment_overall_ranges')
              .insert(overallRangesData);

            if (overallRangesError) {
              console.error('❌ Erro ao salvar overall_ranges:', overallRangesError);
              throw overallRangesError;
            }
            console.log(`✅ ${overallRangesData.length} faixa(s) global(is) salva(s) com sucesso`);
          }
        }

        // Atualizar introduction_html e reflexao final na versão
        const versionTextUpdate = {};
        if (introductionHtml !== undefined) {
          versionTextUpdate.introduction_html = introductionHtml;
        }
        if (finalReflection !== undefined) {
          versionTextUpdate.final_reflection = finalReflection || null;
        }
        if (Object.keys(versionTextUpdate).length > 0) {
          const { error: updateVersionError } = await supabase
            .from('assessment_versions')
            .update(versionTextUpdate)
            .eq('id', targetVersionId);

          if (updateVersionError) {
            console.error('❌ Erro ao salvar texto da versão:', updateVersionError);
            throw updateVersionError;
          }
        }
      }

      // 4. Remover indicadores que foram deletados (com perguntas e alternativas)
      // Comparar por master_indicator_id para evitar conflitos entre IDs de diferentes tabelas
      const originalIndicatorsMap = new Map(
        (questionsData || []).map(ind => [ind.indicator_master_id || ind.id, ind])
      );
      const editedIndicatorsMap = new Map(
        (questionsEdited || []).map(ind => [ind.indicator_master_id || ind.id, ind])
      );

      // Encontrar indicadores que foram removidos
      const removedIndicatorKeys = Array.from(originalIndicatorsMap.keys())
        .filter(key => !editedIndicatorsMap.has(key));

      // Deletar perguntas e indicadores que foram removidos
      if (removedIndicatorKeys.length > 0) {
        const removedIndicators = removedIndicatorKeys.map(key => originalIndicatorsMap.get(key));
        const removedQuestions = removedIndicators.flatMap(ind => ind.questions || []);
        const removedQuestionIds = removedQuestions.filter(q => isUuid(q.id)).map(q => q.id);

        if (removedQuestionIds.length > 0) {
          const { error: deleteAltsError } = await supabase
            .from('alternatives')
            .delete()
            .in('question_id', removedQuestionIds);
          if (deleteAltsError) throw deleteAltsError;

          const { error: deleteQuestionsError } = await supabase
            .from('questions')
            .delete()
            .in('id', removedQuestionIds);
          if (deleteQuestionsError) throw deleteQuestionsError;
        }

        const removedIndicatorIds = removedIndicators
          .map(ind => ind.id)
          .filter(id => isUuid(id));

        if (removedIndicatorIds.length > 0) {
          const { error: deleteIndicatorsError } = await supabase
            .from('indicators')
            .delete()
            .in('id', removedIndicatorIds);
          if (deleteIndicatorsError) throw deleteIndicatorsError;
        }
      }

      const getWeightForIndicator = (indicator) => {
        if (indicator.indicator_master_id) {
          const match = assessmentIndicatorsEdited.find(item => item.indicator_master_id === indicator.indicator_master_id);
          return match?.weight ?? 1;
        }
        const matchByName = assessmentIndicatorsEdited.find(item => item.indicators_master?.name === indicator.name);
        return matchByName?.weight ?? indicator.weight ?? 1;
      };

      // 5. Criar/atualizar indicadores, perguntas e alternativas
      // Itera sobre cada indicador editado e sincroniza com o banco de dados
      for (let i = 0; i < questionsEdited.length; i++) {
        const indicatorEdited = questionsEdited[i];
        console.log(`[Salvando Indicador ${i + 1}]`, indicatorEdited.name);
        
        // ============ PASSO 5.1: Encontrar indicador original para comparação ============
        // KEY: usa indicator_master_id para mapear entre questionsData original e questionsEdited novo
        const indicatorOriginal = originalIndicatorsMap.get(
          indicatorEdited.indicator_master_id || indicatorEdited.id
        ) || null;
        console.log(`  Original encontrado:`, indicatorOriginal?.id ? 'SIM' : 'NÃO');

        // ============ PASSO 5.2: Salvar ou atualizar o indicador na tabela 'indicators' ============
        const indicatorDisplayOrder = indicatorEdited.display_order || (i + 1);
        const indicatorWeight = getWeightForIndicator(indicatorEdited);
        // IMPORTANTE: usar actual_indicator_id que é o ID correto de 'indicators', não o ID de assessment_indicators
        let indicatorId = indicatorEdited.actual_indicator_id;

        if (isUuid(indicatorEdited.actual_indicator_id)) {
          // CASO A: Indicador já existe na tabela 'indicators' → UPDATE
          console.log(`  → UPDATE indicador ${indicatorId}`);
          const { error: updateIndicatorError } = await supabase
            .from('indicators')
            .update({
              name: indicatorEdited.name,
              conceptual_description: indicatorEdited.description || '',
              display_order: indicatorDisplayOrder,
              weight: indicatorWeight,
              indicator_master_id: indicatorEdited.indicator_master_id || null
            })
            .eq('id', indicatorId);
          if (updateIndicatorError) throw updateIndicatorError;
        } else {
          // CASO B: Novo indicador (sem actual_indicator_id) → INSERT
          console.log(`  → INSERT novo indicador`);
          const { data: newIndicatorData, error: newIndicatorError } = await supabase
            .from('indicators')
            .insert([
              {
                assessment_id: targetAssessmentId,
                indicator_master_id: indicatorEdited.indicator_master_id || null,
                name: indicatorEdited.name,
                conceptual_description: indicatorEdited.description || '',
                display_order: indicatorDisplayOrder,
                weight: indicatorWeight
              }
            ])
            .select();
          if (newIndicatorError) throw newIndicatorError;
          indicatorId = newIndicatorData?.[0]?.id;
          console.log(`  → INSERT sucesso, novo ID: ${indicatorId}`);
        }

        // ============ PASSO 5.3: Sincronizar perguntas deste indicador ============
        const originalQuestions = indicatorOriginal?.questions || [];
        const editedQuestions = indicatorEdited.questions || [];
        console.log(`  Perguntas: original=${originalQuestions.length}, editada=${editedQuestions.length}`);

        // Detectar perguntas deletadas
        const editedQuestionIds = new Set(editedQuestions.filter(q => isUuid(q.id)).map(q => q.id));
        const removedQuestionIds = originalQuestions
          .filter(q => isUuid(q.id))
          .map(q => q.id)
          .filter(id => !editedQuestionIds.has(id));

        if (removedQuestionIds.length > 0) {
          console.log(`  Deletando ${removedQuestionIds.length} perguntas`);
          // Deletar alternativas primeiro (FK constraint)
          const { error: deleteAltsError } = await supabase
            .from('alternatives')
            .delete()
            .in('question_id', removedQuestionIds);
          if (deleteAltsError) throw deleteAltsError;

          // Depois deletar as perguntas
          const { error: deleteQuestionsError } = await supabase
            .from('questions')
            .delete()
            .in('id', removedQuestionIds);
          if (deleteQuestionsError) throw deleteQuestionsError;
        }

        // Processar cada pergunta (INSERT ou UPDATE)
        for (let qIdx = 0; qIdx < editedQuestions.length; qIdx++) {
          const questionEdited = editedQuestions[qIdx];
          const questionOriginal = originalQuestions.find(q => q.id === questionEdited.id) || null;
          const questionDisplayOrder = questionEdited.display_order || (qIdx + 1);
          let questionId = questionEdited.id;

          if (isUuid(questionEdited.id)) {
            // CASO A: ID é UUID → UPDATE questão existente
            const { error: updateQuestionError } = await supabase
              .from('questions')
              .update({
                text: questionEdited.text,
                response_type: questionEdited.response_type,
                is_required: questionEdited.is_required,
                display_order: questionDisplayOrder
              })
              .eq('id', questionEdited.id);
            if (updateQuestionError) throw updateQuestionError;
          } else {
            // CASO B: ID é tempId → INSERT nova questão
            const { data: newQuestionData, error: newQuestionError } = await supabase
              .from('questions')
              .insert([
                {
                  indicator_id: indicatorId,
                  text: questionEdited.text,
                  response_type: questionEdited.response_type,
                  is_required: questionEdited.is_required,
                  display_order: questionDisplayOrder
                }
              ])
              .select();
            if (newQuestionError) throw newQuestionError;
            questionId = newQuestionData?.[0]?.id;
          }

          // ============ PASSO 5.4: Sincronizar alternativas desta pergunta ============
          const originalAlternatives = questionOriginal?.alternatives || [];
          const editedAlternatives = questionEdited.alternatives || [];

          // Detectar alternativas deletadas
          const editedAltIds = new Set(editedAlternatives.filter(a => isUuid(a.id)).map(a => a.id));
          const removedAltIds = originalAlternatives
            .filter(a => isUuid(a.id))
            .map(a => a.id)
            .filter(id => !editedAltIds.has(id));

          if (removedAltIds.length > 0) {
            const { error: deleteAltError } = await supabase
              .from('alternatives')
              .delete()
              .in('id', removedAltIds);
            if (deleteAltError) throw deleteAltError;
          }

          // Processar cada alternativa (INSERT ou UPDATE)
          for (let aIdx = 0; aIdx < editedAlternatives.length; aIdx++) {
            const altEdited = editedAlternatives[aIdx];
            const altDisplayOrder = altEdited.display_order || (aIdx + 1);

            if (isUuid(altEdited.id)) {
              // CASO A: ID é UUID → UPDATE alternativa existente
              const { error: updateAltError } = await supabase
                .from('alternatives')
                .update({
                  text: altEdited.text,
                  score_value: altEdited.score_value,
                  display_order: altDisplayOrder
                })
                .eq('id', altEdited.id);
              if (updateAltError) throw updateAltError;
            } else {
              // CASO B: ID é tempId → INSERT nova alternativa
              const { error: insertAltError } = await supabase
                .from('alternatives')
                .insert([
                  {
                    question_id: questionId,
                    text: altEdited.text,
                    score_value: altEdited.score_value,
                    display_order: altDisplayOrder
                  }
                ]);
              if (insertAltError) throw insertAltError;
            }
          }
        }
      }

      // Atualizar estado
      setCurrentVersion(newVersionObj);
      setShowVersionModal(false);
      
      // Se foi criação, não recarregar lista (será atualizada depois)
      if (selectedAssessment === 'new') {
        await handleSelectAssessment(targetAssessmentId);
        alert('Assessment criado com sucesso!');
        return;
      }

      // Recarregar lista de versões
      const allVersions = await listAssessmentVersions(targetAssessmentId);
      setVersions(allVersions);
      
      // Carregar indicadores da nova versão
      await loadVersionIndicators(targetVersionId, targetAssessmentId);

      // Perguntar se deseja publicar a nova versão
      const shouldPublish = confirm(
        `✓ Nova versão v${newVersionObj.version_number} criada com sucesso!\n\nDeseja publicar esta versão agora? Ela se tornará a versão ativa do assessment.`
      );

      if (shouldPublish) {
        await activateAssessmentVersion(targetAssessmentId, targetVersionId);
        
        // Atualizar estado da versão atual
        const activeVer = await getActiveAssessmentVersion(targetAssessmentId);
        setCurrentVersion(activeVer);
        
        // Recarregar versões novamente
        const updatedVersions = await listAssessmentVersions(targetAssessmentId);
        setVersions(updatedVersions);
        
        alert(`✓ Versão v${newVersionObj.version_number} publicada com sucesso!\nEla agora é a versão ativa do assessment.`);
      } else {
        alert(`✓ Versão v${newVersionObj.version_number} criada com sucesso!\nVocê pode publicá-la mais tarde clicando em "Publicar".`);
      }
    } catch (err) {
      alert('Erro ao salvar: ' + (err.message || String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewVersion = async () => {
    if (!selectedAssessment || !currentVersion) {
      alert('Selecione um assessment primeiro.');
      return;
    }

    const confirmMessage = `📋 Criar Nova Versão (Cópia)

Isso criará uma CÓPIA EXATA da versão v${currentVersion.version_number}.

Você poderá então editar a nova versão antes de publicá-la.

Deseja continuar?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Criar nova versão copiando da versão atual
      const newVersion = await createNewAssessmentVersion(selectedAssessment, currentVersion.id);
      
      setCurrentVersion(newVersion);
      
      // Recarregar lista de versões
      const allVersions = await listAssessmentVersions(selectedAssessment);
      setVersions(allVersions);

      // Carregar indicadores da nova versão
      await loadVersionIndicators(newVersion.id, selectedAssessment);
      
      alert(`✓ Nova versão v${newVersion.version_number} criada como cópia!\n\nVocê está agora em modo de edição. Faça as alterações desejadas e clique em "Salvar".`);
    } catch (err) {
      alert('Erro ao criar versão: ' + (err.message || String(err)));
    }
  };

  const handlePublishVersion = async () => {
    if (!selectedAssessment || !currentVersion) {
      alert('Selecione um assessment e versão.');
      return;
    }

    if (!confirm(`Publicar versão v${currentVersion.version_number}? Ela se tornará a versão ativa.`)) {
      return;
    }

    try {
      await activateAssessmentVersion(selectedAssessment, currentVersion.id);
      
      // Recarregar versões
      const allVersions = await listAssessmentVersions(selectedAssessment);
      setVersions(allVersions);

      // Atualizar estado da versão atual
      const activeVer = await getActiveAssessmentVersion(selectedAssessment);
      setCurrentVersion(activeVer);
      
      alert('Versão publicada com sucesso!');
    } catch (err) {
      alert('Erro ao publicar versão: ' + (err.message || String(err)));
    }
  };

  const isDeactivatingAssessment = assessmentDataEdited?.is_active === false;

  if (roleLoading || loading) {
    return <AssessmentBuilderSkeleton />;
  }

  if (role !== 'admin') {
    return (
      <div className="p-12 text-center text-red-600">
        Acesso negado. Somente admins podem acessar esta página.
      </div>
    );
  }

  if (error) {
    return <div className="p-12 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/dashboard')} className="text-[#4F46E5] hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h1 className="text-3xl font-semibold">Configurar Assessment</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna Esquerda: Seleção de Assessment */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-6 border rounded-lg bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Selecionar Assessment</h2>
              <button
                onClick={handleInitNewAssessment}
                className="p-2 bg-[#4F46E5] text-white rounded hover:bg-[#312E81] transition-colors"
                title="Criar Novo Assessment"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {assessments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleSelectAssessment(a.id)}
                  className={`w-full text-left px-4 py-2 rounded border transition ${
                    selectedAssessment === a.id
                      ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                      : 'border-gray-300 hover:border-[#4F46E5]'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>

          {/* Versões do Assessment */}
          {selectedAssessment && selectedAssessment !== 'new' && currentVersion && (
            <div className="p-6 border rounded-lg bg-white">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Versões
                </h2>
                
              </div>
              
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={`px-3 py-2 rounded text-sm border ${
                      v.id === currentVersion.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">v{v.version_number}</span>
                      {isDeactivatingAssessment && v.id === currentVersion.id ? (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Desativado</span>
                      ) : v.is_active ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Ativa</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Desativada</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(v.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>

              {currentVersion && !currentVersion.is_active && (
                <button
                  onClick={handlePublishVersion}
                  className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  Publicar v{currentVersion.version_number}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Coluna Direita: Informações Completas do Assessment */}
        <div className="lg:col-span-2 space-y-6">
          {(!selectedAssessment && selectedAssessment !== 'new') && (
            <div className="p-12 text-center text-gray-500">
              Selecione um assessment para visualizar todas suas configurações
            </div>
          )}

          {(selectedAssessment || selectedAssessment === 'new') && assessmentDataEdited && currentVersion && (
            <>
              {/* 1. INFORMAÇÕES BÁSICAS DO ASSESSMENT */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-[#4F46E5]">Informações do Assessment</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Nome</label>
                    <input
                      type="text"
                      value={assessmentDataEdited?.name || ''}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, name: e.target.value })}
                      className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo</label>
                    <input
                      type="text"
                      value={assessmentDataEdited?.type || ''}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, type: e.target.value })}
                      className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo de Agregação</label>
                    <input
                      type="text"
                      value={assessmentDataEdited?.aggregation_type || ''}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, aggregation_type: e.target.value })}
                      className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipos de Visualização</label>
                    <div className="flex gap-2 flex-wrap">
                      {['radar', 'horizontal-bar'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            const current = Array.isArray(assessmentDataEdited?.visualization_type) 
                              ? assessmentDataEdited.visualization_type 
                              : [];
                            const isSelected = current.includes(type);
                            const updated = isSelected 
                              ? current.filter(t => t !== type)
                              : [...current, type];
                            setAssessmentDataEdited({ 
                              ...assessmentDataEdited, 
                              visualization_type: updated.length > 0 ? updated : ['radar']
                            });
                          }}
                          className={`px-3 py-2 rounded border-2 text-sm font-medium transition ${
                            (Array.isArray(assessmentDataEdited?.visualization_type) 
                              ? assessmentDataEdited.visualization_type 
                              : [])
                              .includes(type)
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {type === 'radar' ? '📊 Radar' : '📈 Gráfico em Barras'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo de Disponibilidade</label>
                    <select
                      value={assessmentDataEdited?.availability_type || 'free_for_all'}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, availability_type: e.target.value })}
                      className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                    >
                      <option value="free_for_all">Grátis para Todos</option>
                      <option value="first_free">Primeira Resposta Grátis</option>
                      <option value="paid_unlock">Desbloqueio Pago</option>
                      <option value="subscription_only">Apenas Assinatura</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Status</label>
                    <select
                      value={assessmentDataEdited?.is_active ? 'ativo' : 'desativado'}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, is_active: e.target.value === 'ativo' })}
                      className={`w-full p-2 border rounded bg-white font-semibold ${assessmentDataEdited?.is_active ? 'text-green-600' : 'text-gray-500'}`}
                    >
                      <option value="ativo">✓ Ativo</option>
                      <option value="desativado">✗ Desativado</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Descrição</label>
                  <textarea
                    value={assessmentDataEdited?.description || ''}
                    onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, description: e.target.value })}
                    rows={3}
                    placeholder="Adicione uma descrição para o assessment..."
                    className="w-full p-2 border rounded bg-white text-gray-700"
                  />
                </div>

                {/* Editor de Introdução */}
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <IntroductionEditor 
                    value={introductionHtml}
                    onChange={setIntroductionHtml}
                  />
                </div>
              </div>

              {/* 2. INFO DA VERSÃO ATUAL */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-sm font-medium text-blue-900">
                  Versão Atual: v{currentVersion.version_number}
                </span>
                {isDeactivatingAssessment ? (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Desativado</span>
                ) : currentVersion.is_active ? (
                  <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Ativa</span>
                ) : (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Desativada</span>
                )}
              </div>

              {/* 4. OVERALL RANGES (Faixas de Interpretação Global) */}
              <div className="bg-white border rounded-lg p-6">
                <OverallRangesEditor 
                  ranges={overallRanges}
                  onChange={setOverallRanges}
                />
              </div>

              {/* INTRODUÇÃO AO RESULTADO */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Introdução ao resultado</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Texto opcional exibido no topo da página de resultado do assessment.
                </p>
                <IntroductionEditor
                  value={resultIntroduction}
                  onChange={setResultIntroduction}
                  label="Introdução ao resultado"
                  placeholder="Escreva uma introdução para o resultado (HTML permitido)..."
                />
              </div>

              {/* REFLEXAO FINAL */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Reflexao Final</h2>
                <p className="text-sm text-gray-500 mb-3">
                  Texto opcional exibido ao final do resultado do assessment.
                </p>
                <IntroductionEditor
                  value={finalReflection}
                  onChange={setFinalReflection}
                  label="Reflexao final"
                  placeholder="Escreva uma reflexao final para o usuario (HTML permitido)..."
                />
              </div>

              {/* ADICIONAR INDICADOR */}
              <div className="bg-white border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Adicionar Indicador</h2>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <select
                    value={indicatorToAdd}
                    onChange={(e) => setIndicatorToAdd(e.target.value)}
                    className="flex-1 p-2 border rounded bg-white"
                  >
                    <option value="">Selecione um indicador</option>
                    {indicators.map(item => {
                      const isApplied = assessmentIndicatorsEdited.some(ind => ind.indicator_master_id === item.id);
                      return (
                        <option 
                          key={item.id} 
                          value={item.id}
                          disabled={isApplied}
                        >
                          {item.name}{isApplied ? ' (Aplicado)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddIndicatorFromMaster}
                    disabled={!indicatorToAdd}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#4F46E5] text-white rounded hover:bg-[#312E81] disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
              </div>

              {/* 3. ASSESSMENT INDICATORS COM RANGES */}
              {assessmentIndicatorsEdited.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-[#4F46E5]">Indicadores do Assessment</h2>
                  
                  <div className="space-y-6">
                    {assessmentIndicatorsEdited.map((indicator, idx) => (
                      <div key={indicator.id} className="border rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-600">Indicador #{indicator.display_order}</h3>
                          <button
                            type="button"
                            onClick={() => handleRemoveIndicatorFromAssessment(indicator.indicator_master_id, indicator.indicators_master?.name)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" /> Remover
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Indicador</label>
                            <input
                              type="text"
                              value={indicator.indicators_master?.name || ''}
                              readOnly
                              className="w-full p-2 border rounded bg-white text-[#4F46E5] font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Peso</label>
                            <input
                              type="number"
                              value={assessmentIndicatorsEdited[idx]?.weight || '0'}
                              onChange={(e) => {
                                const updated = [...assessmentIndicatorsEdited];
                                updated[idx].weight = parseFloat(e.target.value) || 0;
                                setAssessmentIndicatorsEdited(updated);
                              }}
                              className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Ordem</label>
                            <input
                              type="number"
                              value={assessmentIndicatorsEdited[idx]?.display_order || ''}
                              onChange={(e) => {
                                const updated = [...assessmentIndicatorsEdited];
                                const newOrder = parseInt(e.target.value, 10) || 0;
                                updated[idx].display_order = newOrder;
                                setAssessmentIndicatorsEdited(updated);
                              }}
                              className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                            />
                          </div>
                        </div>

                        {indicator.indicators_master?.description && (
                          <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-400">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Descrição Conceitual</label>
                            <textarea
                              value={indicator.indicators_master.description}
                              readOnly
                              rows={2}
                              className="w-full p-2 border rounded bg-gray-50 text-gray-700 text-sm"
                            />
                          </div>
                        )}

                        {/* Ranges do Indicador */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">Faixas de Classificação por Percentual</h4>
                              <p className="text-xs text-gray-500 mt-1">Define faixas baseadas na porcentagem de acerto (0-100%)</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddRangeToIndicator(idx)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                            >
                              <Plus className="w-3 h-3" /> Adicionar Faixa
                            </button>
                          </div>
                          {indicator.assessment_indicator_ranges && indicator.assessment_indicator_ranges.length > 0 ? (
                            <div className="space-y-3">
                              {indicator.assessment_indicator_ranges.map((range, rIdx) => (
                                <div key={range.id || rIdx} className="p-3 bg-white rounded border border-gray-200">
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="grid grid-cols-4 gap-2 flex-1">
                                      <div>
                                        <label className="text-xs text-gray-500 block mb-1">Min % <span className="text-gray-400">(0-100)</span></label>
                                        <input
                                          type="number"
                                          min="0"
                                          max="100"
                                          value={assessmentIndicatorsEdited[idx]?.assessment_indicator_ranges[rIdx]?.min_score ?? ''}
                                          onChange={(e) => {
                                            const updated = [...assessmentIndicatorsEdited];
                                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                            updated[idx].assessment_indicator_ranges[rIdx].min_score = isNaN(value) ? 0 : value;
                                            setAssessmentIndicatorsEdited(updated);
                                          }}
                                          className="w-full p-2 border rounded bg-white text-gray-900 font-semibold text-sm"
                                        />
                                      </div>
                                    <div>
                                      <label className="text-xs text-gray-500 block mb-1">Max % <span className="text-gray-400">(0-100)</span></label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={assessmentIndicatorsEdited[idx]?.assessment_indicator_ranges[rIdx]?.max_score ?? ''}
                                        onChange={(e) => {
                                          const updated = [...assessmentIndicatorsEdited];
                                          const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                          updated[idx].assessment_indicator_ranges[rIdx].max_score = isNaN(value) ? 0 : value;
                                          setAssessmentIndicatorsEdited(updated);
                                        }}
                                        className="w-full p-2 border rounded bg-white text-gray-900 font-semibold text-sm"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="text-xs text-gray-500 block mb-1">Classificação</label>
                                      <input
                                        type="text"
                                        placeholder="Ex: Baixo, Médio, Alto"
                                        value={assessmentIndicatorsEdited[idx]?.assessment_indicator_ranges[rIdx]?.label || ''}
                                        onChange={(e) => {
                                          const updated = [...assessmentIndicatorsEdited];
                                          updated[idx].assessment_indicator_ranges[rIdx].label = e.target.value;
                                          setAssessmentIndicatorsEdited(updated);
                                        }}
                                        className="w-full p-2 border rounded bg-white text-[#4F46E5] font-semibold text-sm"
                                      />
                                    </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveRangeFromIndicator(idx, rIdx)}
                                      className="ml-2 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                      title="Remover faixa"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <div className="text-sm p-2 bg-gray-50 rounded border-t border-gray-200">
                                    <label className="text-xs text-gray-500 block mb-1">Interpretação</label>
                                    <textarea
                                      value={assessmentIndicatorsEdited[idx]?.assessment_indicator_ranges[rIdx]?.interpretation || ''}
                                      onChange={(e) => {
                                        const updated = [...assessmentIndicatorsEdited];
                                        updated[idx].assessment_indicator_ranges[rIdx].interpretation = e.target.value;
                                        setAssessmentIndicatorsEdited(updated);
                                      }}
                                      rows={2}
                                      placeholder="Descreva a interpretação para scores nesta faixa..."
                                      className="w-full p-2 border rounded bg-white text-gray-700 text-xs"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded border border-dashed border-gray-300 text-center text-sm text-gray-500">
                              <p>Nenhuma faixa de classificação definida.</p>
                              <p className="text-xs mt-1">As faixas classificam o resultado baseado na porcentagem de acerto (0-100%).</p>
                              <p className="text-xs">Exemplo: 0-40% = Baixo, 41-70% = Médio, 71-100% = Alto</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. QUESTIONS E ALTERNATIVES AGRUPADAS POR INDICADORES */}
              {questionsEdited.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-[#4F46E5]">Estrutura de Questões por Indicador</h2>
                  
                  <div className="space-y-8">
                    {questionsEdited.map((indicator, indIdx) => (
                      <div key={indicator.id} className="border-2 border-[#4F46E5] rounded-lg p-6 bg-blue-50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-[#4F46E5]">
                            Indicador #{indicator.display_order}: {indicator.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleRemoveIndicatorFromAssessment(indicator.indicator_master_id, indicator.name)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" /> Remover
                          </button>
                        </div>

                        {indicator.description && (
                          <div className="mb-4 p-3 bg-white rounded border-l-4 border-blue-400">
                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Descrição</label>
                            <textarea
                              value={questionsEdited[indIdx]?.description || ''}
                              onChange={(e) => {
                                const updated = [...questionsEdited];
                                updated[indIdx].description = e.target.value;
                                setQuestionsEdited(updated);
                              }}
                              rows={2}
                              className="w-full p-2 border rounded bg-white text-gray-700 text-sm"
                            />
                          </div>
                        )}

                        {/* Questões do Indicador */}
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-semibold text-gray-600">Questoes</h4>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion(indIdx)}
                            className="inline-flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#312E81]"
                          >
                            <Plus className="w-4 h-4" /> Adicionar questao
                          </button>
                        </div>

                        {indicator.questions && indicator.questions.length > 0 ? (
                          <div className="space-y-6">
                            {indicator.questions.map((question, qIdx) => (
                              <div key={question.id} className="border rounded-lg p-4 bg-white">
                                <div className="bg-gray-50 p-4 rounded mb-4 border border-gray-200">
                                  <div className="grid grid-cols-4 gap-4 mb-4">
                                    <div className="col-span-2">
                                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Questão #{question.display_order}</label>
                                      <textarea
                                        value={questionsEdited[indIdx]?.questions[qIdx]?.text || ''}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].text = e.target.value;
                                          setQuestionsEdited(updated);
                                        }}
                                        rows={2}
                                        className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tipo de Resposta</label>
                                      <input
                                        type="text"
                                        value={questionsEdited[indIdx]?.questions[qIdx]?.response_type || ''}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].response_type = e.target.value;
                                          setQuestionsEdited(updated);
                                        }}
                                        className="w-full p-2 border rounded bg-white text-[#4F46E5] font-semibold"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Ordem</label>
                                      <input
                                        type="number"
                                        value={questionsEdited[indIdx]?.questions[qIdx]?.display_order || ''}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].display_order = parseInt(e.target.value, 10) || 0;
                                          setQuestionsEdited(updated);
                                        }}
                                        className="w-full p-2 border rounded bg-white text-gray-900 font-semibold"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-xs font-semibold text-gray-500 uppercase block mb-2">Obrigatória?</label>
                                      <input
                                        type="checkbox"
                                        checked={questionsEdited[indIdx]?.questions[qIdx]?.is_required || false}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].is_required = e.target.checked;
                                          setQuestionsEdited(updated);
                                        }}
                                        className="mt-2 w-5 h-5 text-red-600 rounded cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex items-end justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(indIdx, qIdx)}
                                        className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="w-4 h-4" /> Remover questao
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Alternativas */}
                                {question.alternatives && question.alternatives.length > 0 && (
                                  <div className="mt-4">
                                    <h5 className="font-semibold text-gray-900 mb-3">Alternativas:</h5>
                                    <div className="space-y-3 bg-gray-50 p-4 rounded">
                                      {question.alternatives.map((alt, aIdx) => (
                                        <div key={alt.id} className="p-3 bg-white rounded border border-gray-200 flex gap-4 items-end">
                                          <div className="flex-1">
                                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Alternativa #{alt.display_order}</label>
                                            <input
                                              type="text"
                                              value={questionsEdited[indIdx]?.questions[qIdx]?.alternatives[aIdx]?.text || ''}
                                              onChange={(e) => {
                                                const updated = [...questionsEdited];
                                                updated[indIdx].questions[qIdx].alternatives[aIdx].text = e.target.value;
                                                setQuestionsEdited(updated);
                                              }}
                                              className="w-full p-2 border rounded bg-white text-gray-900 text-sm"
                                            />
                                          </div>
                                          <div className="w-24">
                                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Score</label>
                                            <input
                                              type="number"
                                              value={questionsEdited[indIdx]?.questions[qIdx]?.alternatives[aIdx]?.score_value ?? ''}
                                              onChange={(e) => {
                                                const updated = [...questionsEdited];
                                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                updated[indIdx].questions[qIdx].alternatives[aIdx].score_value = isNaN(value) ? 0 : value;
                                                setQuestionsEdited(updated);
                                              }}
                                              className="w-full p-2 border rounded bg-white text-[#4F46E5] font-bold text-center"
                                            />
                                          </div>
                                          <div className="w-24">
                                            <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Ordem</label>
                                            <input
                                              type="number"
                                              value={questionsEdited[indIdx]?.questions[qIdx]?.alternatives[aIdx]?.display_order || ''}
                                              onChange={(e) => {
                                                const updated = [...questionsEdited];
                                                updated[indIdx].questions[qIdx].alternatives[aIdx].display_order = parseInt(e.target.value, 10) || 0;
                                                setQuestionsEdited(updated);
                                              }}
                                              className="w-full p-2 border rounded bg-white text-gray-900 font-semibold text-center"
                                            />
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveAlternative(indIdx, qIdx, aIdx)}
                                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => handleAddAlternative(indIdx, qIdx)}
                                        className="inline-flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#312E81]"
                                      >
                                        <Plus className="w-4 h-4" /> Adicionar alternativa
                                      </button>
                                    </div>
                                  </div>
                                )}
                                {!question.alternatives || question.alternatives.length === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAddAlternative(indIdx, qIdx)}
                                    className="inline-flex items-center gap-1 text-xs text-[#4F46E5] hover:text-[#312E81]"
                                  >
                                    <Plus className="w-4 h-4" /> Adicionar alternativa
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-center py-4">Nenhuma questão neste indicador</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÃO SALVAR */}
              {(assessmentIndicatorsEdited.length > 0 || questionsEdited.length > 0) && (
                <button
                  onClick={() => setShowVersionModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[#4F46E5] text-white rounded-lg font-semibold hover:bg-[#312E81] w-full justify-center sticky bottom-6"
                >
                  <Save className="w-4 h-4" /> {selectedAssessment === 'new' ? 'Criar Assessment' : 'Salvar e Criar Nova Versão'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Nova Versão */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {selectedAssessment === 'new' 
                  ? '✨ Criar Novo Assessment' 
                  : isDeactivatingAssessment 
                    ? '⚠️ Desativar Assessment' 
                    : '⚠️ Criar Nova Versão do Assessment'}
              </h2>
              
              <div className="space-y-3 text-gray-700">
                {isDeactivatingAssessment ? (
                  <>
                    <p className="font-semibold">Você está prestes a <span className="text-red-600">desativar</span> este assessment.</p>
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 space-y-2">
                      <div className="flex gap-2">
                        <span className="text-red-600 font-bold">!</span>
                        <span>Este assessment ficará <strong>indisponível</strong> para usuários na lista de assessments.</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-red-600 font-bold">!</span>
                        <span>As versões existentes permanecem no histórico, mas o assessment não poderá ser iniciado.</span>
                      </div>
                    </div>
                  </>
                ) : selectedAssessment === 'new' ? (
                  <>
                    <p className="font-semibold">Você está prestes a criar um novo assessment.</p>
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 space-y-2">
                      <p>Uma versão inicial (v1) será criada automaticamente com os indicadores e perguntas configurados.</p>
                      <p>Certifique-se de que todos os dados estão corretos antes de confirmar.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Ao continuar, uma <span className="text-[#4F46E5]">NOVA VERSÃO</span> será criada:</p>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 space-y-2">
                      <div className="flex gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>A versão atual (v{currentVersion?.version_number}) permanecerá <strong>intacta</strong> para fins históricos</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Uma nova versão (v{(currentVersion?.version_number || 0) + 1}) será criada com suas alterações</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span>Resultados já registrados continuarão vinculados à versão original</span>
                      </div>
                    </div>

                    <div className="bg-red-50 border-l-4 border-red-500 p-3">
                      <div className="flex gap-2">
                        <span className="text-red-600 font-bold text-lg">⚠️</span>
                        <span className="font-semibold text-red-700">Esta ação <strong>NÃO PODERÁ SER DESFEITA</strong></span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowVersionModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                ✗ Cancelar
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-semibold transition ${
                  isSaving 
                    ? 'bg-gray-400 cursor-not-allowed opacity-50' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isSaving ? '⏳ Salvando...' : '✓ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
