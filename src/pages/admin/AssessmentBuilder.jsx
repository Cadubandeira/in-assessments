import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, GitBranch, Sparkles, X, Copy, Power } from 'lucide-react';
import RichTextEditor from '../../components/RichTextEditor';
import OverallRangesEditor from '../../components/OverallRangesEditor';
import AssessmentElementsModal from '../../components/AssessmentElementsModal';
import AssessmentBuilderSkeleton from '../../components/skeletons/admin/AssessmentBuilderSkeleton';
import PreAssessmentFieldsEditor from '../../components/PreAssessmentFieldsEditor';
import LevelRangesEditor from '../../components/LevelRangesEditor';
import XPGameificationEditor from '../../components/XPGameificationEditor';
import { TOKENS } from '../../config/tokens';
import { 
  createNewAssessmentVersion, 
  activateAssessmentVersion,
  listAssessmentVersions 
} from '../../utils/assessmentVersions';

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const makeTempId = () => `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const DEFAULT_DEEPENING_CARD_URL = 'https://www.innernetworking.com.br/';

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
  
  // Novos estados para schema e elementos opcionais
  const [assessmentSchema, setAssessmentSchema] = useState('indicadores'); // 'indicadores' | 'niveis'
  const [showElementsModal, setShowElementsModal] = useState(false);
  const [assessmentElements, setAssessmentElements] = useState({
    introduction: false,
    preAssessment: false,
    resultIntroduction: false,
    finalReflection: false,
    deepeningCard: false
  });
  const [deepeningCardUrl, setDeepeningCardUrl] = useState(DEFAULT_DEEPENING_CARD_URL);
  const [preAssessmentFields, setPreAssessmentFields] = useState([]);
  const [levels, setLevels] = useState([]); // Para schema 'niveis'
  const [levelMode, setLevelMode] = useState('single'); // 'single' | 'multi'
  
  // Para mode='single': mensagem quando não conquista nenhum nível
  const [noLevelAchievedTitle, setNoLevelAchievedTitle] = useState('');
  const [noLevelAchievedDescription, setNoLevelAchievedDescription] = useState('');
  
  // Modal de confirmação de remoção de elemento
  const [showRemoveElementModal, setShowRemoveElementModal] = useState(false);
  const [elementToRemove, setElementToRemove] = useState(null);
  const [removeConfirmed, setRemoveConfirmed] = useState(false);
  const [showUnpublishModal, setShowUnpublishModal] = useState(false);
  const [assessmentToUnpublish, setAssessmentToUnpublish] = useState(null);
  const [unpublishConfirmed, setUnpublishConfirmed] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  // Estados para Gamificação XP
  const [gamifyXp, setGamifyXp] = useState(false);
  const [xpCompletion, setXpCompletion] = useState(0);
  const [xpScore80, setXpScore80] = useState(0);
  const [xpScore90, setXpScore90] = useState(0);
  const [xpScore100, setXpScore100] = useState(0);

  // Estado para controlar exibição de intros de indicadores/níveis
  const [showIndicatorIntro, setShowIndicatorIntro] = useState(true);

  // Estado para controlar exibição de emblemas de níveis (multi-level mode)
  const [showLevelBadges, setShowLevelBadges] = useState(true);

  // Estado para duplicação
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Helper: derive active elements from loaded version data
  const deriveActiveElements = (versionData) => {
    const hasContent = (str) => {
      if (!str) return false;
      const trimmed = String(str).trim();
      // Check for empty HTML tags like <p></p>, <p><br></p>, etc.
      const withoutEmptyTags = trimmed.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, '').trim();
      return withoutEmptyTags.length > 0;
    };

    return {
      introduction: hasContent(versionData?.introduction_html),
      preAssessment: Array.isArray(versionData?.pre_assessment_fields) && versionData.pre_assessment_fields.length > 0,
      resultIntroduction: hasContent(versionData?.result_introduction),
      finalReflection: hasContent(versionData?.final_reflection),
      deepeningCard: versionData?.show_deepening_card !== false
    };
  };

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
          supabase.from('assessments').select('id, name, description, is_active'),
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
    // Create stable reference to check if this selection is still active
    const selectionId = Date.now();
    let currentSelectionId = selectionId;

    setSelectedAssessment(assessmentId);
    setSelectedIndicators([]);
    setRanges({});
    setAssessmentData(null);
    setAssessmentIndicatorsData([]);
    setQuestionsData([]);
    
    // Reset optional state consistently
    setIntroductionHtml('');
    setFinalReflection('');
    setResultIntroduction('');
    setPreAssessmentFields([]);
    setDeepeningCardUrl(DEFAULT_DEEPENING_CARD_URL);
    setNoLevelAchievedTitle('');
    setNoLevelAchievedDescription('');
    setAssessmentElements({
      introduction: false,
      preAssessment: false,
      resultIntroduction: false,
      finalReflection: false,
      deepeningCard: false
    });
    setLevels([]);
    setOverallRanges([]);
    
    // Reset XP gamification states
    setGamifyXp(false);
    setXpCompletion(0);
    setXpScore80(0);
    setXpScore90(0);
    setXpScore100(0);
    
    // Reset indicator intro display state
    setShowIndicatorIntro(true);
    setShowLevelBadges(true);

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

      // 2. Listar todas as versões e usar sempre a mais recente como atual
      const allVersions = await listAssessmentVersions(assessmentId);
      setVersions(allVersions);
      const latestVersion = allVersions?.[0];
      if (!latestVersion) {
        throw new Error('Nenhuma versão encontrada para este assessment.');
      }
      setCurrentVersion(latestVersion);

      // 3. Verificar se é schema 'niveis' ou 'indicadores'
      const { data: versionData, error: versionError } = await supabase
        .from('assessment_versions')
        .select('schema, level_mode')
        .eq('id', latestVersion.id)
        .single();

      const schema = versionData?.schema || assData.schema || 'indicadores';
      setAssessmentSchema(schema);

      if (schema === 'niveis') {
        // Carregar níveis
        setLevelMode(versionData?.level_mode || 'single');
        await loadVersionLevels(latestVersion.id);
      } else {
        // Carregar indicadores (existente)
        await loadVersionIndicators(latestVersion.id, assessmentId);
      }
      
      // Check if this selection is still active (not replaced by rapid switching)
      if (currentSelectionId !== selectionId) {
        console.warn('Assessment selection changed during load, discarding stale data');
        return;
      }
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
    setResultIntroduction('');
    setPreAssessmentFields([]);
    setDeepeningCardUrl(DEFAULT_DEEPENING_CARD_URL);
    setNoLevelAchievedTitle('');
    setNoLevelAchievedDescription('');
    setAssessmentElements({
      introduction: false,
      preAssessment: false,
      resultIntroduction: false,
      finalReflection: false,
      deepeningCard: false
    });
    setLevels([]);
    setAssessmentIndicatorsData([]);
    setQuestionsData([]);
    
    // Reset XP gamification states
    setGamifyXp(false);
    setXpCompletion(0);
    setXpScore80(0);
    setXpScore90(0);
    setXpScore100(0);
    
    // Reset indicator intro display state
    setShowIndicatorIntro(true);
    setShowLevelBadges(true);
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

    // Buscar introduction_html, reflexao final, pre_assessment_fields, overall_ranges e XP config da versão
    const { data: versionData, error: versionError } = await supabase
      .from('assessment_versions')
      .select('introduction_html, final_reflection, result_introduction, pre_assessment_fields, gamify_xp, xp_completion, xp_score_80_89, xp_score_90_99, xp_score_100, show_indicator_intro, show_deepening_card, deepening_card_url')
      .eq('id', versionId)
      .single();

    if (!versionError && versionData) {
      setIntroductionHtml(versionData.introduction_html || '');
      setFinalReflection(versionData.final_reflection || '');
      setResultIntroduction(versionData.result_introduction || '');
      setPreAssessmentFields(versionData.pre_assessment_fields || []);
      setDeepeningCardUrl(versionData.deepening_card_url || DEFAULT_DEEPENING_CARD_URL);
      
      // Carregar configurações de XP
      setGamifyXp(versionData.gamify_xp || false);
      setXpCompletion(versionData.xp_completion || 0);
      setXpScore80(versionData.xp_score_80_89 || 0);
      setXpScore90(versionData.xp_score_90_99 || 0);
      setXpScore100(versionData.xp_score_100 || 0);
      
      // Carregar configuração de exibição de intros de indicadores/níveis
      setShowIndicatorIntro(versionData.show_indicator_intro !== false);
      
      // Derive and set active elements based on loaded content
      const activeElements = deriveActiveElements(versionData);
      setAssessmentElements(activeElements);
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

  const loadVersionLevels = async (versionId) => {
    try {
      // Buscar introduction_html, reflexao final, pre_assessment_fields, campos de não conquista e XP config da versão
      const { data: versionData, error: versionError } = await supabase
        .from('assessment_versions')
        .select('introduction_html, final_reflection, result_introduction, pre_assessment_fields, no_level_achieved_title, no_level_achieved_description, level_mode, gamify_xp, xp_completion, xp_score_80_89, xp_score_90_99, xp_score_100, show_indicator_intro, show_level_badges, show_deepening_card, deepening_card_url')
        .eq('id', versionId)
        .single();

      if (!versionError && versionData) {
        setIntroductionHtml(versionData.introduction_html || '');
        setFinalReflection(versionData.final_reflection || '');
        setResultIntroduction(versionData.result_introduction || '');
        setPreAssessmentFields(versionData.pre_assessment_fields || []);
        setDeepeningCardUrl(versionData.deepening_card_url || DEFAULT_DEEPENING_CARD_URL);
        setNoLevelAchievedTitle(versionData.no_level_achieved_title || '');
        setNoLevelAchievedDescription(versionData.no_level_achieved_description || '');
        if (versionData.level_mode) {
           setShowIndicatorIntro(versionData.show_indicator_intro !== false);
           setShowLevelBadges(versionData.show_level_badges !== false);
          setLevelMode(versionData.level_mode);
        }
        
        // Carregar configurações de XP
        setGamifyXp(versionData.gamify_xp || false);
        setXpCompletion(versionData.xp_completion || 0);
        setXpScore80(versionData.xp_score_80_89 || 0);
        setXpScore90(versionData.xp_score_90_99 || 0);
        setXpScore100(versionData.xp_score_100 || 0);
        
        // Carregar configuração de exibição de intros de indicadores/níveis
        setShowIndicatorIntro(versionData.show_indicator_intro !== false);
        setShowLevelBadges(versionData.show_level_badges !== false);
        
        // Derive and set active elements based on loaded content
        const activeElements = deriveActiveElements(versionData);
        setAssessmentElements(activeElements);
      }

      // Buscar overall_ranges
      const { data: overallRangesData, error: overallRangesError } = await supabase
        .from('assessment_overall_ranges')
        .select('*')
        .eq('assessment_version_id', versionId)
        .order('min_score', { ascending: true });

      if (!overallRangesError && overallRangesData) {
        setOverallRanges(overallRangesData);
        console.log('✅ Overall ranges carregados:', overallRangesData);
      }

      // Buscar níveis
      const { data: levelsData, error: levelsError } = await supabase
        .from('assessment_levels')
        .select('*')
        .eq('assessment_version_id', versionId)
        .order('display_order', { ascending: true });

      if (levelsError) {
        console.error('Erro ao carregar níveis:', levelsError);
        return;
      }

      // Para cada nível, buscar questões, alternativas e ranges
      const levelsWithQuestions = await Promise.all(
        (levelsData || []).map(async (level) => {
          // Buscar ranges do nível
          const { data: rangesData, error: rangesError } = await supabase
            .from('assessment_level_ranges')
            .select('*')
            .eq('assessment_level_id', level.id)
            .order('min_score', { ascending: true });

          if (rangesError) {
            console.error(`Erro ao carregar ranges do nível ${level.name}:`, rangesError);
          }

          // Buscar questions do nível
          const { data: questionsData, error: questionsError } = await supabase
            .from('questions')
            .select('*')
            .eq('level_id', level.id)
            .order('display_order', { ascending: true });

          if (questionsError) {
            console.error(`Erro ao carregar questões do nível ${level.name}:`, questionsError);
            return { ...level, questions: [], ranges: rangesData || [] };
          }

          // Para cada questão, buscar alternativas
          const questionsWithAlternatives = await Promise.all(
            (questionsData || []).map(async (question) => {
              const { data: alternativesData, error: alternativesError } = await supabase
                .from('alternatives')
                .select('*')
                .eq('question_id', question.id)
                .order('display_order', { ascending: true });

              if (alternativesError) {
                console.error(`Erro ao carregar alternativas da questão ${question.id}:`, alternativesError);
                return { ...question, alternatives: [] };
              }

              return {
                ...question,
                alternatives: alternativesData || []
              };
            })
          );

          return {
            ...level,
            questions: questionsWithAlternatives,
            ranges: rangesData || []
          };
        })
      );

      setLevels(levelsWithQuestions);
      console.log('✅ Níveis carregados:', levelsWithQuestions);
    } catch (err) {
      console.error('Erro ao carregar níveis:', err);
      alert('Erro ao carregar níveis: ' + err.message);
    }
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

  const handleAddLevel = () => {
    const newLevel = {
      id: makeTempId(),
      name: `Nível ${levels.length + 1}`,
      description: '',
      display_order: levels.length + 1,
      acquire_threshold: 0, // Pontos necessários para obter o nível
      not_acquired_title: '', // Para mode='multi': título quando não conquista
      not_acquired_description: '', // Para mode='multi': descrição quando não conquista
      questions: [],
      ranges: [] // Faixas de interpretação baseadas na pontuação bruta do nível
    };
    setLevels(prev => [...prev, newLevel]);
  };

  const handleUpdateLevel = (levelIndex, updates) => {
    const updated = [...levels];
    updated[levelIndex] = { ...updated[levelIndex], ...updates };
    setLevels(updated);
  };

  const handleRemoveLevel = (levelIndex) => {
    setLevels(prev => prev
      .filter((_, idx) => idx !== levelIndex)
      .map((level, idx) => ({ ...level, display_order: idx + 1 }))
    );
  };

  const handleAddQuestionToLevel = (levelIndex) => {
    const updated = [...levels];
    const level = updated[levelIndex];
    const newQuestion = {
      id: makeTempId(),
      text: '',
      response_type: 'single_choice',
      is_required: true,
      display_order: (level.questions?.length || 0) + 1,
      alternatives: []
    };
    level.questions = [...(level.questions || []), newQuestion];
    updated[levelIndex] = { ...level };
    setLevels(updated);
  };

  const handleRemoveQuestionFromLevel = (levelIndex, questionIndex) => {
    const updated = [...levels];
    const level = updated[levelIndex];
    level.questions = (level.questions || [])
      .filter((_, idx) => idx !== questionIndex)
      .map((question, idx) => ({ ...question, display_order: idx + 1 }));
    updated[levelIndex] = { ...level };
    setLevels(updated);
  };

  const handleAddAlternativeToLevelQuestion = (levelIndex, questionIndex) => {
    const updated = [...levels];
    const question = updated[levelIndex].questions[questionIndex];
    const newAlt = {
      id: makeTempId(),
      text: '',
      score_value: 0,
      score_target: 'level',
      display_order: (question.alternatives?.length || 0) + 1
    };
    question.alternatives = [...(question.alternatives || []), newAlt];
    setLevels(updated);
  };

  const handleRemoveAlternativeFromLevelQuestion = (levelIndex, questionIndex, altIndex) => {
    const updated = [...levels];
    const question = updated[levelIndex].questions[questionIndex];
    question.alternatives = (question.alternatives || [])
      .filter((_, idx) => idx !== altIndex)
      .map((alt, idx) => ({ ...alt, display_order: idx + 1 }));
    setLevels(updated);
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

    if (assessmentElements.deepeningCard) {
      const trimmedDeepeningUrl = String(deepeningCardUrl || '').trim();
      if (!trimmedDeepeningUrl) {
        issues.push('Defina o link do Card de Aprofundamento ou remova este elemento opcional.');
      }
    }

    if (assessmentSchema === 'niveis') {
      if (!levels.length) {
        issues.push('Adicione pelo menos um nível.');
      }

      levels.forEach((level, levelIdx) => {
        const levelLabel = level.name || `Nível ${levelIdx + 1}`;
        const displayOrder = Number(level.display_order || 0);

        if (!level.name || !level.name.trim()) {
          issues.push(`Nível ${levelIdx + 1}: nome obrigatório.`);
        }

        if (!Number.isFinite(displayOrder) || displayOrder <= 0) {
          issues.push(`${levelLabel}: ordem do nível deve ser maior que 0.`);
        }

        // Validar acquire_threshold (pontos necessários)
        const acquireThreshold = Number(level.acquire_threshold);
        if (!Number.isFinite(acquireThreshold) || acquireThreshold < 0) {
          issues.push(`${levelLabel}: pontos necessários deve ser um número maior ou igual a 0.`);
        }

        const questions = level.questions || [];
        if (!questions.length) {
          issues.push(`${levelLabel}: adicione pelo menos uma questão.`);
        }

        questions.forEach((question, qIdx) => {
          const questionLabel = `${levelLabel} - Questão ${qIdx + 1}`;
          const questionOrder = Number(question.display_order || 0);

          if (!question.text || !question.text.trim()) {
            issues.push(`${questionLabel}: texto obrigatório.`);
          }

          if (!Number.isFinite(questionOrder) || questionOrder <= 0) {
            issues.push(`${questionLabel}: ordem da questão deve ser maior que 0.`);
          }

          const alternatives = question.alternatives || [];
          if (!alternatives.length) {
            issues.push(`${questionLabel}: adicione pelo menos uma alternativa.`);
          }

          alternatives.forEach((alt, aIdx) => {
            const altLabel = `${questionLabel} - Alternativa ${aIdx + 1}`;
            const altOrder = Number(alt.display_order || 0);
            const altScore = Number(alt.score_value);
            // Tratar score_target: se vazio/undefined, assumir 'level' como padrão
            const altTarget = (alt.score_target || 'level').trim();

            if (!alt.text || !alt.text.trim()) {
              issues.push(`${altLabel}: texto obrigatório.`);
            }

            if (!Number.isFinite(altOrder) || altOrder <= 0) {
              issues.push(`${altLabel}: ordem da alternativa deve ser maior que 0.`);
            }

            if (!Number.isFinite(altScore)) {
              issues.push(`${altLabel}: score deve ser numérico.`);
            }

            if (!['level', 'potential'].includes(altTarget)) {
              issues.push(`${altLabel}: selecione se pontua para nível ou potencial.`);
            }
          });
        });
      });
    } else {
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
    }

    if (issues.length > 0) {
      alert(`Corrija os seguintes itens antes de salvar:\n\n- ${issues.join('\n- ')}`);
      return false;
    }

    return true;
  };

  // Salvar assessment com schema='niveis'
  const handleSaveNiveisAssessment = async () => {
    setIsSaving(true);
    try {
      let targetAssessmentId = selectedAssessment;
      let targetVersionId = null;

      // CENÁRIO 1: CRIAR NOVO ASSESSMENT
      if (selectedAssessment === 'new') {
        const { data: newAssData, error: newAssError } = await supabase
          .from('assessments')
          .insert([{
            name: assessmentDataEdited.name,
            description: assessmentDataEdited.description,
            type: assessmentDataEdited.type,
            schema: 'niveis',
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

        const { data: newVerData, error: newVerError } = await supabase
          .from('assessment_versions')
          .insert([{
            assessment_id: targetAssessmentId,
            version_number: 1,
            is_active: true,
            schema: 'niveis',
            level_mode: levelMode,
            introduction_html: introductionHtml,
            final_reflection: finalReflection || null,
            result_introduction: resultIntroduction || null,
            pre_assessment_fields: preAssessmentFields.length > 0 ? preAssessmentFields : null,
            no_level_achieved_title: noLevelAchievedTitle || null,
            no_level_achieved_description: noLevelAchievedDescription || null,
            visualization_type: assessmentDataEdited.visualization_type || '["radar"]',
            gamify_xp: gamifyXp || false,
            xp_completion: gamifyXp ? xpCompletion : 0,
            xp_score_80_89: gamifyXp ? xpScore80 : 0,
            xp_score_90_99: gamifyXp ? xpScore90 : 0,
            xp_score_100: gamifyXp ? xpScore100 : 0,
            show_indicator_intro: showIndicatorIntro !== false,
            show_level_badges: showLevelBadges !== false,
            show_deepening_card: assessmentElements.deepeningCard === true,
            deepening_card_url: assessmentElements.deepeningCard
              ? (String(deepeningCardUrl || '').trim() || DEFAULT_DEEPENING_CARD_URL)
              : null
          }])
          .select()
          .single();

        if (newVerError) throw newVerError;
        targetVersionId = newVerData.id;
      } else {
        // CENÁRIO 2: ATUALIZAR EXISTENTE (criar nova versão)
        const { data: existingVersions, error: versionsError } = await supabase
          .from('assessment_versions')
          .select('version_number')
          .eq('assessment_id', selectedAssessment)
          .order('version_number', { ascending: false })
          .limit(1);

        if (versionsError) throw versionsError;

        const maxVersionNumber = existingVersions && existingVersions.length > 0
          ? existingVersions[0].version_number
          : 0;
        const nextVersionNumber = maxVersionNumber + 1;

        const { data: newVerData, error: newVerError } = await supabase
          .from('assessment_versions')
          .insert([{
            assessment_id: selectedAssessment,
            version_number: nextVersionNumber,
            is_active: false,
            schema: 'niveis',
            level_mode: levelMode,
            introduction_html: introductionHtml,
            final_reflection: finalReflection || null,
            result_introduction: resultIntroduction || null,
            pre_assessment_fields: preAssessmentFields.length > 0 ? preAssessmentFields : null,
            no_level_achieved_title: noLevelAchievedTitle || null,
            no_level_achieved_description: noLevelAchievedDescription || null,
            visualization_type: assessmentDataEdited.visualization_type || '["radar"]',
            gamify_xp: gamifyXp || false,
            xp_completion: gamifyXp ? xpCompletion : 0,
            xp_score_80_89: gamifyXp ? xpScore80 : 0,
            xp_score_90_99: gamifyXp ? xpScore90 : 0,
            xp_score_100: gamifyXp ? xpScore100 : 0,
            show_indicator_intro: showIndicatorIntro !== false,
            show_level_badges: showLevelBadges !== false,
            show_deepening_card: assessmentElements.deepeningCard === true,
            deepening_card_url: assessmentElements.deepeningCard
              ? (String(deepeningCardUrl || '').trim() || DEFAULT_DEEPENING_CARD_URL)
              : null
          }])
          .select()
          .single();

        if (newVerError) throw newVerError;
        targetVersionId = newVerData.id;

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
      }

      // 4. Salvar overall_ranges (se houver)
      if (targetVersionId && overallRanges && overallRanges.length > 0) {
        const overallRangesData = overallRanges
          .filter(r => {
            const label = String(r.label || '').trim();
            const minScore = r.min_score !== undefined && r.min_score !== null && r.min_score !== '' 
              ? Number(r.min_score) 
              : null;
            const maxScore = r.max_score !== undefined && r.max_score !== null && r.max_score !== '' 
              ? Number(r.max_score) 
              : null;
            
            const hasLabel = label.length > 0;
            const hasValidMinScore = !isNaN(minScore) && minScore !== null;
            const hasValidMaxScore = !isNaN(maxScore) && maxScore !== null;
            const isValidRange = hasValidMinScore && hasValidMaxScore && minScore <= maxScore;
            
            return hasLabel && isValidRange;
          })
          .map(r => ({
            assessment_version_id: targetVersionId,
            min_score: Number(r.min_score),
            max_score: Number(r.max_score),
            label: String(r.label || '').trim(),
            interpretation: String(r.interpretation || '').trim()
          }));

        if (overallRangesData.length > 0) {
          const { error: overallRangesError } = await supabase
            .from('assessment_overall_ranges')
            .insert(overallRangesData);

          if (overallRangesError) throw overallRangesError;
          console.log(`✅ ${overallRangesData.length} faixa(s) global(is) salva(s)`);
        }
      }

      // 5. Salvar Levels
      for (const level of levels) {
        const { data: levelData, error: levelError } = await supabase
          .from('assessment_levels')
          .insert([{
            assessment_version_id: targetVersionId,
            name: level.name,
            description: level.description || null,
            display_order: level.display_order,
            acquire_threshold: level.acquire_threshold || 0,
            not_acquired_title: level.not_acquired_title || null,
            not_acquired_description: level.not_acquired_description || null
          }])
          .select()
          .single();

        if (levelError) throw levelError;
        const levelId = levelData.id;

        // 6. Salvar Level Ranges (se houver)
        if (level.ranges && level.ranges.length > 0) {
          const levelRangesData = level.ranges
            .filter(r => {
              const label = String(r.label || '').trim();
              const minScore = r.min_score !== undefined && r.min_score !== null && r.min_score !== '' 
                ? Number(r.min_score) 
                : null;
              const maxScore = r.max_score !== undefined && r.max_score !== null && r.max_score !== '' 
                ? Number(r.max_score) 
                : null;
              
              const hasLabel = label.length > 0;
              const hasValidMinScore = !isNaN(minScore) && minScore !== null;
              const hasValidMaxScore = !isNaN(maxScore) && maxScore !== null;
              const isValidRange = hasValidMinScore && hasValidMaxScore && minScore <= maxScore;
              
              return hasLabel && isValidRange;
            })
            .map(r => ({
              assessment_level_id: levelId,
              min_score: Number(r.min_score),
              max_score: Number(r.max_score),
              label: String(r.label || '').trim(),
              interpretation: String(r.interpretation || '').trim()
            }));

          if (levelRangesData.length > 0) {
            const { error: levelRangesError } = await supabase
              .from('assessment_level_ranges')
              .insert(levelRangesData);

            if (levelRangesError) throw levelRangesError;
            console.log(`✅ ${levelRangesData.length} faixa(s) de interpretação salva(s) para o nível "${level.name}"`);
          }
        }

        // 7. Salvar Questions deste level
        for (const question of level.questions) {
          const { data: questionData, error: questionError } = await supabase
            .from('questions')
            .insert([{
              level_id: levelId,
              text: question.text,
              response_type: question.response_type,
              is_required: question.is_required !== false,
              display_order: question.display_order
            }])
            .select()
            .single();

          if (questionError) throw questionError;
          const questionId = questionData.id;

          // 8. Salvar Alternatives desta question
          for (const alt of question.alternatives) {
            const { error: altError } = await supabase
              .from('alternatives')
              .insert([{
                question_id: questionId,
                text: alt.text,
                score_value: parseFloat(alt.score_value) || 0,
                score_target: alt.score_target || 'level',
                display_order: alt.display_order
              }]);

            if (altError) throw altError;
          }
        }
      }

      // 9. Finalizar e decidir se publica a versão
      const finalAssessmentId = selectedAssessment === 'new' ? targetAssessmentId : selectedAssessment;
      
      // Buscar dados da versão criada para mostrar número
      const { data: versionData } = await supabase
        .from('assessment_versions')
        .select('version_number')
        .eq('id', targetVersionId)
        .single();
      
      const versionNumber = versionData?.version_number || '?';

      // Fechar o modal (operação de salvamento concluída)
      setShowVersionModal(false);

      // Se foi criação de novo assessment, carregar e não perguntar sobre publicação (já vem ativo)
      if (selectedAssessment === 'new') {
        await handleSelectAssessment(targetAssessmentId);
        alert('✅ Assessment de níveis criado com sucesso!');
        setIsSaving(false);
        return;
      }

      // Se foi criação de nova versão, perguntar se deseja publicar
      const shouldPublish = confirm(
        `✓ Nova versão v${versionNumber} criada com sucesso!\n\nDeseja publicar esta versão agora? Ela se tornará a versão ativa do assessment.`
      );

      if (shouldPublish) {
        await activateAssessmentVersion(finalAssessmentId, targetVersionId);

        setAssessmentData((prev) => (prev ? { ...prev, is_active: true } : prev));
        setAssessmentDataEdited((prev) => (prev ? { ...prev, is_active: true } : prev));

        // Recarregar versões novamente
        const updatedVersions = await listAssessmentVersions(finalAssessmentId);
        setVersions(updatedVersions);
        setCurrentVersion(updatedVersions?.[0] || { id: targetVersionId, version_number: versionNumber, is_active: true });
        
        alert(`✓ Versão v${versionNumber} publicada com sucesso!\nEla agora é a versão ativa do assessment.`);
      } else {
        // Recarregar lista de versões
        const allVersions = await listAssessmentVersions(finalAssessmentId);
        setVersions(allVersions);
        setCurrentVersion(allVersions?.[0] || { id: targetVersionId, version_number: versionNumber, is_active: false });
        
        alert(`✓ Versão v${versionNumber} criada com sucesso!\nVocê pode publicá-la mais tarde clicando em "Publicar".`);
      }
      
      // Recarregar os dados da versão
      await loadVersionLevels(targetVersionId, finalAssessmentId);

    } catch (error) {
      console.error('❌ Erro ao salvar assessment de níveis:', error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
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

    // Redirecionar para função específica de níveis
    if (assessmentSchema === 'niveis') {
      return handleSaveNiveisAssessment();
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
            pre_assessment_fields: preAssessmentFields.length > 0 ? preAssessmentFields : null,
            visualization_type: assessmentDataEdited.visualization_type || '["radar"]',
            gamify_xp: gamifyXp || false,
            xp_completion: gamifyXp ? xpCompletion : 0,
            xp_score_80_89: gamifyXp ? xpScore80 : 0,
            xp_score_90_99: gamifyXp ? xpScore90 : 0,
            xp_score_100: gamifyXp ? xpScore100 : 0,
            show_indicator_intro: showIndicatorIntro !== false,
            show_deepening_card: assessmentElements.deepeningCard === true,
            deepening_card_url: assessmentElements.deepeningCard
              ? (String(deepeningCardUrl || '').trim() || DEFAULT_DEEPENING_CARD_URL)
              : null
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
        // Adicionar campos de XP
        versionUpdateFields.gamify_xp = gamifyXp || false;
        versionUpdateFields.xp_completion = gamifyXp ? xpCompletion : 0;
        versionUpdateFields.xp_score_80_89 = gamifyXp ? xpScore80 : 0;
        versionUpdateFields.xp_score_90_99 = gamifyXp ? xpScore90 : 0;
        versionUpdateFields.xp_score_100 = gamifyXp ? xpScore100 : 0;
        versionUpdateFields.show_indicator_intro = showIndicatorIntro !== false;
        versionUpdateFields.show_level_badges = showLevelBadges !== false;
        versionUpdateFields.show_deepening_card = assessmentElements.deepeningCard === true;
        versionUpdateFields.deepening_card_url = assessmentElements.deepeningCard
          ? (String(deepeningCardUrl || '').trim() || DEFAULT_DEEPENING_CARD_URL)
          : null;
        
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
        // Adicionar campos de XP
        versionTextUpdate.gamify_xp = gamifyXp || false;
        versionTextUpdate.xp_completion = gamifyXp ? xpCompletion : 0;
        versionTextUpdate.xp_score_80_89 = gamifyXp ? xpScore80 : 0;
        versionTextUpdate.xp_score_90_99 = gamifyXp ? xpScore90 : 0;
        versionTextUpdate.xp_score_100 = gamifyXp ? xpScore100 : 0;
        versionTextUpdate.show_indicator_intro = showIndicatorIntro !== false;
        versionTextUpdate.show_level_badges = showLevelBadges !== false;
        versionTextUpdate.show_deepening_card = assessmentElements.deepeningCard === true;
        versionTextUpdate.deepening_card_url = assessmentElements.deepeningCard
          ? (String(deepeningCardUrl || '').trim() || DEFAULT_DEEPENING_CARD_URL)
          : null;
        
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

        setAssessmentData((prev) => (prev ? { ...prev, is_active: true } : prev));
        setAssessmentDataEdited((prev) => (prev ? { ...prev, is_active: true } : prev));

        // Recarregar versões novamente
        const updatedVersions = await listAssessmentVersions(targetAssessmentId);
        setVersions(updatedVersions);
        setCurrentVersion(updatedVersions?.[0] || newVersionObj);
        
        alert(`✓ Versão v${newVersionObj.version_number} publicada com sucesso!\nEla agora é a versão ativa do assessment.`);
      } else {
        setCurrentVersion(newVersionObj);
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

      // Sincronizar estado local do assessment (publicado)
      setAssessmentData((prev) => (prev ? { ...prev, is_active: true } : prev));
      setAssessmentDataEdited((prev) => (prev ? { ...prev, is_active: true } : prev));
      
      // Recarregar versões
      const allVersions = await listAssessmentVersions(selectedAssessment);
      setVersions(allVersions);

      // Manter a versão mais recente como atual
      setCurrentVersion(allVersions?.[0] || currentVersion);
      
      alert('Versão publicada com sucesso!');
    } catch (err) {
      alert('Erro ao publicar versão: ' + (err.message || String(err)));
    }
  };

  const isDeactivatingAssessment = assessmentData?.is_active === true && assessmentDataEdited?.is_active === false;
  const isAssessmentPublished = assessmentData?.is_active === true;

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

  // Handler para toggle de elementos
  const handleToggleElement = (elementId) => {
    if (elementId === 'deepeningCard' && !String(deepeningCardUrl || '').trim()) {
      setDeepeningCardUrl(DEFAULT_DEEPENING_CARD_URL);
    }
    setAssessmentElements(prev => ({
      ...prev,
      [elementId]: !prev[elementId]
    }));
  };

  // Handler para abrir modal de confirmação de remoção
  const handleRequestRemoveElement = (elementId) => {
    setElementToRemove(elementId);
    setRemoveConfirmed(false);
    setShowRemoveElementModal(true);
  };

  // Handler para confirmar remoção de elemento
  const handleConfirmRemoveElement = () => {
    if (!removeConfirmed || !elementToRemove) return;
    
    setAssessmentElements(prev => ({
      ...prev,
      [elementToRemove]: false
    }));
    
    // Limpar dados do elemento removido
    if (elementToRemove === 'introduction') {
      setIntroductionHtml('');
    } else if (elementToRemove === 'resultIntroduction') {
      setResultIntroduction('');
    } else if (elementToRemove === 'finalReflection') {
      setFinalReflection('');
    } else if (elementToRemove === 'preAssessment') {
      setPreAssessmentFields([]);
    } else if (elementToRemove === 'deepeningCard') {
      setDeepeningCardUrl(DEFAULT_DEEPENING_CARD_URL);
    }
    
    setShowRemoveElementModal(false);
    setElementToRemove(null);
    setRemoveConfirmed(false);
  };

  // Mapa de nomes dos elementos
  const elementNames = {
    introduction: 'Introdução',
    preAssessment: 'Pré-Assessment',
    resultIntroduction: 'Introdução ao Resultado',
    finalReflection: 'Reflexão Final',
    deepeningCard: 'Card de Aprofundamento'
  };

  const hasNiveisContent = levels.length > 0 && levels.some(level => (level.questions || []).length > 0);

  const handleDuplicateAssessment = async (assessmentId, e) => {
    e.stopPropagation();
    if (isDuplicating) return;
    setIsDuplicating(true);
    try {
      // 1. Buscar assessment fonte
      const { data: src, error: srcErr } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();
      if (srcErr) throw srcErr;

      // 2. Buscar versão mais recente
      const { data: srcVersions, error: verErr } = await supabase
        .from('assessment_versions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('version_number', { ascending: false })
        .limit(1);
      if (verErr) throw verErr;
      const srcVer = srcVersions?.[0];
      if (!srcVer) throw new Error('Nenhuma versão encontrada');

      // 3. Buscar overall_ranges
      const { data: srcOverallRanges } = await supabase
        .from('assessment_overall_ranges')
        .select('*')
        .eq('assessment_version_id', srcVer.id);

      // 4. Criar novo assessment (não publicado)
      const { data: newAss, error: newAssErr } = await supabase
        .from('assessments')
        .insert([{
          name: `${src.name} [cópia]`,
          description: src.description,
          type: src.type,
          schema: src.schema,
          aggregation_type: src.aggregation_type,
          visualization_type: src.visualization_type,
          availability_type: src.availability_type,
          is_active: false,
          version: '1'
        }])
        .select()
        .single();
      if (newAssErr) throw newAssErr;

      // 5. Criar nova versão
      const { data: newVer, error: newVerErr } = await supabase
        .from('assessment_versions')
        .insert([{
          assessment_id: newAss.id,
          version_number: 1,
          is_active: false,
          schema: srcVer.schema,
          level_mode: srcVer.level_mode,
          introduction_html: srcVer.introduction_html,
          final_reflection: srcVer.final_reflection,
          result_introduction: srcVer.result_introduction,
          pre_assessment_fields: srcVer.pre_assessment_fields,
          no_level_achieved_title: srcVer.no_level_achieved_title,
          no_level_achieved_description: srcVer.no_level_achieved_description,
          visualization_type: srcVer.visualization_type,
          gamify_xp: srcVer.gamify_xp,
          xp_completion: srcVer.xp_completion,
          xp_score_80_89: srcVer.xp_score_80_89,
          xp_score_90_99: srcVer.xp_score_90_99,
          xp_score_100: srcVer.xp_score_100,
          show_indicator_intro: srcVer.show_indicator_intro,
          show_level_badges: srcVer.show_level_badges,
          show_deepening_card: srcVer.show_deepening_card,
          deepening_card_url: srcVer.deepening_card_url
        }])
        .select()
        .single();
      if (newVerErr) throw newVerErr;

      // 6. Copiar overall_ranges
      if (srcOverallRanges?.length > 0) {
        const { error: orErr } = await supabase
          .from('assessment_overall_ranges')
          .insert(srcOverallRanges.map(r => ({
            assessment_version_id: newVer.id,
            min_score: r.min_score,
            max_score: r.max_score,
            label: r.label,
            interpretation: r.interpretation
          })));
        if (orErr) throw orErr;
      }

      if (src.schema === 'niveis') {
        // 7. Copiar níveis
        const { data: srcLevels } = await supabase
          .from('assessment_levels')
          .select('*')
          .eq('assessment_version_id', srcVer.id)
          .order('display_order', { ascending: true });

        for (const level of (srcLevels || [])) {
          const { data: newLevel, error: lvlErr } = await supabase
            .from('assessment_levels')
            .insert([{
              assessment_version_id: newVer.id,
              name: level.name,
              description: level.description,
              display_order: level.display_order,
              acquire_threshold: level.acquire_threshold,
              not_acquired_title: level.not_acquired_title,
              not_acquired_description: level.not_acquired_description
            }])
            .select()
            .single();
          if (lvlErr) throw lvlErr;

          // Copiar level ranges
          const { data: lvlRanges } = await supabase
            .from('assessment_level_ranges')
            .select('*')
            .eq('assessment_level_id', level.id);
          if (lvlRanges?.length > 0) {
            await supabase.from('assessment_level_ranges').insert(
              lvlRanges.map(r => ({
                assessment_level_id: newLevel.id,
                min_score: r.min_score,
                max_score: r.max_score,
                label: r.label,
                interpretation: r.interpretation
              }))
            );
          }

          // Copiar perguntas do nível
          const { data: lvlQuestions } = await supabase
            .from('questions')
            .select('*')
            .eq('level_id', level.id)
            .order('display_order', { ascending: true });

          for (const q of (lvlQuestions || [])) {
            const { data: newQ, error: qErr } = await supabase
              .from('questions')
              .insert([{
                level_id: newLevel.id,
                text: q.text,
                response_type: q.response_type,
                is_required: q.is_required,
                display_order: q.display_order
              }])
              .select()
              .single();
            if (qErr) throw qErr;

            const { data: alts } = await supabase
              .from('alternatives')
              .select('*')
              .eq('question_id', q.id)
              .order('display_order', { ascending: true });
            if (alts?.length > 0) {
              await supabase.from('alternatives').insert(
                alts.map(a => ({
                  question_id: newQ.id,
                  text: a.text,
                  score_value: a.score_value,
                  display_order: a.display_order
                }))
              );
            }
          }
        }
      } else {
        // 7. Copiar assessment_indicators
        const { data: srcAI } = await supabase
          .from('assessment_indicators')
          .select('*, assessment_indicator_ranges(*)')
          .eq('assessment_version_id', srcVer.id)
          .order('display_order', { ascending: true });

        for (const ai of (srcAI || [])) {
          const { data: newAI, error: aiErr } = await supabase
            .from('assessment_indicators')
            .insert([{
              assessment_version_id: newVer.id,
              indicator_master_id: ai.indicator_master_id,
              display_order: ai.display_order,
              weight: ai.weight
            }])
            .select()
            .single();
          if (aiErr) throw aiErr;

          if (ai.assessment_indicator_ranges?.length > 0) {
            await supabase.from('assessment_indicator_ranges').insert(
              ai.assessment_indicator_ranges.map(r => ({
                assessment_indicator_id: newAI.id,
                min_score: r.min_score,
                max_score: r.max_score,
                label: r.label,
                interpretation: r.interpretation
              }))
            );
          }
        }

        // 8. Copiar indicators (com perguntas e alternativas)
        const { data: srcInd } = await supabase
          .from('indicators')
          .select('*, questions(*, alternatives(*))')
          .eq('assessment_id', assessmentId)
          .order('display_order', { ascending: true });

        for (const ind of (srcInd || [])) {
          const { data: newInd, error: indErr } = await supabase
            .from('indicators')
            .insert([{
              assessment_id: newAss.id,
              indicator_master_id: ind.indicator_master_id,
              name: ind.name,
              conceptual_description: ind.conceptual_description,
              display_order: ind.display_order,
              weight: ind.weight
            }])
            .select()
            .single();
          if (indErr) throw indErr;

          for (const q of (ind.questions || [])) {
            const { data: newQ, error: qErr } = await supabase
              .from('questions')
              .insert([{
                indicator_id: newInd.id,
                text: q.text,
                response_type: q.response_type,
                is_required: q.is_required,
                display_order: q.display_order
              }])
              .select()
              .single();
            if (qErr) throw qErr;

            const alts = q.alternatives || [];
            if (alts.length > 0) {
              await supabase.from('alternatives').insert(
                alts.map(a => ({
                  question_id: newQ.id,
                  text: a.text,
                  score_value: a.score_value,
                  display_order: a.display_order
                }))
              );
            }
          }
        }
      }

      // Atualizar lista de assessments
      const { data: updatedList } = await supabase
        .from('assessments')
        .select('id, name, description, is_active');
      if (updatedList) setAssessments(updatedList);

      alert(`Assessment "${src.name} [cópia]" criado com sucesso!`);
    } catch (err) {
      console.error('Erro ao duplicar assessment:', err);
      alert('Erro ao duplicar: ' + (err.message || String(err)));
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleRequestUnpublishAssessment = (assessment, e) => {
    e.stopPropagation();
    if (!assessment?.id || assessment?.is_active === false) return;
    setAssessmentToUnpublish(assessment);
    setUnpublishConfirmed(false);
    setShowUnpublishModal(true);
  };

  const handleConfirmUnpublishAssessment = async () => {
    if (!assessmentToUnpublish?.id || !unpublishConfirmed || isUnpublishing) return;

    setIsUnpublishing(true);
    try {
      const { error: updateError } = await supabase
        .from('assessments')
        .update({ is_active: false })
        .eq('id', assessmentToUnpublish.id);

      if (updateError) throw updateError;

      setAssessments((prev) => prev.map((assessment) => (
        assessment.id === assessmentToUnpublish.id
          ? { ...assessment, is_active: false }
          : assessment
      )));

      if (selectedAssessment === assessmentToUnpublish.id) {
        setAssessmentData((prev) => prev ? { ...prev, is_active: false } : prev);
        setAssessmentDataEdited((prev) => prev ? { ...prev, is_active: false } : prev);
      }

      setShowUnpublishModal(false);
      setAssessmentToUnpublish(null);
      setUnpublishConfirmed(false);
    } catch (err) {
      console.error('Erro ao remover publicação do assessment:', err);
      alert('Erro ao remover publicação: ' + (err.message || String(err)));
    } finally {
      setIsUnpublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F3EC] to-[#EEF2FF]">
      {/* HERO SECTION */}
      <section className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] pt-[72px] pb-24 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
          <div className="absolute top-20 -left-10 w-48 h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -right-20 w-64 h-64 md:w-96 md:h-96 bg-[#312E81] rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 relative z-10 w-full">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 mb-6 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
          <h1 className={`${TOKENS.fonts.serif} text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight`}>
            Assessment Builder
          </h1>
          <p className="text-white/90 text-base sm:text-lg max-w-3xl">
            Configure assessments com múltiplos indicadores ou níveis sequenciais
          </p>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 -mt-16 relative z-20 w-full pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Seleção de Assessment */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Assessments</h2>
              <button
                onClick={handleInitNewAssessment}
                className="p-2 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-lg hover:shadow-lg transition-all"
                title="Criar Novo Assessment"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-center justify-between rounded-lg border-2 transition-all ${
                    selectedAssessment === a.id
                      ? 'bg-gradient-to-r from-[#4F46E5] to-[#6366F1] border-[#4F46E5] shadow-lg'
                      : 'border-gray-200 hover:border-[#4F46E5] bg-white'
                  }`}
                >
                  <button
                    onClick={() => handleSelectAssessment(a.id)}
                    className={`flex-1 text-left px-4 py-3 font-medium truncate ${
                      selectedAssessment === a.id ? 'text-white' : 'text-gray-800'
                    }`}
                  >
                    {a.name}
                  </button>
                  {selectedAssessment === a.id && (
                    <div className="flex items-center gap-1.5 pr-2">
                      <button
                        onClick={(e) => handleDuplicateAssessment(a.id, e)}
                        disabled={isDuplicating}
                        title="Duplicar"
                        className="flex-shrink-0 p-1.5 rounded transition-colors disabled:cursor-not-allowed text-white/80 hover:text-white hover:bg-white/20"
                      >
                        {isDuplicating
                          ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : <Copy className="w-4 h-4" />}
                      </button>

                      {a.is_active !== false && (
                        <button
                          onClick={(e) => handleRequestUnpublishAssessment(a, e)}
                          title="Remover publicação"
                          className="flex-shrink-0 p-1.5 rounded transition-colors text-white/80 hover:text-white hover:bg-red-500/30"
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Versões do Assessment */}
          {selectedAssessment && selectedAssessment !== 'new' && currentVersion && (
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-[#4F46E5]" /> Versões
                </h2>
              </div>
              
              <div className="space-y-2">
                {versions.map((v) => (
                  <div
                    key={v.id}
                    className={`px-4 py-3 rounded-lg text-sm border-2 transition-all ${
                      v.id === currentVersion.id
                        ? 'bg-indigo-50 border-[#4F46E5]'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">v{v.version_number}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                            v.id === currentVersion.id
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {v.id === currentVersion.id ? 'Atual' : 'Antiga'}
                        </span>

                        {isDeactivatingAssessment && v.id === currentVersion.id ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-semibold">Desativando</span>
                        ) : (v.is_active && isAssessmentPublished) ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">Publicada</span>
                        ) : (v.is_active && !isAssessmentPublished) ? (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-semibold">Não publicada</span>
                        ) : (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold">Não publicada</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-medium">
                      {new Date(v.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>

              {currentVersion && (!currentVersion.is_active || !isAssessmentPublished) && (
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
            <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-12 shadow-lg text-center">
              <p className="text-gray-500 text-lg">Selecione um assessment para visualizar suas configurações</p>
            </div>
          )}

          {(selectedAssessment || selectedAssessment === 'new') && assessmentDataEdited && currentVersion && (
            <>
              {/* 1. INFORMAÇÕES BÁSICAS DO ASSESSMENT */}
              <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`${TOKENS.fonts.serif} text-2xl font-bold text-[#1E1B4B]`}>
                    Informações do Assessment
                  </h2>
                  <button
                    onClick={() => setShowElementsModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Adicionar Elementos
                  </button>
                </div>

                {/* Schema Selection (apenas para novo assessment) */}
                {selectedAssessment === 'new' && (
                  <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-[#4F46E5] rounded-xl">
                    <label className="text-sm font-bold text-[#4F46E5] uppercase tracking-wide block mb-3">
                      Escolha o Schema do Assessment
                    </label>
                    <div className="space-y-3">
                      <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        assessmentSchema === 'indicadores' 
                          ? 'border-[#4F46E5] bg-white shadow-md' 
                          : 'border-gray-200 bg-white/50 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="schema"
                          value="indicadores"
                          checked={assessmentSchema === 'indicadores'}
                          onChange={(e) => setAssessmentSchema(e.target.value)}
                          className="mt-1 w-4 h-4 text-[#4F46E5]"
                        />
                        <div className="flex-1">
                          <strong className="text-gray-900">Indicadores</strong>
                          <p className="text-sm text-gray-600 mt-1">
                            Múltiplos indicadores independentes, cada um com seu score percentual
                          </p>
                        </div>
                      </label>
                      
                      <label className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        assessmentSchema === 'niveis' 
                          ? 'border-[#4F46E5] bg-white shadow-md' 
                          : 'border-gray-200 bg-white/50 hover:border-gray-300'
                      }`}>
                        <input
                          type="radio"
                          name="schema"
                          value="niveis"
                          checked={assessmentSchema === 'niveis'}
                          onChange={(e) => setAssessmentSchema(e.target.value)}
                          className="mt-1 w-4 h-4 text-[#4F46E5]"
                        />
                        <div className="flex-1">
                          <strong className="text-gray-900">Níveis</strong>
                          <p className="text-sm text-gray-600 mt-1">
                            Níveis sequenciais (Bronze→Platina) com pontuação 0-100 de maturidade
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Nome</label>
                    <input
                      type="text"
                      value={assessmentDataEdited?.name || ''}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, name: e.target.value })}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                      placeholder="Ex: Maturidade em Liderança"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tipo</label>
                    <input
                      type="text"
                      value={assessmentDataEdited?.type || ''}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, type: e.target.value })}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                      placeholder="Ex: competencia"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Agregação</label>
                    <input
                      type="text"
                      value={assessmentDataEdited?.aggregation_type || ''}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, aggregation_type: e.target.value })}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                      placeholder="Ex: sum"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">Tipos de Visualização</label>
                    <div className="flex gap-3 flex-wrap">
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
                          className={`px-4 py-3 rounded-lg border-2 text-sm font-bold transition-all ${
                            (Array.isArray(assessmentDataEdited?.visualization_type) 
                              ? assessmentDataEdited.visualization_type 
                              : [])
                              .includes(type)
                              ? 'border-[#4F46E5] bg-indigo-50 text-[#4F46E5] shadow-md'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {type === 'radar' ? '📊 Radar' : '📈 Barras'}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Disponibilidade</label>
                    <select
                      value={assessmentDataEdited?.availability_type || 'free_for_all'}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, availability_type: e.target.value })}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                    >
                      <option value="free_for_all">Grátis para Todos</option>
                      <option value="first_free">Primeira Resposta Grátis</option>
                      <option value="paid_unlock">Desbloqueio Pago</option>
                      <option value="subscription_only">Apenas Assinatura</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Status</label>
                    <select
                      value={assessmentDataEdited?.is_active ? 'ativo' : 'desativado'}
                      onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, is_active: e.target.value === 'ativo' })}
                      className={`w-full p-3 border-2 border-gray-200 rounded-lg bg-white font-bold focus:border-[#4F46E5] focus:outline-none transition-colors ${
                        assessmentDataEdited?.is_active ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      <option value="ativo">✓ Ativo</option>
                      <option value="desativado">✗ Desativado</option>
                    </select>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Descrição</label>
                  <textarea
                    value={assessmentDataEdited?.description || ''}
                    onChange={(e) => setAssessmentDataEdited({ ...assessmentDataEdited, description: e.target.value })}
                    rows={3}
                    placeholder="Adicione uma descrição para o assessment..."
                    className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 focus:border-[#4F46E5] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 2. ELEMENTOS OPCIONAIS */}
              {assessmentElements.introduction && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                      Introdução
                    </h2>
                    <button
                      onClick={() => handleRequestRemoveElement('introduction')}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover Introdução"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <RichTextEditor 
                    value={introductionHtml}
                    onChange={setIntroductionHtml}
                    placeholder="Digite a introdução do assessment aqui..."
                  />
                </div>
              )}

              {assessmentElements.preAssessment && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                      Pré-Assessment
                    </h2>
                    <button
                      onClick={() => handleRequestRemoveElement('preAssessment')}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover Pré-Assessment"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Campos customizados coletados antes do início do assessment. Utilize para capturar informações contextuais como nome da empresa, segmento, número de colaboradores, etc.
                  </p>
                  
                  <PreAssessmentFieldsEditor 
                    fields={preAssessmentFields}
                    onChange={setPreAssessmentFields}
                  />
                </div>
              )}

              {assessmentElements.resultIntroduction && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                      Introdução ao Resultado
                    </h2>
                    <button
                      onClick={() => handleRequestRemoveElement('resultIntroduction')}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover Introdução ao Resultado"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Texto opcional exibido no topo da página de resultado do assessment.
                  </p>
                  <RichTextEditor
                    value={resultIntroduction}
                    onChange={setResultIntroduction}
                    placeholder="Escreva uma introdução para o resultado..."
                  />
                </div>
              )}

              {assessmentElements.finalReflection && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                      Reflexão Final
                    </h2>
                    <button
                      onClick={() => handleRequestRemoveElement('finalReflection')}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover Reflexão Final"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">
                    Texto opcional exibido ao final do resultado do assessment.
                  </p>
                  <RichTextEditor
                    value={finalReflection}
                    onChange={setFinalReflection}
                    placeholder="Escreva uma reflexão final para o usuário..."
                  />
                </div>
              )}

              {assessmentElements.deepeningCard && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-2xl font-bold bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                      Card de Aprofundamento
                    </h2>
                    <button
                      onClick={() => handleRequestRemoveElement('deepeningCard')}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover Card de Aprofundamento"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Este card é exibido na página de resultados. Defina a URL para onde o usuário será direcionado ao clicar em “Acessar materiais”.
                  </p>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    URL do card de aprofundamento
                  </label>
                  <input
                    type="url"
                    value={deepeningCardUrl}
                    onChange={(e) => setDeepeningCardUrl(e.target.value)}
                    placeholder="https://seu-dominio.com/materiais"
                    className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* 3. OVERALL RANGES (Faixas de Interpretação Global) */}
              <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                <OverallRangesEditor 
                  ranges={overallRanges}
                  onChange={setOverallRanges}
                />
              </div>

              {/* 3.5. GAMIFICAÇÃO - RECOMPENSA EM XP */}
              <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                <XPGameificationEditor
                  gamifyXp={gamifyXp}
                  xpCompletion={xpCompletion}
                  xpScore80={xpScore80}
                  xpScore90={xpScore90}
                  xpScore100={xpScore100}
                  onGamifyChange={setGamifyXp}
                  onXpCompletionChange={setXpCompletion}
                  onXpScore80Change={setXpScore80}
                  onXpScore90Change={setXpScore90}
                  onXpScore100Change={setXpScore100}
                />
              </div>

              {/* 3.6. EXIBIÇÃO DE INTRODUÇÕES DE INDICADORES/NÍVEIS */}
              <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                <h2 className={`text-2xl font-bold mb-4 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                  Exibição de {assessmentSchema === 'niveis' ? 'Níveis' : 'Indicadores'}
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Configure se deseja exibir uma tela de introdução antes das perguntas de cada {assessmentSchema === 'niveis' ? 'nível' : 'indicador'}. 
                  Ao ocultar, o usuário verá apenas o progresso geral do assessment, sem contador individual por {assessmentSchema === 'niveis' ? 'nível' : 'indicador'}.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowIndicatorIntro(!showIndicatorIntro)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      showIndicatorIntro ? 'bg-[#4F46E5]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                        showIndicatorIntro ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {showIndicatorIntro ? 'Exibir' : 'Ocultar'} introduções de {assessmentSchema === 'niveis' ? 'níveis' : 'indicadores'}
                  </span>
                </div>
              </div>

              {/* 3.7. EXIBIÇÃO DE EMBLEMAS DE NÍVEIS (apenas para schema='niveis' e levelMode='multi') */}
              {assessmentSchema === 'niveis' && levelMode === 'multi' && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <h2 className={`text-2xl font-bold mb-4 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                    Emblemas de Níveis
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure se deseja exibir os emblemas dos níveis conquistados. Ao desativar, apenas os cards detalhados de todos os níveis serão exibidos.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowLevelBadges(!showLevelBadges)}
                      className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                        showLevelBadges ? 'bg-[#4F46E5]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          showLevelBadges ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm font-medium text-gray-700">
                      {showLevelBadges ? 'Exibir' : 'Ocultar'} emblemas de níveis
                    </span>
                  </div>
                </div>
              )}

              {/* 4. INDICADORES / NÍVEIS - Schema Dependent */}
              {assessmentSchema === 'indicadores' ? (
                <>
                  {/* ADICIONAR INDICADOR */}
                  <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                    <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                      Adicionar Indicador
                    </h2>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <select
                        value={indicatorToAdd}
                        onChange={(e) => setIndicatorToAdd(e.target.value)}
                        className="flex-1 p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 focus:border-[#4F46E5] focus:outline-none transition-colors"
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
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-5 h-5" /> Adicionar
                      </button>
                    </div>
                  </div>

                  {/* LISTA DE INDICADORES COM RANGES */}
                  {assessmentIndicatorsEdited.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                      <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                        Indicadores do Assessment
                      </h2>
                      
                      <div className="space-y-6">
                        {assessmentIndicatorsEdited.map((indicator, idx) => (
                          <div key={indicator.id} className="border-2 border-blue-200/60 rounded-xl p-6 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
                            <div className="flex items-start justify-between mb-4">
                              <h3 className={`text-lg font-bold text-[#4F46E5] ${TOKENS.fonts.serif}`}>
                                Indicador #{indicator.display_order}
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleRemoveIndicatorFromAssessment(indicator.indicator_master_id, indicator.indicators_master?.name)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Remover
                              </button>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Indicador</label>
                                <input
                                  type="text"
                                  value={indicator.indicators_master?.name || ''}
                                  readOnly
                                  className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-[#4F46E5] font-semibold"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Peso</label>
                                <input
                                  type="number"
                                  value={assessmentIndicatorsEdited[idx]?.weight || '0'}
                                  onChange={(e) => {
                                    const updated = [...assessmentIndicatorsEdited];
                                    updated[idx].weight = parseFloat(e.target.value) || 0;
                                    setAssessmentIndicatorsEdited(updated);
                                  }}
                                  className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Ordem</label>
                                <input
                                  type="number"
                                  value={assessmentIndicatorsEdited[idx]?.display_order || ''}
                                  onChange={(e) => {
                                    const updated = [...assessmentIndicatorsEdited];
                                    const newOrder = parseInt(e.target.value, 10) || 0;
                                    updated[idx].display_order = newOrder;
                                    setAssessmentIndicatorsEdited(updated);
                                  }}
                                  className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                />
                              </div>
                            </div>

                            {indicator.indicators_master?.description && (
                              <div className="mb-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg border-l-4 border-blue-400">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Descrição Conceitual</label>
                                <textarea
                                  value={indicator.indicators_master.description}
                                  readOnly
                                  rows={2}
                                  className="w-full p-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm"
                                />
                              </div>
                            )}

                            {/* Ranges do Indicador */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h4 className={`font-bold text-gray-900 ${TOKENS.fonts.serif}`}>
                                    Faixas de Classificação por Percentual
                                  </h4>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Define faixas baseadas na porcentagem de acerto (0-100%)
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleAddRangeToIndicator(idx)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm rounded-lg font-semibold hover:shadow-lg transition-all"
                                >
                                  <Plus className="w-4 h-4" /> Adicionar Faixa
                                </button>
                              </div>
                              {indicator.assessment_indicator_ranges && indicator.assessment_indicator_ranges.length > 0 ? (
                                <div className="space-y-3">
                                  {indicator.assessment_indicator_ranges.map((range, rIdx) => (
                                    <div key={range.id || rIdx} className="p-4 bg-white/90 backdrop-blur-sm rounded-lg border-2 border-gray-200">
                                      <div className="flex items-start justify-between mb-3">
                                        <div className="grid md:grid-cols-4 gap-3 flex-1">
                                          <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                              Min % <span className="text-gray-400">(0-100)</span>
                                            </label>
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
                                              className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                              Max % <span className="text-gray-400">(0-100)</span>
                                            </label>
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
                                              className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                                            />
                                          </div>
                                          <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                              Classificação
                                            </label>
                                            <input
                                              type="text"
                                              placeholder="Ex: Baixo, Médio, Alto"
                                              value={assessmentIndicatorsEdited[idx]?.assessment_indicator_ranges[rIdx]?.label || ''}
                                              onChange={(e) => {
                                                const updated = [...assessmentIndicatorsEdited];
                                                updated[idx].assessment_indicator_ranges[rIdx].label = e.target.value;
                                                setAssessmentIndicatorsEdited(updated);
                                              }}
                                              className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white text-[#4F46E5] font-semibold text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                                            />
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRangeFromIndicator(idx, rIdx)}
                                          className="ml-3 p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                          title="Remover faixa"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                      <div className="mt-3">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                          Interpretação
                                        </label>
                                        <RichTextEditor
                                          value={assessmentIndicatorsEdited[idx]?.assessment_indicator_ranges[rIdx]?.interpretation || ''}
                                          onChange={(value) => {
                                            const updated = [...assessmentIndicatorsEdited];
                                            updated[idx].assessment_indicator_ranges[rIdx].interpretation = value;
                                            setAssessmentIndicatorsEdited(updated);
                                          }}
                                          placeholder="Descreva a interpretação para scores nesta faixa..."
                                          maxHeight={300}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="p-6 bg-gray-50/80 rounded-xl border-2 border-dashed border-gray-300 text-center">
                                  <p className="text-sm text-gray-600 font-semibold mb-2">
                                    Nenhuma faixa de classificação definida.
                                  </p>
                                  <p className="text-xs text-gray-500 mb-1">
                                    As faixas classificam o resultado baseado na porcentagem de acerto (0-100%).
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Exemplo: 0-40% = Baixo, 41-70% = Médio, 71-100% = Alto
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* SCHEMA: NÍVEIS (Bronze, Prata, Ouro, Platina) */
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                    Níveis do Assessment
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Configure níveis personalizados e defina como a conquista será avaliada.
                  </p>

                  <div className="mb-6">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">Modo de Conquista</label>
                    <div className="grid md:grid-cols-2 gap-3">
                      <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        levelMode === 'single' ? 'border-[#4F46E5] bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="levelMode"
                            value="single"
                            checked={levelMode === 'single'}
                            onChange={(e) => setLevelMode(e.target.value)}
                            className="w-4 h-4 text-[#4F46E5]"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">Nível Único</p>
                            <p className="text-xs text-gray-600">Usuário obtém apenas um nível final</p>
                          </div>
                        </div>
                      </label>
                      <label className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        levelMode === 'multi' ? 'border-[#4F46E5] bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="levelMode"
                            value="multi"
                            checked={levelMode === 'multi'}
                            onChange={(e) => setLevelMode(e.target.value)}
                            className="w-4 h-4 text-[#4F46E5]"
                          />
                          <div>
                            <p className="font-semibold text-gray-900">Múltiplos Níveis</p>
                            <p className="text-xs text-gray-600">Usuário pode conquistar vários níveis</p>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Campo global: Mensagem quando não conquista nenhum nível (somente se mode='single') */}
                  {levelMode === 'single' && (
                    <div className="mb-6 p-5 bg-gradient-to-br from-rose-50/80 to-orange-50/60 rounded-xl border-2 border-rose-200/60">
                      <h3 className="text-sm font-bold text-rose-800 uppercase tracking-wide mb-4">
                        Quando Não Conquistar Nenhum Nível
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2">Título</label>
                          <input
                            type="text"
                            value={noLevelAchievedTitle}
                            onChange={(e) => setNoLevelAchievedTitle(e.target.value)}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-rose-500 focus:outline-none transition-colors"
                            placeholder="Ex: Continue praticando!"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-700 block mb-2">Descrição</label>
                          <textarea
                            value={noLevelAchievedDescription}
                            onChange={(e) => setNoLevelAchievedDescription(e.target.value)}
                            rows={3}
                            className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:border-rose-500 focus:outline-none transition-colors"
                            placeholder="Explique o que significa não ter atingido nenhum nível e como o usuário pode melhorar..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-bold text-[#1E1B4B] ${TOKENS.fonts.serif}`}>
                      Níveis Personalizados
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddLevel}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Nível
                    </button>
                  </div>

                  {levels.length === 0 ? (
                    <div className="p-6 bg-gray-50/80 rounded-xl border-2 border-dashed border-gray-300 text-center">
                      <p className="text-sm text-gray-600 font-semibold">Nenhum nível cadastrado.</p>
                      <p className="text-xs text-gray-500 mt-1">Clique em "Adicionar Nível" para criar níveis personalizados.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {levels.map((level, levelIdx) => (
                        <div key={level.id || levelIdx} className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-xl border border-blue-200/60">
                          <div className="grid md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Nome do Nível</label>
                              <input
                                type="text"
                                value={levels[levelIdx]?.name || ''}
                                onChange={(e) => {
                                  const updated = [...levels];
                                  updated[levelIdx].name = e.target.value;
                                  setLevels(updated);
                                }}
                                className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Ordem</label>
                              <input
                                type="number"
                                value={levels[levelIdx]?.display_order || levelIdx + 1}
                                onChange={(e) => {
                                  const updated = [...levels];
                                  updated[levelIdx].display_order = parseInt(e.target.value, 10) || (levelIdx + 1);
                                  setLevels(updated);
                                }}
                                className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                Pontos para Obter ⭐
                              </label>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={levels[levelIdx]?.acquire_threshold || 0}
                                onChange={(e) => {
                                  const updated = [...levels];
                                  updated[levelIdx].acquire_threshold = parseFloat(e.target.value) || 0;
                                  setLevels(updated);
                                }}
                                className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                placeholder="Ex: 60"
                              />
                            </div>
                            <div className="flex items-end justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveLevel(levelIdx)}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Remover
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Descrição</label>
                            <textarea
                              value={levels[levelIdx]?.description || ''}
                              onChange={(e) => {
                                const updated = [...levels];
                                updated[levelIdx].description = e.target.value;
                                setLevels(updated);
                              }}
                              rows={2}
                              className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                            />
                          </div>

                          {/* Campos: Mensagem quando não conquista (somente se mode='multi') */}
                          {levelMode === 'multi' && (
                            <div className="mt-4 p-4 bg-amber-50/60 rounded-lg border border-amber-200">
                              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">
                                Quando Não Conquistar Este Nível
                              </h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">Título</label>
                                  <input
                                    type="text"
                                    value={levels[levelIdx]?.not_acquired_title || ''}
                                    onChange={(e) => {
                                      const updated = [...levels];
                                      updated[levelIdx].not_acquired_title = e.target.value;
                                      setLevels(updated);
                                    }}
                                    className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="Ex: Nível não conquistado"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-semibold text-gray-600 block mb-1">Descrição</label>
                                  <textarea
                                    value={levels[levelIdx]?.not_acquired_description || ''}
                                    onChange={(e) => {
                                      const updated = [...levels];
                                      updated[levelIdx].not_acquired_description = e.target.value;
                                      setLevels(updated);
                                    }}
                                    rows={2}
                                    className="w-full p-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:border-amber-500 focus:outline-none transition-colors"
                                    placeholder="Explique o que significa não ter conquistado este nível..."
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 5. QUESTIONS E ALTERNATIVES AGRUPADAS POR INDICADORES */}
              {assessmentSchema === 'indicadores' && questionsEdited.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                    Estrutura de Questões por Indicador
                  </h2>
                  
                  <div className="space-y-8">
                    {questionsEdited.map((indicator, indIdx) => (
                      <div key={indicator.id} className="border-2 border-[#4F46E5]/40 rounded-2xl p-6 bg-gradient-to-br from-blue-50/80 to-indigo-50/60 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className={`text-xl font-bold text-[#4F46E5] ${TOKENS.fonts.serif}`}>
                            Indicador #{indicator.display_order}: {indicator.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleRemoveIndicatorFromAssessment(indicator.indicator_master_id, indicator.name)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" /> Remover
                          </button>
                        </div>

                        {indicator.description && (
                          <div className="mb-6 p-4 bg-white/80 backdrop-blur-sm rounded-xl border-l-4 border-blue-400">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Descrição</label>
                            <textarea
                              value={questionsEdited[indIdx]?.description || ''}
                              onChange={(e) => {
                                const updated = [...questionsEdited];
                                updated[indIdx].description = e.target.value;
                                setQuestionsEdited(updated);
                              }}
                              rows={2}
                              className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-700 text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                            />
                          </div>
                        )}

                        {/* Questões do Indicador */}
                        <div className="flex items-center justify-between mb-4">
                          <h4 className={`text-sm font-bold text-gray-700 uppercase tracking-wide ${TOKENS.fonts.serif}`}>
                            Questões
                          </h4>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion(indIdx)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                          >
                            <Plus className="w-4 h-4" /> Adicionar questão
                          </button>
                        </div>

                        {indicator.questions && indicator.questions.length > 0 ? (
                          <div className="space-y-6">
                            {indicator.questions.map((question, qIdx) => (
                              <div key={question.id} className="border-2 border-white/80 rounded-xl p-5 bg-white/90 backdrop-blur-sm shadow-sm">
                                <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-5 rounded-lg mb-4 border border-gray-200">
                                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                                    <div className="md:col-span-2">
                                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                        Questão #{question.display_order}
                                      </label>
                                      <textarea
                                        value={questionsEdited[indIdx]?.questions[qIdx]?.text || ''}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].text = e.target.value;
                                          setQuestionsEdited(updated);
                                        }}
                                        rows={2}
                                        className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                        Tipo de Resposta
                                      </label>
                                      <input
                                        type="text"
                                        value={questionsEdited[indIdx]?.questions[qIdx]?.response_type || ''}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].response_type = e.target.value;
                                          setQuestionsEdited(updated);
                                        }}
                                        className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-[#4F46E5] font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                        Ordem
                                      </label>
                                      <input
                                        type="number"
                                        value={questionsEdited[indIdx]?.questions[qIdx]?.display_order || ''}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].display_order = parseInt(e.target.value, 10) || 0;
                                          setQuestionsEdited(updated);
                                        }}
                                        className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                        Obrigatória?
                                      </label>
                                      <input
                                        type="checkbox"
                                        checked={questionsEdited[indIdx]?.questions[qIdx]?.is_required || false}
                                        onChange={(e) => {
                                          const updated = [...questionsEdited];
                                          updated[indIdx].questions[qIdx].is_required = e.target.checked;
                                          setQuestionsEdited(updated);
                                        }}
                                        className="mt-2 w-5 h-5 text-[#4F46E5] rounded cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex items-end justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveQuestion(indIdx, qIdx)}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" /> Remover questão
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Alternativas */}
                                {question.alternatives && question.alternatives.length > 0 && (
                                  <div className="mt-4">
                                    <h5 className={`font-bold text-gray-900 mb-3 ${TOKENS.fonts.serif}`}>
                                      Alternativas:
                                    </h5>
                                    <div className="space-y-3 bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 rounded-lg">
                                      {question.alternatives.map((alt, aIdx) => (
                                        <div key={alt.id} className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm space-y-3">
                                          <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                              Alternativa #{alt.display_order}
                                            </label>
                                            <input
                                              type="text"
                                              value={questionsEdited[indIdx]?.questions[qIdx]?.alternatives[aIdx]?.text || ''}
                                              onChange={(e) => {
                                                const updated = [...questionsEdited];
                                                updated[indIdx].questions[qIdx].alternatives[aIdx].text = e.target.value;
                                                setQuestionsEdited(updated);
                                              }}
                                              className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                                            />
                                          </div>
                                          <div className="flex flex-wrap gap-4 items-end">
                                            <div className="w-28">
                                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                                Score
                                              </label>
                                              <input
                                                type="number"
                                                value={questionsEdited[indIdx]?.questions[qIdx]?.alternatives[aIdx]?.score_value ?? ''}
                                                onChange={(e) => {
                                                  const updated = [...questionsEdited];
                                                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                                  updated[indIdx].questions[qIdx].alternatives[aIdx].score_value = isNaN(value) ? 0 : value;
                                                  setQuestionsEdited(updated);
                                                }}
                                                className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-[#4F46E5] font-bold text-center focus:border-[#4F46E5] focus:outline-none transition-colors"
                                              />
                                            </div>
                                            <div className="w-24">
                                              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                                Ordem
                                              </label>
                                              <input
                                                type="number"
                                                value={questionsEdited[indIdx]?.questions[qIdx]?.alternatives[aIdx]?.display_order || ''}
                                                onChange={(e) => {
                                                  const updated = [...questionsEdited];
                                                  updated[indIdx].questions[qIdx].alternatives[aIdx].display_order = parseInt(e.target.value, 10) || 0;
                                                  setQuestionsEdited(updated);
                                                }}
                                                className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold text-center focus:border-[#4F46E5] focus:outline-none transition-colors"
                                              />
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveAlternative(indIdx, qIdx, aIdx)}
                                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => handleAddAlternative(indIdx, qIdx)}
                                        className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#4F46E5] hover:text-[#312E81] font-semibold"
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
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#4F46E5] hover:text-[#312E81] font-semibold"
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

              {/* 6. QUESTÕES POR NÍVEL */}
              {assessmentSchema === 'niveis' && levels.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-6 sm:p-8 shadow-lg">
                  <h2 className={`text-2xl font-bold mb-6 bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#818CF8] bg-clip-text text-transparent ${TOKENS.fonts.serif}`}>
                    Estrutura de Questões por Nível
                  </h2>

                  <div className="space-y-8">
                    {levels.map((level, levelIdx) => (
                      <div key={level.id || levelIdx} className="border-2 border-[#4F46E5]/30 rounded-2xl p-6 bg-gradient-to-br from-blue-50/70 to-indigo-50/50">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className={`text-xl font-bold text-[#4F46E5] ${TOKENS.fonts.serif}`}>
                            Nível #{level.display_order}: {level.name || `Nível ${levelIdx + 1}`}
                          </h3>
                          <button
                            type="button"
                            onClick={() => handleAddQuestionToLevel(levelIdx)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                          >
                            <Plus className="w-4 h-4" /> Adicionar questão
                          </button>
                        </div>

                        {(level.questions || []).length > 0 ? (
                          <div className="space-y-6">
                            {(level.questions || []).map((question, qIdx) => (
                              <div key={question.id || qIdx} className="border-2 border-white/80 rounded-xl p-5 bg-white/90 backdrop-blur-sm shadow-sm">
                                <div className="grid md:grid-cols-4 gap-4 mb-4">
                                  <div className="md:col-span-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                      Questão #{question.display_order}
                                    </label>
                                    <textarea
                                      value={levels[levelIdx]?.questions?.[qIdx]?.text || ''}
                                      onChange={(e) => {
                                        const updated = [...levels];
                                        updated[levelIdx].questions[qIdx].text = e.target.value;
                                        setLevels(updated);
                                      }}
                                      rows={2}
                                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Tipo</label>
                                    <input
                                      type="text"
                                      value={levels[levelIdx]?.questions?.[qIdx]?.response_type || ''}
                                      onChange={(e) => {
                                        const updated = [...levels];
                                        updated[levelIdx].questions[qIdx].response_type = e.target.value;
                                        setLevels(updated);
                                      }}
                                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-[#4F46E5] font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Ordem</label>
                                    <input
                                      type="number"
                                      value={levels[levelIdx]?.questions?.[qIdx]?.display_order || qIdx + 1}
                                      onChange={(e) => {
                                        const updated = [...levels];
                                        updated[levelIdx].questions[qIdx].display_order = parseInt(e.target.value, 10) || (qIdx + 1);
                                        setLevels(updated);
                                      }}
                                      className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold focus:border-[#4F46E5] focus:outline-none transition-colors"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 font-medium">
                                    <input
                                      type="checkbox"
                                      checked={levels[levelIdx]?.questions?.[qIdx]?.is_required || false}
                                      onChange={(e) => {
                                        const updated = [...levels];
                                        updated[levelIdx].questions[qIdx].is_required = e.target.checked;
                                        setLevels(updated);
                                      }}
                                      className="w-4 h-4 text-[#4F46E5]"
                                    />
                                    Questão obrigatória
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveQuestionFromLevel(levelIdx, qIdx)}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" /> Remover questão
                                  </button>
                                </div>

                                <div className="space-y-3 bg-gradient-to-br from-gray-50 to-blue-50/20 p-4 rounded-lg">
                                  {(question.alternatives || []).map((alt, aIdx) => (
                                    <div key={alt.id || aIdx} className="p-4 bg-white rounded-lg border-2 border-gray-200 space-y-3">
                                      <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                                          Alternativa #{alt.display_order}
                                        </label>
                                        <input
                                          type="text"
                                          value={levels[levelIdx]?.questions?.[qIdx]?.alternatives?.[aIdx]?.text || ''}
                                          onChange={(e) => {
                                            const updated = [...levels];
                                            updated[levelIdx].questions[qIdx].alternatives[aIdx].text = e.target.value;
                                            setLevels(updated);
                                          }}
                                          className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                                        />
                                      </div>
                                      <div className="flex flex-wrap gap-4 items-end">
                                        <div className="w-40">
                                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Pontua para</label>
                                          <select
                                            value={levels[levelIdx]?.questions?.[qIdx]?.alternatives?.[aIdx]?.score_target || 'level'}
                                            onChange={(e) => {
                                              const updated = [...levels];
                                              updated[levelIdx].questions[qIdx].alternatives[aIdx].score_target = e.target.value;
                                              setLevels(updated);
                                            }}
                                            className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 text-sm focus:border-[#4F46E5] focus:outline-none transition-colors"
                                          >
                                            <option value="level">Conquista do nível</option>
                                            <option value="potential">Potencial do nível</option>
                                          </select>
                                        </div>
                                        <div className="w-28">
                                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Pontos</label>
                                          <input
                                            type="number"
                                            value={levels[levelIdx]?.questions?.[qIdx]?.alternatives?.[aIdx]?.score_value ?? ''}
                                            onChange={(e) => {
                                              const updated = [...levels];
                                              const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                              updated[levelIdx].questions[qIdx].alternatives[aIdx].score_value = isNaN(value) ? 0 : value;
                                              setLevels(updated);
                                            }}
                                            className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-[#4F46E5] font-bold text-center focus:border-[#4F46E5] focus:outline-none transition-colors"
                                          />
                                        </div>
                                        <div className="w-24">
                                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Ordem</label>
                                          <input
                                            type="number"
                                            value={levels[levelIdx]?.questions?.[qIdx]?.alternatives?.[aIdx]?.display_order || aIdx + 1}
                                            onChange={(e) => {
                                              const updated = [...levels];
                                              updated[levelIdx].questions[qIdx].alternatives[aIdx].display_order = parseInt(e.target.value, 10) || (aIdx + 1);
                                              setLevels(updated);
                                            }}
                                            className="w-full p-3 border-2 border-gray-200 rounded-lg bg-white text-gray-900 font-semibold text-center focus:border-[#4F46E5] focus:outline-none transition-colors"
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveAlternativeFromLevelQuestion(levelIdx, qIdx, aIdx)}
                                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => handleAddAlternativeToLevelQuestion(levelIdx, qIdx)}
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#4F46E5] hover:text-[#312E81] font-semibold"
                                  >
                                    <Plus className="w-4 h-4" /> Adicionar alternativa
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-white/70 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 text-center">
                            Nenhuma questão adicionada neste nível.
                          </div>
                        )}

                        {/* Editor de Faixas de Interpretação por Nível */}
                        <LevelRangesEditor
                          level={level}
                          levelIndex={levelIdx}
                          onUpdate={handleUpdateLevel}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTÃO SALVAR */}
              {((assessmentSchema === 'indicadores' && (assessmentIndicatorsEdited.length > 0 || questionsEdited.length > 0)) ||
                (assessmentSchema === 'niveis' && hasNiveisContent)) && (
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
      </main>

      {/* Modal de Elementos Opcionais */}
      <AssessmentElementsModal
        isOpen={showElementsModal}
        elements={assessmentElements}
        onToggleElement={handleToggleElement}
        onClose={() => setShowElementsModal(false)}
      />

      {/* Modal de Confirmação de Remoção de Elemento */}
      {showRemoveElementModal && elementToRemove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 px-6 py-5 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <X className="w-6 h-6" />
                </div>
                Remover Elemento
              </h2>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg font-semibold text-gray-900 mb-3">
                  Você está prestes a remover o elemento:
                </p>
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-red-900 font-bold text-lg">
                    {elementNames[elementToRemove]}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
                <div className="flex gap-3">
                  <span className="text-amber-600 text-2xl flex-shrink-0">⚠️</span>
                  <div className="space-y-2 text-sm text-amber-900">
                    <p className="font-bold">ATENÇÃO: Esta ação é crítica!</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Todo o conteúdo configurado será <strong>permanentemente perdido</strong></li>
                      <li>O elemento será removido da estrutura do assessment</li>
                      <li>Esta ação <strong>NÃO PODE ser desfeita</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Confirmação dupla via checkbox */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={removeConfirmed}
                    onChange={(e) => setRemoveConfirmed(e.target.checked)}
                    className="mt-1 w-5 h-5 text-red-600 rounded cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                    Confirmo que entendo que esta ação é irreversível e que todo o conteúdo do elemento{' '}
                    <strong className="text-red-700">{elementNames[elementToRemove]}</strong> será permanentemente removido
                  </span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowRemoveElementModal(false);
                  setElementToRemove(null);
                  setRemoveConfirmed(false);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRemoveElement}
                disabled={!removeConfirmed}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  removeConfirmed
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:from-red-700 hover:to-red-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {removeConfirmed ? 'Remover Elemento' : 'Confirme acima para remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção de Publicação */}
      {showUnpublishModal && assessmentToUnpublish && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 px-6 py-5 rounded-t-2xl">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <Power className="w-6 h-6" />
                </div>
                Remover Publicação
              </h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-lg font-semibold text-gray-900 mb-3">
                  Você está prestes a remover a publicação do assessment:
                </p>
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <p className="text-red-900 font-bold text-lg">
                    {assessmentToUnpublish.name}
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6 rounded-r-lg">
                <div className="flex gap-3">
                  <span className="text-amber-600 text-2xl flex-shrink-0">⚠️</span>
                  <div className="space-y-2 text-sm text-amber-900">
                    <p className="font-bold">ATENÇÃO: esta ação deixará o assessment indisponível.</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>O assessment deixará de aparecer como publicado para os usuários</li>
                      <li>O valor de <strong>is_active</strong> será alterado para <strong>false</strong></li>
                      <li>Você poderá revisar o assessment no builder, mas ele não ficará mais publicado</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 mb-6">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={unpublishConfirmed}
                    onChange={(e) => setUnpublishConfirmed(e.target.checked)}
                    className="mt-1 w-5 h-5 text-red-600 rounded cursor-pointer flex-shrink-0"
                  />
                  <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                    Confirmo que desejo remover a publicação do assessment{' '}
                    <strong className="text-red-700">{assessmentToUnpublish.name}</strong>
                  </span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setShowUnpublishModal(false);
                  setAssessmentToUnpublish(null);
                  setUnpublishConfirmed(false);
                }}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmUnpublishAssessment}
                disabled={!unpublishConfirmed || isUnpublishing}
                className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                  unpublishConfirmed && !isUnpublishing
                    ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-lg hover:from-red-700 hover:to-red-800'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isUnpublishing ? '⏳ Removendo...' : unpublishConfirmed ? 'Remover Publicação' : 'Confirme acima para remover'}
              </button>
            </div>
          </div>
        </div>
      )}

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
