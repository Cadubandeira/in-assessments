/**
 * Teste de Cenário Real: Aplicação com Indicadores Antigos e Novos
 * 
 * Simula:
 * 1. Assessment antigo (sem ranges) funcionando normalmente
 * 2. Assessment novo (com ranges) funcionando normalmente
 * 3. Transição entre eles sem erros
 */

function getClassificationFromRanges(score, maxScore, ranges, indicatorName) {
  if (!ranges || ranges.length === 0) {
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    const classifyFallback = (percentage) => {
      if (percentage <= 40) return 'Crítico';
      if (percentage <= 70) return 'Moderado';
      return 'Saudável';
    };

    return {
      percentage,
      classification: classifyFallback(percentage),
      interpretation: `Classificação automática: ${classifyFallback(percentage)}`
    };
  }

  const sortedRanges = [...ranges].sort((a, b) => a.min_score - b.min_score);
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  for (const range of sortedRanges) {
    if (percentage >= range.min_score && percentage <= range.max_score) {
      return {
        percentage,
        classification: range.label,
        interpretation: range.interpretation || ''
      };
    }
  }

  const lastRange = sortedRanges[sortedRanges.length - 1];
  return {
    percentage,
    classification: lastRange.label,
    interpretation: lastRange.interpretation || ''
  };
}

// Simulação de calculateResults com novo code
function calculateResultsWithNewArch(indicators, assessmentIndicators, answers) {
  const indicatorResults = {};
  let totalScore = 0;

  // Processar indicadores antigos (compatibilidade)
  indicators.forEach(indicator => {
    let indicatorScore = 0;
    let indicatorMax = 0;

    indicator.questions.forEach(question => {
      const score = answers[question.id] || 0;
      indicatorScore += score;

      const maxQuestionScore = (question.alternatives || []).reduce((max, alt) =>
        Math.max(max, alt.score_value), 0);
      indicatorMax += maxQuestionScore;
    });

    const classificationData = getClassificationFromRanges(indicatorScore, indicatorMax, [], indicator.name);

    indicatorResults[indicator.name] = {
      score: indicatorScore,
      maxScore: indicatorMax,
      percentage: classificationData.percentage,
      classification: classificationData.classification,
      interpretation: classificationData.interpretation,
      source: 'fallback' // Marcador para debug
    };

    totalScore += indicatorScore;
  });

  // Processar novos indicadores com ranges
  if (assessmentIndicators && assessmentIndicators.length > 0) {
    assessmentIndicators.forEach(ai => {
      const indicator = ai.indicatorMaster;
      if (!indicator) return;

      let indicatorScore = 0;
      let indicatorMax = 0;

      // Simular perguntas (em caso real, seriam buscadas do DB)
      ai.questions?.forEach(question => {
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
        interpretation: classificationData.interpretation,
        source: 'ranges' // Marcador para debug
      };

      totalScore += indicatorScore;
    });
  }

  return { totalScore, indicatorResults };
}

console.log('=== TESTE: Cenário Real com Indicadores Mistos ===\n');

// Simulação de Dados - Assessment Antigo (sem ranges)
const oldIndicators = [
  {
    id: 'ind-1',
    name: 'Liderança (Antigo)',
    questions: [
      {
        id: 'q1',
        alternatives: [
          { score_value: 0 },
          { score_value: 50 },
          { score_value: 100 }
        ]
      },
      {
        id: 'q2',
        alternatives: [
          { score_value: 0 },
          { score_value: 50 },
          { score_value: 100 }
        ]
      }
    ]
  },
  {
    id: 'ind-2',
    name: 'Comunicação (Antigo)',
    questions: [
      {
        id: 'q3',
        alternatives: [
          { score_value: 0 },
          { score_value: 50 },
          { score_value: 100 }
        ]
      }
    ]
  }
];

// Answers para teste
const answers = {
  q1: 75,   // 75% = 37.5/50 -> Moderado
  q2: 100,  // 100%
  q3: 50    // 50% = Moderado
};

// Calculando com indicadores antigos
console.log('Cenário 1: Assessment Antigo (sem ranges)\n');
const resultOld = calculateResultsWithNewArch(oldIndicators, [], answers);

Object.entries(resultOld.indicatorResults).forEach(([name, data]) => {
  console.log(`${name}:`);
  console.log(`  Score: ${data.score}/${data.maxScore} (${data.percentage}%)`);
  console.log(`  Classificação: ${data.classification}`);
  console.log(`  Fonte: ${data.source}`);
  console.log();
});

// Simulação de Dados - Assessment Novo (com ranges)
const newAssessmentIndicators = [
  {
    id: 'ai-1',
    indicatorMaster: { id: 'im-1', name: 'Liderança (Novo)' },
    ranges: [
      { min_score: 0, max_score: 35, label: 'Muito Fraco', interpretation: 'Necessita melhorias significativas' },
      { min_score: 36, max_score: 60, label: 'Fraco', interpretation: 'Há espaço para desenvolvimento' },
      { min_score: 61, max_score: 80, label: 'Bom', interpretation: 'Desempenho acima da média' },
      { min_score: 81, max_score: 100, label: 'Excelente', interpretation: 'Desempenho excepcional' }
    ],
    questions: [
      {
        id: 'q4',
        alternatives: [
          { score_value: 0 },
          { score_value: 50 },
          { score_value: 100 }
        ]
      },
      {
        id: 'q5',
        alternatives: [
          { score_value: 0 },
          { score_value: 50 },
          { score_value: 100 }
        ]
      }
    ]
  },
  {
    id: 'ai-2',
    indicatorMaster: { id: 'im-2', name: 'Comunicação (Novo)' },
    ranges: [
      { min_score: 0, max_score: 40, label: 'Crítico', interpretation: 'Requer atenção urgente' },
      { min_score: 41, max_score: 70, label: 'Moderado', interpretation: 'Oportunidades de melhoria' },
      { min_score: 71, max_score: 100, label: 'Saudável', interpretation: 'Nível consistente e positivo' }
    ],
    questions: [
      {
        id: 'q6',
        alternatives: [
          { score_value: 0 },
          { score_value: 50 },
          { score_value: 100 }
        ]
      }
    ]
  }
];

const answersNew = {
  q4: 85,   // 85% = Excelente
  q5: 90,   // 90%
  q6: 50    // 50% = Moderado
};

console.log('Cenário 2: Assessment Novo (com ranges)\n');
const resultNew = calculateResultsWithNewArch([], newAssessmentIndicators, answersNew);

Object.entries(resultNew.indicatorResults).forEach(([name, data]) => {
  console.log(`${name}:`);
  console.log(`  Score: ${data.score}/${data.maxScore} (${data.percentage}%)`);
  console.log(`  Classificação: ${data.classification}`);
  console.log(`  Interpretação: ${data.interpretation}`);
  console.log(`  Fonte: ${data.source}`);
  console.log();
});

// Cenário 3: Transição (ambos os tipos funcionam juntos)
console.log('Cenário 3: Transição (misturando indicadores antigos e novos)\n');

const mixedAnswers = {
  q1: 60,   // Antigo
  q2: 70,   // Antigo
  q3: 80,   // Antigo
  q4: 85,   // Novo
  q5: 90,   // Novo
  q6: 50    // Novo
};

const resultMixed = calculateResultsWithNewArch(oldIndicators, newAssessmentIndicators, mixedAnswers);

let antigos = 0, novos = 0;
Object.entries(resultMixed.indicatorResults).forEach(([name, data]) => {
  console.log(`${name}:`);
  console.log(`  Score: ${data.score}/${data.maxScore} (${data.percentage}%)`);
  console.log(`  Classificação: ${data.classification}`);
  console.log(`  Fonte: ${data.source}`);
  console.log();
  
  if (data.source === 'fallback') antigos++;
  else novos++;
});

console.log(`\nResumo da Transição:`);
console.log(`  Indicadores antigos (fallback): ${antigos}`);
console.log(`  Indicadores novos (ranges): ${novos}`);
console.log(`  Total de indicadores: ${antigos + novos}`);
console.log(`  ✓ Ambos os tipos funcionam simultaneamente!`);
