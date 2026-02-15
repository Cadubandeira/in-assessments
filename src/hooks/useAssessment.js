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

      // 2. Buscar indicators
      const { data: indicatorsData, error: indicatorsError } = await supabase
        .from('indicators')
        .select('*')
        .eq('assessment_id', assessmentData.id)
        .order('display_order', { ascending: true });

      console.log('useAssessment: Indicators:', indicatorsData, 'Error:', indicatorsError);
      if (indicatorsError) throw indicatorsError;
      const indicators = indicatorsData || [];

      // 3. Buscar questions
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

      // 4. Buscar alternatives
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

      // 5. Montar estrutura hierárquica
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

    assessment.indicators.forEach(indicator => {
      let indicatorScore = 0;
      indicator.questions.forEach(question => {
        // Score obtido
        const score = answers[question.id] || 0;
        indicatorScore += score;

        // Max score possível (maior valor entre as alternativas da pergunta)
        const maxQuestionScore = question.alternatives.reduce((max, alt) => 
          Math.max(max, alt.score_value), 0);
        maxPossibleScore += maxQuestionScore;
      });
      indicatorScores[indicator.name] = indicatorScore;
      totalScore += indicatorScore;
    });

    return { totalScore, maxPossibleScore, indicatorScores };
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

      const { totalScore, maxPossibleScore, indicatorScores } = calculateResults();

      const payload = {
        assessment_id: assessment.id,
        assessment_version: assessment.version,
        user_id: user.id,
        total_score: totalScore,
        max_possible_score: maxPossibleScore,
        indicator_scores_snapshot: indicatorScores,
        answers_snapshot: answers,
        classification_snapshot: null,
        created_at: new Date().toISOString()
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