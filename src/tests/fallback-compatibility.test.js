/**
 * Teste de Compatibilidade de Fallback para Arquitetura de Indicadores
 * 
 * Este teste verifica:
 * 1. Classificação com ranges do banco de dados
 * 2. Classificação com fallback hardcoded (sem ranges)
 * 3. Assert que ambas produzem resultados válidos
 * 4. Edge cases (score 0, score máximo, score entre faixas)
 */

// Mock da função getClassificationFromRanges para teste
function getClassificationFromRanges(score, maxScore, ranges, indicatorName) {
  if (!ranges || ranges.length === 0) {
    // Fallback se não houver ranges configuradas
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    const classifyFallback = (percentage) => {
      if (percentage <= 40) return 'Crítico';
      if (percentage <= 70) return 'Moderado';
      return 'Saudável';
    };

    const generateInterpretationFallback = (name, percentage) => {
      if (percentage <= 40)
        return `O indicador ${name} apresenta nível crítico e requer atenção imediata.`;
      if (percentage <= 70)
        return `O indicador ${name} apresenta nível moderado, com oportunidades claras de melheira.`;
      return `O indicador ${name} apresenta nível saudável e consistente.`;
    };

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
}

// Teste 1: Compatibilidade Fallback (sem ranges)
console.log('=== TESTE 1: Compatibilidade Fallback (sem ranges) ===\n');

const testCasesFallback = [
  { score: 0, maxScore: 100, expectedClass: 'Crítico', desc: 'Score 0 (0%)' },
  { score: 30, maxScore: 100, expectedClass: 'Crítico', desc: 'Score baixo (30%)' },
  { score: 40, maxScore: 100, expectedClass: 'Crítico', desc: 'Score limite crítico (40%)' },
  { score: 50, maxScore: 100, expectedClass: 'Moderado', desc: 'Score médio (50%)' },
  { score: 70, maxScore: 100, expectedClass: 'Moderado', desc: 'Score limite moderado (70%)' },
  { score: 80, maxScore: 100, expectedClass: 'Saudável', desc: 'Score alto (80%)' },
  { score: 100, maxScore: 100, expectedClass: 'Saudável', desc: 'Score máximo (100%)' }
];

let testsFallbackPassed = 0;
testCasesFallback.forEach(test => {
  const result = getClassificationFromRanges(test.score, test.maxScore, [], 'Liderança');
  const passed = result.classification === test.expectedClass;
  testsFallbackPassed += passed ? 1 : 0;
  
  console.log(`${passed ? '✓' : '✗'} ${test.desc}`);
  console.log(`  Resultado: ${result.classification} (${result.percentage}%)`);
  if (!passed) {
    console.log(`  Esperado: ${test.expectedClass}`);
  }
  console.log();
});

console.log(`Fallback Tests: ${testsFallbackPassed}/${testCasesFallback.length} passou\n`);

// Teste 2: Com Ranges do Banco
console.log('=== TESTE 2: Classificação com Ranges do Banco ===\n');

const mockRanges = [
  { min_score: 0, max_score: 40, label: 'Crítico', interpretation: 'Nível crítico requer atenção imediata' },
  { min_score: 41, max_score: 70, label: 'Moderado', interpretation: 'Nível moderado com oportunidades de melhoria' },
  { min_score: 71, max_score: 100, label: 'Saudável', interpretation: 'Nível saudável e consistente' }
];

const testCasesRanges = [
  { score: 0, maxScore: 100, expectedClass: 'Crítico', desc: 'Score 0 (0%)' },
  { score: 30, maxScore: 100, expectedClass: 'Crítico', desc: 'Score baixo (30%)' },
  { score: 40, maxScore: 100, expectedClass: 'Crítico', desc: 'Score limite crítico (40%)' },
  { score: 50, maxScore: 100, expectedClass: 'Moderado', desc: 'Score médio (50%)' },
  { score: 70, maxScore: 100, expectedClass: 'Moderado', desc: 'Score limite moderado (70%)' },
  { score: 80, maxScore: 100, expectedClass: 'Saudável', desc: 'Score alto (80%)' },
  { score: 100, maxScore: 100, expectedClass: 'Saudável', desc: 'Score máximo (100%)' }
];

let testsRangesPassed = 0;
testCasesRanges.forEach(test => {
  const result = getClassificationFromRanges(test.score, test.maxScore, mockRanges, 'Liderança');
  const passed = result.classification === test.expectedClass;
  testsRangesPassed += passed ? 1 : 0;
  
  console.log(`${passed ? '✓' : '✗'} ${test.desc}`);
  console.log(`  Resultado: ${result.classification} (${result.percentage}%)`);
  if (!passed) {
    console.log(`  Esperado: ${test.expectedClass}`);
  }
  console.log();
});

console.log(`Ranges Tests: ${testsRangesPassed}/${testCasesRanges.length} passou\n`);

// Teste 3: Consistência entre Fallback e Ranges
console.log('=== TESTE 3: Consistência Fallback vs Ranges ===\n');

let consistencyPassed = 0;
testCasesFallback.forEach(test => {
  const fallbackResult = getClassificationFromRanges(test.score, test.maxScore, [], 'Liderança');
  const rangeResult = getClassificationFromRanges(test.score, test.maxScore, mockRanges, 'Liderança');
  
  const consistent = fallbackResult.classification === rangeResult.classification;
  consistencyPassed += consistent ? 1 : 0;
  
  console.log(`${consistent ? '✓' : '✗'} ${test.desc}`);
  console.log(`  Fallback: ${fallbackResult.classification}`);
  console.log(`  Ranges:   ${rangeResult.classification}`);
  console.log();
});

console.log(`Consistency Tests: ${consistencyPassed}/${testCasesFallback.length} passou\n`);

// Teste 4: Edge Cases (maxScore = 0, valores negativos, etc)
console.log('=== TESTE 4: Edge Cases ===\n');

const edgeCases = [
  { score: 0, maxScore: 0, desc: 'maxScore = 0 (divisão por zero)' },
  { score: 50, maxScore: 150, desc: 'Score parcial de maxScore grande' },
  { score: 100, maxScore: 200, desc: 'Score 50% de maxScore dobrado' }
];

let edgeCasesPassed = 0;
edgeCases.forEach(test => {
  try {
    const result = getClassificationFromRanges(test.score, test.maxScore, mockRanges, 'Teste');
    console.log(`✓ ${test.desc}`);
    console.log(`  Resultado: ${result.classification} (${result.percentage}%)`);
    edgeCasesPassed++;
  } catch (err) {
    console.log(`✗ ${test.desc}`);
    console.log(`  Erro: ${err.message}`);
  }
  console.log();
});

console.log(`Edge Cases: ${edgeCasesPassed}/${edgeCases.length} passou\n`);

// Resumo Final
console.log('=== RESUMO FINAL ===\n');
const totalTests = testCasesFallback.length + testCasesRanges.length + edgeCases.length;
const totalPassed = testsFallbackPassed + testsRangesPassed + edgeCasesPassed;

console.log(`Total de testes: ${totalTests}`);
console.log(`Testes passados: ${totalPassed}`);
console.log(`Taxa de sucesso: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);

if (totalPassed === totalTests) {
  console.log('✓ TODOS OS TESTES PASSARAM - Compatibilidade de fallback confirmada!');
} else {
  console.log(`✗ ${totalTests - totalPassed} teste(s) falharam`);
}
