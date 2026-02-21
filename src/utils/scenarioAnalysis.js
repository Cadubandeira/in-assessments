/**
 * Scenario Analysis Engine
 * Analisa padrões cognitivos e mapeia para indicadores mestres
 * Baseado em princípios de Daniel Kahneman (Thinking, Fast and Slow)
 */

/**
 * Main analysis function
 * @param {Array} decisions - Array of decision objects from the session
 * @param {Object} scenario - The scenario configuration
 * @returns {Object} Analysis with patterns, indicators, and insights
 */
export const analyzeCognitivePatterns = (decisions, scenario) => {
  if (!decisions || decisions.length === 0) {
    return {
      patterns: {},
      indicators: {},
      insights: []
    };
  }

  // Calculate cognitive patterns
  const patterns = {
    decision_speed: calculateDecisionSpeed(decisions),
    risk_profile: assessRiskTolerance(decisions),
    thinking_style: classifyThinkingStyle(decisions),
    emotional_regulation: evaluateEmotionalResponses(decisions),
    adaptability: measureAdaptiveness(decisions),
    cognitive_load_management: assessCognitiveLoadHandling(decisions),
    consistency: measureDecisionConsistency(decisions)
  };

  // Map patterns to indicators
  const indicators = mapPatternsToIndicators(patterns, scenario.target_indicators);

  // Generate insights
  const insights = generateInsights(patterns, decisions);

  return {
    patterns,
    indicators,
    insights
  };
};

/**
 * Analyze decision speed to determine if user is fast/intuitive or slow/analytical
 */
const calculateDecisionSpeed = (decisions) => {
  const times = decisions.map(d => d.time_to_decide_seconds).filter(t => t != null);
  
  if (times.length === 0) {
    return { profile: 'unknown', avgTime: null, variance: null };
  }

  const avgTime = times.reduce((acc, t) => acc + t, 0) / times.length;
  const variance = calculateVariance(times);

  let profile = 'moderate';
  let description = 'Equilibrado entre análise e intuição';

  if (avgTime < 20) {
    profile = 'fast';
    description = 'Decisões rápidas e intuitivas (Sistema 1 - Kahneman)';
  } else if (avgTime > 45) {
    profile = 'slow';
    description = 'Decisões ponderadas e analíticas (Sistema 2 - Kahneman)';
  }

  return {
    profile,
    avgTime: Math.round(avgTime),
    variance: Math.round(variance),
    description,
    score: avgTime < 20 ? 40 : avgTime > 45 ? 60 : 50 // Mid-range is balanced
  };
};

/**
 * Assess risk tolerance based on option choices
 */
const assessRiskTolerance = (decisions) => {
  let riskScore = 0;
  let totalWeighted = 0;

  decisions.forEach(decision => {
    const option = decision.option;
    const riskLevel = option?.indicators_weight?.risk || 0;
    
    riskScore += riskLevel;
    totalWeighted += Math.abs(riskLevel);
  });

  const avgRisk = totalWeighted > 0 ? riskScore / totalWeighted : 0;

  let profile = 'moderate';
  let description = 'Balanço entre risco e cautela';

  if (avgRisk > 0.5) {
    profile = 'risk_taker';
    description = 'Tende a assumir riscos calculados';
  } else if (avgRisk < -0.5) {
    profile = 'risk_averse';
    description = 'Prefere abordagens conservadoras';
  }

  return {
    profile,
    score: Math.round(((avgRisk + 1) / 2) * 100), // Normalize -1 to 1 => 0 to 100
    avgRisk: Math.round(avgRisk * 100) / 100,
    description
  };
};

/**
 * Classify thinking style: analytical vs intuitive
 */
const classifyThinkingStyle = (decisions) => {
  const analyticalMarkers = decisions.filter(d => 
    d.node?.cognitive_markers?.requires_analytical === true
  ).length;

  const intuitiveMarkers = decisions.filter(d =>
    d.node?.cognitive_markers?.requires_intuitive === true
  ).length;

  const ratio = analyticalMarkers / Math.max(intuitiveMarkers, 1);

  let profile = 'balanced';
  let description = 'Alterna entre análise e intuição conforme contexto';

  if (ratio > 2) {
    profile = 'analytical';
    description = 'Predominantemente analítico e sistemático';
  } else if (ratio < 0.5) {
    profile = 'intuitive';
    description = 'Predominantemente intuitivo e experiencial';
  }

  return {
    profile,
    score: Math.round(ratio * 50), // Scaled score
    analyticalMarkers,
    intuitiveMarkers,
    description
  };
};

/**
 * Evaluate emotional regulation under pressure
 */
const evaluateEmotionalResponses = (decisions) => {
  let emotionalControlScore = 0;
  let highStakesCount = 0;

  decisions.forEach(decision => {
    const stakes = decision.node?.pressure_elements?.stakes;
    const emotionalLoad = decision.node?.cognitive_markers?.emotional_load;
    const confidence = decision.decision_confidence;

    if (stakes === 'critical' || emotionalLoad === 'high') {
      highStakesCount++;
      
      // If user remained confident under pressure, good emotional control
      if (confidence === 'confident') {
        emotionalControlScore += 2;
      } else if (confidence === 'moderate') {
        emotionalControlScore += 1;
      }
    }
  });

  const avgControl = highStakesCount > 0 
    ? emotionalControlScore / (highStakesCount * 2) 
    : 0.5;

  let profile = 'moderate';
  let description = 'Mantém compostura na maioria das situações';

  if (avgControl > 0.7) {
    profile = 'strong';
    description = 'Alta regulação emocional sob pressão';
  } else if (avgControl < 0.4) {
    profile = 'needs_development';
    description = 'Pressão afeta confiança nas decisões';
  }

  return {
    profile,
    score: Math.round(avgControl * 100),
    highStakesCount,
    description
  };
};

/**
 * Measure adaptiveness across different contexts
 */
const measureAdaptiveness = (decisions) => {
  // Look for pattern changes across decision sequence
  const first3 = decisions.slice(0, 3);
  const last3 = decisions.slice(-3);

  const firstAvgTime = first3.reduce((acc, d) => 
    acc + (d.time_to_decide_seconds || 0), 0) / first3.length;
  const lastAvgTime = last3.reduce((acc, d) => 
    acc + (d.time_to_decide_seconds || 0), 0) / last3.length;

  // Adaptation = ability to speed up or slow down based on context
  const timeAdaptation = Math.abs(firstAvgTime - lastAvgTime);

  let profile = 'adaptive';
  let description = 'Ajusta abordagem conforme contexto evolui';
  let score = 70;

  if (timeAdaptation > 15) {
    profile = 'highly_adaptive';
    description = 'Muito flexível, muda estratégia rapidamente';
    score = 85;
  } else if (timeAdaptation < 5) {
    profile = 'consistent';
    description = 'Mantém mesma abordagem independente do contexto';
    score = 55;
  }

  return {
    profile,
    score,
    timeAdaptation: Math.round(timeAdaptation),
    description
  };
};

/**
 * Assess how user handles cognitive load
 */
const assessCognitiveLoadHandling = (decisions) => {
  let handlingScore = 0;
  let highLoadCount = 0;

  decisions.forEach(decision => {
    const perceivedLoad = decision.cognitive_load_perceived;
    const actualLoad = decision.node?.cognitive_markers?.cognitive_complexity;

    if (actualLoad === 'high') {
      highLoadCount++;
      
      // User recognizes high load = good awareness
      if (perceivedLoad === 'high') {
        handlingScore += 1;
      } else if (perceivedLoad === 'medium') {
        handlingScore += 0.5;
      }
    }
  });

  const avgHandling = highLoadCount > 0 
    ? handlingScore / highLoadCount 
    : 0.5;

  return {
    score: Math.round(avgHandling * 100),
    awareness: avgHandling > 0.7 ? 'high' : avgHandling > 0.4 ? 'moderate' : 'low',
    description: avgHandling > 0.7 
      ? 'Reconhece e gerencia bem situações complexas'
      : 'Pode subestimar complexidade de cenários'
  };
};

/**
 * Measure consistency in decision patterns
 */
const measureDecisionConsistency = (decisions) => {
  // Check if similar situations led to similar decisions
  const decisionStyles = decisions.map(d => ({
    speed: d.time_to_decide_seconds < 30 ? 'fast' : 'slow',
    confidence: d.decision_confidence
  }));

  const fastCount = decisionStyles.filter(s => s.speed === 'fast').length;
  const consistency = Math.abs(fastCount - (decisions.length - fastCount)) / decisions.length;

  return {
    score: Math.round(consistency * 100),
    profile: consistency > 0.6 ? 'consistent' : 'variable',
    description: consistency > 0.6
      ? 'Padrão consistente de tomada de decisão'
      : 'Varia abordagem entre situações'
  };
};

/**
 * Map cognitive patterns to indicator scores
 */
const mapPatternsToIndicators = (patterns, targetIndicators) => {
  const mapping = {};

  targetIndicators.forEach(indicatorName => {
    const normalized = indicatorName.toLowerCase();

    let score = 50; // Default mid-range
    let evidence = [];

    // Liderança
    if (normalized.includes('lideranca') || normalized.includes('liderança')) {
      score = calculateLeadershipScore(patterns);
      evidence = [
        `Regulação emocional: ${patterns.emotional_regulation.profile}`,
        `Perfil de risco: ${patterns.risk_profile.profile}`,
        `Adaptabilidade: ${patterns.adaptability.profile}`
      ];
    }
    
    // Comunicação
    else if (normalized.includes('comunicacao') || normalized.includes('comunicação')) {
      score = calculateCommunicationScore(patterns);
      evidence = [
        `Estilo de pensamento: ${patterns.thinking_style.profile}`,
        `Adaptabilidade: ${patterns.adaptability.profile}`,
        `Consistência: ${patterns.consistency.profile}`
      ];
    }
    
    // Tomada de Decisão
    else if (normalized.includes('decisao') || normalized.includes('decisão')) {
      score = calculateDecisionMakingScore(patterns);
      evidence = [
        `Velocidade: ${patterns.decision_speed.profile}`,
        `Gerenciamento de carga: ${patterns.cognitive_load_management.awareness}`,
        `Perfil de risco: ${patterns.risk_profile.profile}`
      ];
    }
    
    // Ética
    else if (normalized.includes('etica') || normalized.includes('ética')) {
      score = calculateEthicsScore(patterns);
      evidence = [
        `Consistência: ${patterns.consistency.profile}`,
        `Regulação emocional: ${patterns.emotional_regulation.profile}`
      ];
    }
    
    // Resiliência
    else if (normalized.includes('resiliencia') || normalized.includes('resiliência')) {
      score = calculateResilienceScore(patterns);
      evidence = [
        `Adaptabilidade: ${patterns.adaptability.profile}`,
        `Regulação emocional: ${patterns.emotional_regulation.profile}`,
        `Gerenciamento de carga: ${patterns.cognitive_load_management.awareness}`
      ];
    }

    mapping[indicatorName] = {
      score,
      evidence: evidence.join(' | '),
      patterns_used: Object.keys(patterns).filter(key => 
        evidence.some(e => e.includes(patterns[key].profile || patterns[key].awareness))
      )
    };
  });

  return mapping;
};

// Specific indicator calculators
const calculateLeadershipScore = (patterns) => {
  return Math.round(
    patterns.emotional_regulation.score * 0.4 +
    patterns.risk_profile.score * 0.3 +
    patterns.adaptability.score * 0.3
  );
};

const calculateCommunicationScore = (patterns) => {
  return Math.round(
    patterns.adaptability.score * 0.4 +
    patterns.thinking_style.score * 0.3 +
    patterns.consistency.score * 0.3
  );
};

const calculateDecisionMakingScore = (patterns) => {
  return Math.round(
    patterns.decision_speed.score * 0.3 +
    patterns.cognitive_load_management.score * 0.4 +
    patterns.risk_profile.score * 0.3
  );
};

const calculateEthicsScore = (patterns) => {
  return Math.round(
    patterns.consistency.score * 0.5 +
    patterns.emotional_regulation.score * 0.5
  );
};

const calculateResilienceScore = (patterns) => {
  return Math.round(
    patterns.adaptability.score * 0.35 +
    patterns.emotional_regulation.score * 0.35 +
    patterns.cognitive_load_management.score * 0.3
  );
};

/**
 * Generate human-readable insights
 */
const generateInsights = (patterns, decisions) => {
  const insights = [];

  // Decision speed insight
  if (patterns.decision_speed.profile === 'fast') {
    insights.push({
      type: 'strength',
      title: 'Agilidade Decisória',
      description: 'Você toma decisões rapidamente, confiando em intuição e experiência.'
    });
  } else if (patterns.decision_speed.profile === 'slow') {
    insights.push({
      type: 'strength',
      title: 'Análise Profunda',
      description: 'Você pondera cuidadosamente antes de decidir, considerando múltiplas variáveis.'
    });
  }

  // Risk profile insight
  if (patterns.risk_profile.profile === 'risk_taker') {
    insights.push({
      type: 'watch',
      title: 'Perfil Arrojado',
      description: 'Você demonstra abertura para assumir riscos. Certifique-se de avaliar consequências.'
    });
  } else if (patterns.risk_profile.profile === 'risk_averse') {
    insights.push({
      type: 'development',
      title: 'Abordagem Conservadora',
      description: 'Você prefere cautela. Explore cenários onde calculados riscos podem trazer ganhos.'
    });
  }

  // Emotional regulation insight
  if (patterns.emotional_regulation.score > 70) {
    insights.push({
      type: 'strength',
      title: 'Controle Emocional',
      description: 'Você mantém compostura mesmo sob pressão intensa.'
    });
  } else if (patterns.emotional_regulation.score < 40) {
    insights.push({
      type: 'development',
      title: 'Regulação Emocional',
      description: 'Situações de alta pressão podem afetar sua confiança. Pratique técnicas de gestão de estresse.'
    });
  }

  // Adaptability insight
  if (patterns.adaptability.profile === 'highly_adaptive') {
    insights.push({
      type: 'strength',
      title: 'Alta Adaptabilidade',
      description: 'Você ajusta sua estratégia rapidamente conforme o contexto muda.'
    });
  }

  return insights;
};

/**
 * Helper: Calculate variance
 */
const calculateVariance = (numbers) => {
  const mean = numbers.reduce((acc, n) => acc + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((acc, n) => acc + n, 0) / numbers.length;
};

export default analyzeCognitivePatterns;
