import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook para gerenciar sessões de cenários adaptativos
 * Controla navegação entre nós, registro de decisões e análise cognitiva
 */
export const useScenarioSession = ({ scenarioId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Scenario data
  const [scenario, setScenario] = useState(null);
  const [allNodes, setAllNodes] = useState([]);
  
  // Session state
  const [sessionId, setSessionId] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [decisionPath, setDecisionPath] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Decision tracking
  const [decisions, setDecisions] = useState([]);
  const [currentDecisionStartTime, setCurrentDecisionStartTime] = useState(null);

  /**
   * Initialize scenario and session
   */
  useEffect(() => {
    if (!scenarioId) return;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Load scenario
        const { data: scenarioData, error: scenarioError } = await supabase
          .from('scenario_simulations')
          .select('*')
          .eq('id', scenarioId)
          .eq('is_active', true)
          .single();

        if (scenarioError) throw scenarioError;
        if (!scenarioData) throw new Error('Cenário não encontrado ou inativo');

        setScenario(scenarioData);

        // 2. Load all nodes for this scenario
        const { data: nodesData, error: nodesError } = await supabase
          .from('scenario_nodes')
          .select('*')
          .eq('scenario_id', scenarioId)
          .order('display_order', { ascending: true });

        if (nodesError) throw nodesError;
        setAllNodes(nodesData || []);

        // 3. Find entry node
        const entryNode = nodesData?.find(node => node.is_entry_node);
        if (!entryNode) {
          throw new Error('Nó inicial não encontrado para este cenário');
        }

        // 4. Create session
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error('Usuário não autenticado');

        const { data: sessionData, error: sessionError } = await supabase
          .from('scenario_sessions')
          .insert({
            user_id: userData.user.id,
            scenario_id: scenarioId,
            decision_path: [entryNode.id],
            status: 'in_progress'
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        setSessionId(sessionData.id);
        setCurrentNode(entryNode);
        setDecisionPath([entryNode.id]);
        setSessionStartTime(new Date());
        setCurrentDecisionStartTime(new Date());

      } catch (err) {
        console.error('Error initializing scenario session:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [scenarioId]);

  /**
   * Record a decision and navigate to next node
   */
  const makeDecision = useCallback(async (optionIndex, metadata = {}) => {
    if (!currentNode || !sessionId) {
      console.error('Cannot make decision: no current node or session');
      return false;
    }

    try {
      const option = currentNode.decision_options?.[optionIndex];
      if (!option) {
        throw new Error('Opção de decisão inválida');
      }

      // Calculate decision time
      const decisionTime = currentDecisionStartTime
        ? Math.round((new Date() - currentDecisionStartTime) / 1000)
        : null;

      // Record decision
      const { data: decisionData, error: decisionError } = await supabase
        .from('scenario_decisions')
        .insert({
          session_id: sessionId,
          node_id: currentNode.id,
          option_index: optionIndex,
          option_text: option.text,
          time_to_decide_seconds: decisionTime,
          decision_confidence: metadata.confidence || null,
          cognitive_load_perceived: metadata.cognitiveLoad || null,
          metadata: metadata
        })
        .select()
        .single();

      if (decisionError) throw decisionError;

      // Store decision locally
      setDecisions(prev => [...prev, {
        ...decisionData,
        node: currentNode,
        option: option
      }]);

      // Navigate to next node
      const nextNodeId = option.next_node_id;
      if (!nextNodeId) {
        // No next node specified - this shouldn't happen in our scenario design
        // The final node detection is handled in the component via useEffect
        console.warn('Decision has no next_node_id - session may need manual completion');
        return true;
      }

      const nextNode = allNodes.find(node => node.id === nextNodeId);
      if (!nextNode) {
        throw new Error('Próximo nó não encontrado');
      }

      // Update session with new path
      const newPath = [...decisionPath, nextNodeId];
      const { error: updateError } = await supabase
        .from('scenario_sessions')
        .update({
          decision_path: newPath
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Update state
      setCurrentNode(nextNode);
      setDecisionPath(newPath);
      setCurrentDecisionStartTime(new Date());

      return true;
    } catch (err) {
      console.error('Error making decision:', err);
      setError(err.message);
      return false;
    }
  }, [currentNode, sessionId, allNodes, decisionPath, currentDecisionStartTime]);

  /**
   * Complete the session and perform cognitive analysis
   */
  const completeSession = useCallback(async () => {
    if (!sessionId) return null;

    try {
      // Import analysis functions
      const { analyzeCognitivePatterns } = await import('../utils/scenarioAnalysis');
      const { analyzeKahnemanSystems, getKahnemanInsight } = await import('../utils/kahnemanAnalysis');
      const { calculateScenarioXP } = await import('../utils/gamificationUtils');
      
      // Perform traditional analysis
      const analysis = analyzeCognitivePatterns(decisions, scenario);

      // Perform Kahneman-specific analysis
      const kahnemanAnalysis = analyzeKahnemanSystems(decisions);
      const kahnemanInsight = getKahnemanInsight(kahnemanAnalysis);

      // Combine analyses
      const fullAnalysis = {
        ...analysis,
        kahneman: kahnemanAnalysis,
        kahnemanInsight: kahnemanInsight
      };

      // Calculate XP reward
      const totalTime = Math.round((new Date() - sessionStartTime) / 1000);
      const avgDecisionTime = decisions.length > 0 ? totalTime / decisions.length : 0;
      const xpCalculation = calculateScenarioXP(kahnemanAnalysis, avgDecisionTime, decisions.length);
      
      // Format XP reward for overlay
      const xpReward = {
        baseXP: xpCalculation.baseXP,
        bonuses: xpCalculation.bonuses,
        totalEarned: xpCalculation.totalXP
      };

      // Update session as completed
      const { error: updateError } = await supabase.rpc(
        'complete_scenario_session',
        {
          p_session_id: sessionId,
          p_cognitive_patterns: {
            ...analysis.patterns,
            kahneman_system1: kahnemanAnalysis.system1_score,
            kahneman_system2: kahnemanAnalysis.system2_score,
            kahneman_biases: kahnemanAnalysis.biases
          },
          p_indicator_mapping: analysis.indicators
        }
      );

      if (updateError) throw updateError;

      // Update user indicator scores
      await updateUserIndicatorScores(analysis.indicators);

      return {
        sessionId,
        analysis: fullAnalysis,
        totalTime,
        decisionsCount: decisions.length,
        xpReward
      };

    } catch (err) {
      console.error('Error completing session:', err);
      setError(err.message);
      return null;
    }
  }, [sessionId, decisions, scenario, sessionStartTime]);

  /**
   * Update user_indicator_scores based on scenario results
   * NOTA: Cenários não atualizam indicadores automaticamente.
   * Apenas registram a análise. Indicadores são atualizados via assessments.
   */
  const updateUserIndicatorScores = async (indicatorMapping) => {
    // Cenários registram dados de análise mas não modificam scores de indicadores
    // Isso é feito apenas através de assessments completos
    console.log('📊 Scenario analysis recorded (non-destructive):', indicatorMapping);
  };

  /**
   * Abandon current session
   */
  const abandonSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from('scenario_sessions')
        .update({ status: 'abandoned' })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Error abandoning session:', err);
    }
  }, [sessionId]);

  return {
    // State
    loading,
    error,
    scenario,
    currentNode,
    decisions,
    decisionPath,
    
    // Actions
    makeDecision,
    completeSession,
    abandonSession,
    
    // Metadata
    sessionId,
    isComplete: currentNode?.node_type === 'final',
    progressPercentage: scenario 
      ? Math.round((decisionPath.length / allNodes.length) * 100)
      : 0
  };
};

export default useScenarioSession;
