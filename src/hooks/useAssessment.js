import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export const useAssessment = () => {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({}); // { [questionId]: score_value }
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssessment();
  }, []);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      console.log('useAssessment: Iniciando busca...');
      
      // 1. Buscar assessment ativo
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single();

      console.log('useAssessment: Assessment Data:', assessmentData, 'Error:', assessmentError);
      if (assessmentError) throw assessmentError;
      if (!assessmentData) throw new Error('Nenhum assessment ativo encontrado.');

      // 2. Buscar assessment_indicators com indicadores relacionados
      const { data: assessmentIndicators, error: aiError } = await supabase
        .from('assessment_indicators')
        .select(`
          id,
          indicator_master_id,
          display_order,
          indicators_master:indicator_master_id (id, name, description)
        `)
        .eq('assessment_id', assessmentData.id)
        .order('display_order', { ascending: true });

      console.log('useAssessment: Assessment Indicators:', assessmentIndicators, 'Error:', aiError);
      if (aiError) throw aiError;

      // 3. Buscar indicadores (antiga estrutura ainda usada para questions)
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('*')
        .eq('assessment_id', assessmentData.id)
        .order('display_order', { ascending: true });

      console.log('useAssessment: Indicators:', indicatorsData, 'Error:', indicatorsError);
      if (indicatorsError) throw indicatorsError;
      const indicators = indicatorsData || [];

      // 4. Buscar questions
      const indicatorIds = indicators.map(i => i.id);
      let questions = [];

      if (indicatorIds.length > 0) {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select('*')
          .in('indicator_id', indicatorIds)
          .order('display_order', { ascending: true });

        if (questionsError) throw questionsError;
        questions = questionsData || [];
      }

      // 5. Buscar alternatives
      const questionIds = questions.map(q => q.id);
      let alternatives = [];

      if (questionIds.length > 0) {
        const { data: alternativesData, error: alternativesError } = await supabase
          .from('alternatives')
          .select('*')
          .in('question_id', questionIds)
          .order('display_order', { ascending: true });

        if (alternativesError) throw alternativesError;
        alternatives = alternativesData || [];
      }

      // 6. Buscar assessment_indicator_ranges para cada assessment_indicator
      const rangesMap = {}; // { assessmentIndicatorId: [...ranges] }
      if (assessmentIndicators && assessmentIndicators.length > 0) {
        const { data: rangesData, error: rangesError } = await supabase
          .from('assessment_indicator_ranges')
          .select('*')
          .in('assessment_indicator_id', assessmentIndicators.map(ai => ai.id));

        if (rangesError) throw rangesError;
        (rangesData || []).forEach(range => {
          if (!rangesMap[range.assessment_indicator_id]) {
            rangesMap[range.assessment_indicator_id] = [];
          }
          rangesMap[range.assessment_indicator_id].push(range);
        });
      }

      // 7. Montar estrutura hierárquica com nova arquitetura
      const fullAssessment = {
        ...assessmentData,
        indicators: (indicators || []).map(indicator => ({
          ...indicator,
          questions: (questions || [])
            .filter(q => q.indicator_id === indicator.id)
            .map(question => ({
              ...question,
              alternatives: (alternatives || []).filter(
                a => a.question_id === question.id
              )
            }))
        })),
        // Nova estrutura: assessment_indicators com ranges
        assessmentIndicators: (assessmentIndicators || []).map(ai => ({
          id: ai.id,
          display_order: ai.display_order,
          indicatorMaster: ai.indicators_master,
          ranges: rangesMap[ai.id] || [] // Faixas de classificação
        }))
      };

      console.log('useAssessment: Full Structure:', fullAssessment);
      setAssessment(fullAssessment);
    } catch (err) {
      console.error('Erro ao carregar assessment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, scoreValue) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: scoreValue
    }));
  };

  const validateAnswers = () => {
    if (!assessment) return false;
    for (const indicator of assessment.indicators) {
      for (const question of indicator.questions) {
        if (question.is_required && answers[question.id] === undefined) {
          return false;
        }
      }
    }
    return true;
  };

  const calculateResults = () => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const indicatorScores = {};
    const indicatorResults = {};

    // Fallback para classificação hardcoded (compatibilidade com dados antigos)
    const classifyFallback = (percentage) => {
      if (percentage <= 40) return 'Crítico';
      if (percentage <= 70) return 'Moderado';
      return 'Saudável';
    };

    const generateInterpretationFallback = (name, percentage) => {
      if (percentage <= 40)
        return `O indicador ${name} apresenta nível crítico e requer atenção imediata.`;
      if (percentage <= 70)
        return `O indicador ${name} apresenta nível moderado, com oportunidades claras de melhoria.`;
      return `O indicador ${name} apresenta nível saudável e consistente.`;
    };

    // Função para encontrar a faixa e classificação
    const getClassificationFromRanges = (score, maxScore, ranges, indicatorName) => {
      if (!ranges || ranges.length === 0) {
        // Fallback se não houver ranges configuradas
        const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        return {
          percentage,
          classification: classifyFallback(percentage),
          interpretation: generateInterpretationFallback(indicatorName, percentage)
        };
      }

      // Ordenar ranges por min_score
      const sortedRanges = [...ranges].sort((a, b) => a.min_score - b.min_score);
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

      // Encontrar a faixa que contém o score
      for (const range of sortedRanges) {
        if (percentage >= range.min_score && percentage <= range.max_score) {
          return {
            percentage,
            classification: range.label,
            interpretation: range.interpretation || ''
          };
        }
      }

      // Se não encontrar faixa, usar a última
      const lastRange = sortedRanges[sortedRanges.length - 1];
      return {
        percentage,
        classification: lastRange.label,
        interpretation: lastRange.interpretation || ''
      };
    };

    // Processar indicadores antigos (compatibilidade)
    assessment.indicators.forEach(indicator => {
      let indicatorScore = 0;
      let indicatorMax = 0;

      indicator.questions.forEach(question => {
        const score = answers[question.id] || 0;
        indicatorScore += score;

        const maxQuestionScore = (question.alternatives || []).reduce((max, alt) =>
          Math.max(max, alt.score_value), 0);
        indicatorMax += maxQuestionScore;
        maxPossibleScore += maxQuestionScore;
      });

      const classificationData = getClassificationFromRanges(indicatorScore, indicatorMax, [], indicator.name);

      indicatorResults[indicator.name] = {
        score: indicatorScore,
        maxScore: indicatorMax,
        percentage: classificationData.percentage,
        classification: classificationData.classification,
        interpretation: classificationData.interpretation
      };

      indicatorScores[indicator.name] = indicatorScore;
      totalScore += indicatorScore;
    });

    // Processar novos indicadores com ranges (se existirem)
    if (assessment.assessmentIndicators && assessment.assessmentIndicators.length > 0) {
      assessment.assessmentIndicators.forEach(ai => {
        const indicator = ai.indicatorMaster;
        if (!indicator) return;

        // Encontrar as questions do indicador (usamos a estrutura antiga para pegar as perguntas)
        const indicatorQuestions = assessment.indicators
          .find(ind => ind.id === assessment.indicators[ai.display_order - 1]?.id)
          ?.questions || [];

        let indicatorScore = 0;
        let indicatorMax = 0;

        indicatorQuestions.forEach(question => {
          const score = answers[question.id] || 0;
          indicatorScore += score;

          const maxQuestionScore = (question.alternatives || []).reduce((max, alt) =>
            Math.max(max, alt.score_value), 0);
          indicatorMax += maxQuestionScore;
        });

        const classificationData = getClassificationFromRanges(indicatorScore, indicatorMax, ai.ranges, indicator.name);

        indicatorResults[indicator.name] = {
          score: indicatorScore,
          maxScore: indicatorMax,
          percentage: classificationData.percentage,
          classification: classificationData.classification,
          interpretation: classificationData.interpretation
        };

        indicatorScores[indicator.name] = indicatorScore;
        totalScore += indicatorScore;
      });
    }

    return { totalScore, maxPossibleScore, indicatorResults };
  };

  const submitAssessment = async () => {
    if (!validateAnswers()) {
      alert('Por favor, responda todas as perguntas obrigatórias.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { totalScore, maxPossibleScore, indicatorResults } = calculateResults();

      // Extract display name from user metadata or use email as fallback
      const displayName = user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário';

      const payload = {
        assessment_id: assessment.id,
        assessment_version: assessment.version,
        user_id: user.id,
        user_display_name: displayName,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        indicator_scores_snapshot: indicatorResults,
        answers_snapshot: answers,
        classification_snapshot: indicatorResults,
      };

      const { error: insertError } = await supabase
        .from('assessment_events')
        .insert([payload]);

      if (insertError) throw insertError;

      navigate('/results');
    } catch (err) {
      console.error('Erro ao salvar assessment:', err);
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    assessment,
    loading,
    error,
    answers,
    handleAnswerChange,
    submitAssessment,
    submitting
  };
};