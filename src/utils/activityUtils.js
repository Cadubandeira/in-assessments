// Activity type constants and utilities for the Activities feature
import { 
  Trophy, 
  Brain, 
  Award 
} from 'lucide-react';

// Activity type enum
export const ACTIVITY_TYPES = {
  ASSESSMENT: 'assessment',
  QUIZ: 'quiz',
  CERTIFICATION: 'certification'
};

// Maps activity types to display configuration
export const ACTIVITY_TYPE_CONFIG = {
  assessment: {
    label: 'Avaliação',
    icon: Trophy,
    color: '#4F46E5',
    bgColor: '#4F46E5',
    badgeColor: 'bg-[#4F46E5]',
    textColor: 'text-[#4F46E5]'
  },
  quiz: {
    label: 'Quiz',
    icon: Brain,
    color: '#06B6D4',
    bgColor: '#06B6D4',
    badgeColor: 'bg-[#06B6D4]',
    textColor: 'text-[#06B6D4]'
  },
  certification: {
    label: 'Certificação',
    icon: Award,
    color: '#8B5CF6',
    bgColor: '#8B5CF6',
    badgeColor: 'bg-[#8B5CF6]',
    textColor: 'text-[#8B5CF6]'
  }
};

/**
 * Get configuration for an activity type
 * Defaults to 'assessment' if type is not recognized
 */
export const getActivityConfig = (activityType) => {
  return ACTIVITY_TYPE_CONFIG[activityType] || ACTIVITY_TYPE_CONFIG.assessment;
};

/**
 * Format activity display name
 * Falls back to activity_type if activity_name is not provided
 */
export const formatActivityName = (activity) => {
  if (activity?.activity_name) {
    return activity.activity_name;
  }
  
  // Fallback for activities without names (backward compatibility)
  const config = getActivityConfig(activity?.activity_type || 'assessment');
  return config.label;
};

/**
 * Get activity icon component for display
 */
export const getActivityIcon = (activityType) => {
  const config = getActivityConfig(activityType);
  return config.icon;
};
