import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeScenarioHtml, normalizeScenarioText } from '../utils/scenarioTextNormalization.js';
import {
  deriveOutcomeTypeFromAnalysis,
  formatScenarioOptionParts,
  translateScenarioPressureIndicator
} from '../utils/realScenarioUtils.js';

test('deriveOutcomeTypeFromAnalysis preserves explicit non-neutral outcomes', () => {
  const analysis = {
    patterns: {
      decision_speed: { score: 10 },
      adaptability: { score: 10 }
    }
  };

  assert.equal(deriveOutcomeTypeFromAnalysis(analysis, 'success'), 'success');
  assert.equal(deriveOutcomeTypeFromAnalysis(analysis, 'failure'), 'failure');
});

test('deriveOutcomeTypeFromAnalysis classifies by average pattern score', () => {
  assert.equal(
    deriveOutcomeTypeFromAnalysis({ patterns: { a: { score: 20 }, b: { score: 30 } } }),
    'failure'
  );

  assert.equal(
    deriveOutcomeTypeFromAnalysis({ patterns: { a: { score: 50 }, b: { score: 60 } } }),
    'partial'
  );

  assert.equal(
    deriveOutcomeTypeFromAnalysis({ patterns: { a: { score: 70 }, b: { score: 80 } } }),
    'success'
  );
});

test('deriveOutcomeTypeFromAnalysis falls back to neutral without usable scores', () => {
  assert.equal(deriveOutcomeTypeFromAnalysis({ patterns: {} }), 'neutral');
  assert.equal(deriveOutcomeTypeFromAnalysis(null), 'neutral');
});

test('formatScenarioOptionParts separates action and speech when quoted text exists', () => {
  assert.deepEqual(
    formatScenarioOptionParts('Impor regras: "Ana e Carlos começam juntos amanhã às 8h."'),
    {
      action: 'Impor regras',
      speech: 'Ana e Carlos começam juntos amanhã às 8h.'
    }
  );
});

test('formatScenarioOptionParts keeps plain text as speech-only', () => {
  assert.deepEqual(
    formatScenarioOptionParts('Reunião de célula completa: celebrar, refletir, aprender'),
    {
      action: null,
      speech: 'Reunião de célula completa: celebrar, refletir, aprender'
    }
  );
});

test('normalizeScenarioText corrects known legacy PT-BR copy issues', () => {
  const normalized = normalizeScenarioText(
    'Action > discussion. Isso fica por Minha conta. Qual é seu role nessa sprint de emergencia?'
  );

  assert.match(normalized, /Acao clara reduz incerteza e pressao no time\./);
  assert.match(normalized, /Por minha conta\./);
  assert.match(normalized, /papel nessa sprint de emergencia\?/);
});

test('normalizeScenarioText translates raw technical pressure tag tokens', () => {
  const normalized = normalizeScenarioText(
    'time_critical authority_established cognitive_shift stakes_increased ambiguity_increased'
  );

  assert.match(normalized, /momento critico de tempo/);
  assert.match(normalized, /autoridade estabelecida/);
  assert.match(normalized, /mudanca de perspectiva/);
  assert.match(normalized, /risco aumentou/);
  assert.match(normalized, /maior incerteza/);
});

test('normalizeScenarioHtml converts quoted paragraphs into blockquotes', () => {
  const normalized = normalizeScenarioHtml('<p>"Agora temos direção."</p>');

  assert.equal(normalized, '<blockquote><p>"Agora temos direção."</p></blockquote>');
});

test('normalizeScenarioHtml converts strong-wrapped quotes and speaker lines to scenario pattern', () => {
  const normalized = normalizeScenarioHtml(
    '<p>Mão levantada: <strong>Dev Junior (3 anos)</strong></p><p><strong>"Mas a solução híbrida seja só um adiar problemas?"</strong></p><p>Tech Lead 2: foco em stabilidade</p>'
  );

  assert.match(normalized, /scenario-speaker-line/);
  assert.match(normalized, /<blockquote><p>"Mas a solução híbrida seja só um adiar problemas\?"<\/p><\/blockquote>/);
  assert.match(normalized, /estabilidade/);
});

test('normalizeScenarioHtml removes escape slashes from quoted dialogue', () => {
  const normalized = normalizeScenarioHtml(
    '<p><strong>\\"Vocês sabem que o projeto está 3 dias atrás? Isso resolve até sexta?\\"</strong></p>'
  );

  assert.doesNotMatch(normalized, /\\"/);
  assert.match(normalized, /<blockquote><p>"Vocês sabem que o projeto está 3 dias atrás\? Isso resolve até sexta\?"<\/p><\/blockquote>/);
});

test('translateScenarioPressureIndicator always returns Portuguese-facing labels', () => {
  assert.deepEqual(translateScenarioPressureIndicator('time_critical'), {
    label: 'Momento crítico de tempo',
    icon: '⏱️'
  });

  assert.deepEqual(translateScenarioPressureIndicator({ key: 'authority_established' }), {
    label: 'Autoridade estabelecida',
    icon: '🧭'
  });

  assert.deepEqual(translateScenarioPressureIndicator('unknown_english_tag'), {
    label: 'Novo desdobramento',
    icon: '📊'
  });
});

test('translateScenarioPressureIndicator supports object payload variants', () => {
  assert.deepEqual(translateScenarioPressureIndicator({ type: 'cognitive_shift' }), {
    label: 'Mudança de perspectiva',
    icon: '🧠'
  });

  assert.deepEqual(translateScenarioPressureIndicator({ tag: 'authority_established' }), {
    label: 'Autoridade estabelecida',
    icon: '🧭'
  });

  assert.deepEqual(translateScenarioPressureIndicator({ time_critical: true }), {
    label: 'Momento crítico de tempo',
    icon: '⏱️'
  });

  assert.deepEqual(translateScenarioPressureIndicator('TIME CRITICAL'), {
    label: 'Momento crítico de tempo',
    icon: '⏱️'
  });

  assert.deepEqual(translateScenarioPressureIndicator({ pressure_tag: 'authority-established' }), {
    label: 'Autoridade estabelecida',
    icon: '🧭'
  });
});
