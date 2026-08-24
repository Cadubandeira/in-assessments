/**
 * Pure helpers for RealScenarios logic.
 */

export const deriveOutcomeTypeFromAnalysis = (analysis, currentOutcome = 'neutral') => {
  if (currentOutcome && currentOutcome !== 'neutral') return currentOutcome;

  const patternScores = Object.values(analysis?.patterns || {})
    .map((item) => item?.score)
    .filter((score) => typeof score === 'number');

  if (patternScores.length === 0) return 'neutral';

  const avgScore = patternScores.reduce((sum, value) => sum + value, 0) / patternScores.length;

  if (avgScore < 45) return 'failure';
  if (avgScore < 65) return 'partial';
  return 'success';
};

export const formatScenarioOptionParts = (rawText = '') => {
  const text = String(rawText).trim();
  const quoteMatch = text.match(/["“](.+?)["”]/);

  if (!quoteMatch) {
    return { action: null, speech: text };
  }

  const speech = quoteMatch[1].trim();
  const action = text
    .replace(quoteMatch[0], '')
    .replace(/[-–—:]+\s*$/, '')
    .trim();

  return { action: action || null, speech };
};

const PRESSURE_INDICATOR_MAP = {
  stakes_increased: { label: 'Risco aumentou', icon: '🔥' },
  new_constraint_added: { label: 'Nova restrição', icon: '⚠️' },
  time_pressure_added: { label: 'Pressão de tempo', icon: '⏱️' },
  information_revealed: { label: 'Nova informação', icon: '💡' },
  ambiguity_increased: { label: 'Maior incerteza', icon: '🤔' },
  time_critical: { label: 'Momento crítico de tempo', icon: '⏱️' },
  authority_established: { label: 'Autoridade estabelecida', icon: '🧭' },
  cognitive_shift: { label: 'Mudança de perspectiva', icon: '🧠' }
};

const normalizeIndicatorKey = (value = '') => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

const getObjectIndicatorCandidates = (indicator) => {
  if (!indicator || typeof indicator !== 'object') return [];

  const candidates = [
    indicator.key,
    indicator.name,
    indicator.id,
    indicator.label,
    indicator.value,
    indicator.type,
    indicator.tag,
    indicator.code,
    indicator.pressure_tag,
    indicator.pressure_change,
    indicator.indicator
  ];

  const keys = Object.keys(indicator).filter((k) => typeof k === 'string' && k.trim().length > 0);
  if (keys.length === 1) {
    candidates.push(keys[0]);
  }

  return candidates
    .map((candidate) => normalizeIndicatorKey(candidate))
    .filter((candidate) => candidate.length > 0);
};

export const normalizeScenarioPressureIndicator = (indicator) => {
  if (typeof indicator === 'string') {
    return normalizeIndicatorKey(indicator);
  }

  if (indicator && typeof indicator === 'object') {
    const candidates = getObjectIndicatorCandidates(indicator);
    if (candidates.length > 0) {
      return candidates[0];
    }

    return normalizeIndicatorKey(indicator.raw || '');
  }

  return '';
};

export const translateScenarioPressureIndicator = (indicator) => {
  const candidates = [];

  const normalizedPrimary = normalizeScenarioPressureIndicator(indicator);
  if (normalizedPrimary) {
    candidates.push(normalizedPrimary);
  }

  if (indicator && typeof indicator === 'object') {
    candidates.push(...getObjectIndicatorCandidates(indicator));
  }

  for (const key of candidates) {
    const mapped = PRESSURE_INDICATOR_MAP[key];
    if (mapped) {
      return mapped;
    }
  }

  return {
    label: 'Novo desdobramento',
    icon: '📊'
  };
};
