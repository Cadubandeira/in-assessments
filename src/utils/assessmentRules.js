/**
 * Assessment rules and business logic utilities.
 * 
 * Future enhancements planned:
 * - Limit by number of attempts
 * - Limit by time period (e.g., one per month)
 * - Integrate with paid plans / subscriptions
 * - Admin overrides and permissions
 */

export const canUserTakeAssessment = (history, role) => {
  // For now, all authenticated users can take assessments
  // This function is a placeholder for future business logic

  // Future logic examples:
  // if (role === 'user' && history && history.length > 0) {
  //   const lastAssessment = history[0];
  //   const daysSinceLastAttempt = (new Date() - new Date(lastAssessment.created_at)) / (1000 * 60 * 60 * 24);
  //   if (daysSinceLastAttempt < 30) return false; // One per month
  // }

  return true;
};
