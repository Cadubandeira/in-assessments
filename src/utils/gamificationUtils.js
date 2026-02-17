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
      80: 50,
      90: 100,
      100: 150
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
