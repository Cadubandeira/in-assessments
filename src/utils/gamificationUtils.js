/**
 * Gamification Utilities
 * Handles XP calculations, level progression, and gamification logic
 */

// XP values for different activity types and score thresholds
export const XP_CONFIG = {
  assessment: {
    base: 50,
    bonusThresholds: {
      80: 25,
      90: 50,
      100: 75
    }
  },
  quiz: {
    base: 20,
    bonusThresholds: {
      80: 10,
      90: 20,
      100: 30
    }
  },
  certification: {
    base: 100,
    bonusThresholds: {
      80: 25,
      90: 50,
      100: 100
    }
  },
  scenario: {
    base: 100,
    bonusThresholds: {
      empathy: 50,      // High System 2 (≥60%) = +50 XP
      decisiveness: 25, // Fast decisions (<25s avg) = +25 XP
      balance: 50,      // Balanced System 1/2 (40-60% range) = +50 XP
      minimizeBias: 25, // Low confidence bias (<2 biases detected) = +25 XP
      leadership: 75    // Team resolution path completed = +75 XP
    }
  }
};

/**
 * Calculate XP earned for completing an activity
 * @param {number} score - User's raw score
 * @param {number} maxScore - Maximum possible score
 * @param {string} activityType - Type of activity: 'assessment', 'quiz', 'certification'
 * @returns {number} Total XP earned
 */
export const calculateXP = (score, maxScore, activityType = 'assessment') => {
  if (maxScore === 0) return 0;

  const percentage = (score / maxScore) * 100;
  const config = XP_CONFIG[activityType] || XP_CONFIG.assessment;
  let totalXP = config.base;

  // Add bonus based on performance threshold
  if (percentage === 100) {
    totalXP += config.bonusThresholds[100];
  } else if (percentage >= 90) {
    totalXP += config.bonusThresholds[90];
  } else if (percentage >= 80) {
    totalXP += config.bonusThresholds[80];
  }

  return totalXP;
};

/**
 * Calculate XP earned for completing a scenario simulation
 * Based on Kahneman System 1/2 analysis and decision quality
 * @param {object} kahnemanData - Kahneman analysis results
 * @param {number} avgDecisionTime - Average decision time in seconds
 * @param {number} totalDecisions - Total decisions made
 * @returns {object} XP breakdown { baseXP, bonuses: { empathy, decisiveness, balance, bias, leadership }, totalXP }
 */
export const calculateScenarioXP = (kahnemanData, avgDecisionTime = 0, totalDecisions = 0) => {
  const config = XP_CONFIG.scenario;
  let baseXP = config.base;
  let bonuses = {};

  if (!kahnemanData) {
    return {
      baseXP,
      bonuses: {},
      totalXP: baseXP,
      breakdown: [`Base: ${baseXP} XP`]
    };
  }

  const { system1_score, system2_score, biases = [] } = kahnemanData;

  // Bonus 1: Empathy & Analysis (high System 2)
  if (system2_score >= 60) {
    bonuses.empathy = config.bonusThresholds.empathy;
  }

  // Bonus 2: Decisiveness (fast average decision time)
  if (avgDecisionTime > 0 && avgDecisionTime < 25) {
    bonuses.decisiveness = config.bonusThresholds.decisiveness;
  }

  // Bonus 3: Balanced cognition (both systems 40-60% range)
  if (system1_score >= 40 && system1_score <= 60 && system2_score >= 40 && system2_score <= 60) {
    bonuses.balance = config.bonusThresholds.balance;
  }

  // Bonus 4: Low bias (detected fewer than 2 biases or biases with low confidence)
  const highConfidenceBiases = biases.filter(b => (b.confidence || 50) > 60).length;
  if (highConfidenceBiases <= 1) {
    bonuses.minimizeBias = config.bonusThresholds.minimizeBias;
  }

  // Bonus 5: Leadership path (if used team-level conflict resolution - indicated by many decisions)
  if (totalDecisions >= 12) {
    bonuses.leadership = config.bonusThresholds.leadership;
  }

  const totalBonus = Object.values(bonuses).reduce((sum, val) => sum + val, 0);
  const totalXP = baseXP + totalBonus;

  const breakdown = [
    `Base: ${baseXP} XP`,
    bonuses.empathy ? `Empatia & Análise: +${bonuses.empathy} XP` : null,
    bonuses.decisiveness ? `Velocidade: +${bonuses.decisiveness} XP` : null,
    bonuses.balance ? `Equilíbrio: +${bonuses.balance} XP` : null,
    bonuses.minimizeBias ? `Redução de Vieses: +${bonuses.minimizeBias} XP` : null,
    bonuses.leadership ? `Liderança de Time: +${bonuses.leadership} XP` : null
  ].filter(Boolean);

  return {
    baseXP,
    bonuses,
    totalXP,
    breakdown
  };
};

/**
 * Get cumulative XP threshold for a specific level
 * Uses exponential curve: Level 2=100, Level 3=200, Level 4=300, etc.
 * @param {number} level - Target level (1-based)
 * @returns {number} Cumulative XP required to reach that level
 */
export const getLevelThreshold = (level) => {
  // Level 1 has 0 XP requirement (starting point)
  if (level <= 1) return 0;
  
  // Formula: 100 * level * (level - 1) / 2
  // Gives: L2=100, L3=300, L4=600, L5=1000, L6=1500, etc.
  return (100 * level * (level - 1)) / 2;
};

/**
 * Determine current level based on total XP
 * @param {number} totalXP - Total accumulated XP
 * @returns {number} Current level
 */
export const getCurrentLevel = (totalXP) => {
  let level = 1;
  
  // Find the highest level threshold that totalXP exceeds
  while (getLevelThreshold(level + 1) <= totalXP) {
    level++;
  }
  
  return level;
};

/**
 * Get progression details for current level
 * Retorna XP total acumulado vs XP total necessário para alcançar o próximo nível
 * @param {number} totalXP - Total accumulated XP
 * @returns {object} Level progression details
 */
export const getCurrentLevelProgress = (totalXP) => {
  const level = getCurrentLevel(totalXP);
  const currentLevelThreshold = getLevelThreshold(level);
  const nextLevelThreshold = getLevelThreshold(level + 1);
  
  // XP relativo ao nível (para referência interna)
  const xpInCurrentLevel = totalXP - currentLevelThreshold;
  const xpNeededForLevel = nextLevelThreshold - currentLevelThreshold;
  
  // XP total acumulado vs XP total para próximo nível (o que exibir na barra)
  const totalXPProgressPercentage = (totalXP / nextLevelThreshold) * 100;
  
  return {
    level,
    totalXP,
    nextLevelThreshold,
    currentLevelXP: xpInCurrentLevel,        // XP dentro do nível atual (para futuros usos)
    nextLevelXP: xpNeededForLevel,           // XP máximo deste nível (para futuros usos)
    progressPercentage: Math.min(totalXPProgressPercentage, 100), // Barra: totalXP / nextLevelXP
    xpToNextLevel: Math.max(0, nextLevelThreshold - totalXP)      // XP que falta
  };
};

/**
 * Format XP display (e.g., "1.2K XP", "150 XP")
 * @param {number} xp - XP amount
 * @returns {string} Formatted XP string
 */
export const formatXP = (xp) => {
  if (xp >= 1000) {
    return `${(xp / 1000).toFixed(1)}K XP`;
  }
  return `${xp} XP`;
};

/**
 * Get level badge description based on level
 * @param {number} level - Current level
 * @returns {string} Level descriptor
 */
export const getLevelBadge = (level) => {
  if (level <= 2) return 'Iniciante';
  if (level <= 5) return 'Aprendiz';
  if (level <= 10) return 'Competente';
  if (level <= 15) return 'Avançado';
  if (level <= 20) return 'Especialista';
  return 'Mestre';
};

/**
 * Get color for level display
 * @param {number} level - Current level
 * @returns {string} Hex color code
 */
export const getLevelColor = (level) => {
  if (level <= 2) return '#6B7280'; // Gray
  if (level <= 5) return '#3B82F6'; // Blue
  if (level <= 10) return '#10B981'; // Green
  if (level <= 15) return '#F59E0B'; // Amber
  if (level <= 20) return '#EF4444'; // Red
  return '#8B5CF6'; // Purple
};
