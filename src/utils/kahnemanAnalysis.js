/**
 * Kahneman-Enhanced Scenario Analysis
 * Extensions to scenarioAnalysis.js for System 1/2 framework
 */

/**
 * Extract cognitive tags from decision options
 */
export const extractCognitiveTags = (decisions) => {
  const tags = [];
  decisions.forEach(decision => {
    // Tags come from decision_options in the node
    const option = decision.option;
    if (option?.cognitive_tags) {
      tags.push(...option.cognitive_tags);
    }
  });
  return tags;
};

/**
 * Analyze using K ahneman's Two Systems framework
 * System 1: Fast, automatic, intuitive, emotional
 * System 2: Slow, deliberate, analytical, logical
 */
export const analyzeKahnemanSystems = (decisions) => {
  const system1Indicators = [
    'system1_decisive', 'system1_authoritative', 'system1_assertive',
    'system1_recovery', 'system1_risk_averse', 'system1_confident',
    'high_confidence', 'confrontation', 'intuitive', 'fast'
  ];

  const system2Indicators = [
    'system2_analytical', 'system2_thorough', 'system2_patient',
    'system2_empathy', 'system2_strategic', 'system2_socratic',
    'system2_prepared', 'system2_collaborative', 'system2_self_aware',
    'system2_direct', 'system2_nuanced', 'system2_insight',
    'analytical', 'preparation', 'sequential', 'empathy', 'systematic'
  ];

  let system1Count = 0;
  let system2Count = 0;
  const decisionsWithTags = [];

  decisions.forEach((decision, index) => {
    const option = decision.option;  
    const tags = option?.cognitive_tags || [];
    
    let s1 = 0, s2 = 0;
    tags.forEach(tag => {
      if (system1Indicators.some(ind => tag.toLowerCase().includes(ind))) s1++;
      if (system2Indicators.some(ind => tag.toLowerCase().includes(ind))) s2++;
    });

    system1Count += s1;
    system2Count += s2;
    
    decisionsWithTags.push({
      index,
      system1_tags: s1,
      system2_tags: s2,
      time: decision.time_to_decide_seconds,
      confidence: decision.decision_confidence
    });
  });

  const total = system1Count + system2Count || 1;
  const system1_score = Math.round((system1Count / total) * 100);
  const system2_score = Math.round((system2Count / total) * 100);

  // Detect biases (System 1 vulnerabilities)
  const biases = detectCognitiveBiases(decisionsWithTags, decisions);

  // Calculate decision times for Fast/Slow analysis
  const times = decisions.map(d => d.time_to_decide_seconds).filter(t => t != null);
  const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 30;
  const fastDecisions = times.filter(t => t < 30).length;
  const slowDecisions = times.filter(t => t >= 60).length;

  return {
    system1_score,
    system2_score,
    system1_count: system1Count,
    system2_count: system2Count,
    biases,
    balance: getSystemBalance(system1_score, system2_score),
    avg_decision_time: Math.round(avgTime),
    fast_decisions_count: fastDecisions,
    slow_decisions_count: slowDecisions,
    total_decisions: decisions.length,
    decision_journey: decisionsWithTags
  };
};

/**
 * Detect cognitive biases from decision patterns (Kahneman)
 */
const detectCognitiveBiases = (decisionsTags, decisions) => {
  const biases = [];

  if (decisions.length < 2) return biases;

  // 1. Anchoring Bias: First decision heavily influences later ones
  if (decisions.length >= 3) {
    const firstPattern = decisionsTags[0];
    const laterSimilar = decisionsTags.slice(1).filter(d => 
      d.system1_tags === firstPattern.system1_tags && d.system2_tags === firstPattern.system2_tags
    ).length;
    
    if (laterSimilar / (decisions.length - 1) > 0.5) {
      biases.push({
        name: 'Anchoring Bias',
        description: 'Sua primeira decisão pode estar ancorando escolhas posteriores',
        kahneman_reference: 'Sistema 1 criando padrão repetido',
        confidence: 'medium'
      });
    }
  }

  // 2. Loss Aversion: Overreliance on avoiding risks
  const riskAversionCount = decisions.filter(d => 
    d.option?.indicators_weight?.risk && d.option.indicators_weight.risk < -0.3
  ).length;
  
  if (riskAversionCount > decisions.length * 0.6) {
    biases.push({
      name: 'Loss Aversion (Kahneman)',
      description: 'Evitando perdas além do racional - viés clássico de Kahneman',
      kahneman_reference: 'Perdas pesam 2x mais que ganhos equivalentes',
      confidence: 'high'
    });
  }

  // 3. Availability Heuristic: Recent/salient info dominating  
  const recentDecisionsTimes = decisions.slice(-3).map(d => d.time_to_decide_seconds);
  const avgRecentTime = recentDecisionsTimes.reduce((a,b) => a+b, 0) / recentDecisionsTimes.length;
  
  if (avgRecentTime < 20 && decisionsTags.slice(-3).every(d => d.system1_tags > d.system2_tags)) {
    biases.push({
      name: 'Availability Heuristic',
      description: 'Decisões recentes cada vez mais rápidas - confiando em informação imediata',
      kahneman_reference: 'Sistema 1 usando atalhos mentais sob fadiga',
      confidence: 'medium'
    });
  }

  // 4. Overconfidence Effect: Fast + Confident = potential overestimation
  const overconfidentCount = decisions.filter(d => 
    d.time_to_decide_seconds < 25 && d.decision_confidence === 'confident'
  ).length;
  
  if (overconfidentCount > decisions.length * 0.5) {
    biases.push({
      name: 'Overconfidence Effect',
      description: 'Confiança excessiva em decisões rápidas pode indicar subestimação de complexidade',
      kahneman_reference: 'Sistema 1 gera confiança, não necessariamente acurácia',
      confidence: 'high'
    });
  }

  // 5. Confirmation Bias: Consistent path selection
  const empathyPaths = decisions.filter(d => 
    d.option?.cognitive_tags?.some(tag => tag.includes('empathy'))
  ).length;
  const confrontationPaths = decisions.filter(d => 
    d.option?.cognitive_tags?.some(tag => tag.includes('confrontation'))
  ).length;
  
  if ((empathyPaths > 0 && confrontationPaths === 0) || 
      (confrontationPaths > 0 && empathyPaths === 0)) {
    biases.push({
      name: 'Confirmation Bias',
      description: 'Consistência extrema pode indicar busca por informações que confirmam estilo preferido',
      kahneman_reference: 'Sistema 1 prefere coerência a complexidade',
      confidence: 'low'
    });
  }

  return biases;
};

/**
 * Determine balance description between Systems
 */
const getSystemBalance = (s1, s2) => {
  const diff = Math.abs(s1 - s2);
  
  if (diff < 15) return 'equilibrado';
  if (s1 > s2 + 15) return 'intuitivo_dominante';
  if (s2 > s1 + 15) return 'analitico_dominante';
  return 'moderado';
};

/**
 * Get detailed insight text based on Kahneman analysis
 */
export const getKahnemanInsight = (kahnemanAnalysis) => {
  const { system1_score, system2_score, balance, biases, avg_decision_time } = kahnemanAnalysis;
  const diff = Math.abs(system1_score - system2_score);

  if (diff < 20) {
    return {
      type: 'strength',
      title: 'Equilíbrio Cognitivo Excepcional',
      description: `Você demonstrou habilidade rara de alternar entre Sistema 1 (intuitivo) e Sistema 2 (analítico) conforme demandas situcionais. Em ${kahnemanAnalysis.total_decisions} decisões, você conseguiu ${kahnemanAnalysis.fast_decisions_count} decisões rápidas quando apropriado e ${kahnemanAnalysis.slow_decisions_count} decisões ponderadas quando necessário. Este é o padrão de "especialistas calibrados" descrito por Kahneman.`,
      kahneman_quote: '"Intuição de especialistas vem de prática prolongada com feedback rápido e preciso." - Daniel Kahneman'
    };
  }

  if (system1_score > system2_score + 20) {
    return {
      type: 'watch',
      title: 'Sistema 1 Dominante (Pensamento Rápido)',
      description: `Em ${system1_score}% das decisões você utilizou Sistema 1 - pensamento rápido, intuitivo e automático. Tempo médio: ${avg_decision_time}s. Isto pode ser eficiente, mas Kahneman alerta: sob pressão extrema, Sistema 1 é vulnerável a vieses cognitivos. ${biases.length > 0 ? `Identificamos ${biases.length} potenciais vieses: ${biases.map(b => b.name).join(', ')}.` : ''}`,
      kahneman_quote: '"Sistema 1 opera automaticamente e rapidamente, com pouco ou nenhum esforço e nenhum senso de controle voluntário."'
    };
  }

  if (system2_score > system1_score + 20) {
    return {
      type: 'development',
      title: 'Sistema 2 Dominante (Pensamento Lento)',
      description: `Em ${system2_score}% das decisões você ativou Sistema 2 - pensamento analítico e deliberado. Tempo médio: ${avg_decision_time}s. Isto indica rigor, mas tem trade-offs: em crises reais, decisões perfeitas que chegam tarde podem ter menos valor que decisões boas entregues no timing certo. Kahneman sugere que líderes eficazes sabem quando é "suficientemente bom" para agir.`,
      kahneman_quote: '"Sistema 2 aloca atenção às atividades mentais que demandam esforço, incluindo cálculos complexos."'
    };
  }

  return {
    type: 'balanced',
    title: 'Moderadamente Balanceado',
    description: `Seu perfil mostra ${system1_score}% Sistema 1 e ${system2_score}% Sistema 2, um balanceamento ${balance}. Continue desenvolvendo sensibilidade contextual para saber quando acelerar (Sistema 1) vs quando desacelerar (Sistema 2).`,
    kahneman_quote: '"A melhor hora para aprender é quando nenhuma decisão crítica precisa ser tomada."'
  };
};

export default {
  extractCognitiveTags,
  analyzeKahnemanSystems,
  getKahnemanInsight
};
