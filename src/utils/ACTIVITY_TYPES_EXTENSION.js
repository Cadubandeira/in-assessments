// Example: How to add new activity types

/**
 * This file shows how to extend the Activities feature with new types
 * to support quizzes, certifications, and other activities in the future.
 */

import { Trophy, Brain, Award, BookOpen, Zap } from 'lucide-react';

/**
 * STEP 1: Add new type to activityUtils.js
 */

// In src/utils/activityUtils.js, update ACTIVITY_TYPE_CONFIG:

const ACTIVITY_TYPE_CONFIG_EXTENDED = {
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
  },
  // NEW TYPES BELOW
  course: {  // New type example
    label: 'Curso',
    icon: BookOpen,
    color: '#10B981',
    bgColor: '#10B981',
    badgeColor: 'bg-[#10B981]',
    textColor: 'text-[#10B981]'
  },
  challenge: {  // New type example
    label: 'Desafio',
    icon: Zap,
    color: '#F59E0B',
    bgColor: '#F59E0B',
    badgeColor: 'bg-[#F59E0B]',
    textColor: 'text-[#F59E0B]'
  }
};

/**
 * STEP 2: Update Database Constraint
 */

// In Supabase SQL Editor, update the constraint:

/*
ALTER TABLE public.assessment_events
DROP CONSTRAINT activity_type_check;

ALTER TABLE public.assessment_events
ADD CONSTRAINT activity_type_check 
CHECK (activity_type IN ('assessment', 'quiz', 'certification', 'course', 'challenge'));
*/

/**
 * STEP 3: Insert Activity Events
 */

// Example: Insert a quiz activity

const insertQuizActivity = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('assessment_events')
    .insert([
      {
        user_id: userId,
        activity_type: 'quiz',
        activity_name: 'Quiz: Conceitos Básicos de ESG',
        total_score: 8,
        max_possible_score: 10,
        executed_at: new Date().toISOString()
      }
    ]);

  if (error) console.error('Error inserting quiz:', error);
  return data;
};

// Example: Insert a course completion activity

const insertCourseActivity = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('assessment_events')
    .insert([
      {
        user_id: userId,
        activity_type: 'course',
        activity_name: 'Curso: Sustentabilidade Corporativa',
        total_score: 100,
        max_possible_score: 100,
        executed_at: new Date().toISOString()
      }
    ]);

  if (error) console.error('Error inserting course:', error);
  return data;
};

// Example: Insert a challenge activity

const insertChallengeActivity = async (supabase, userId) => {
  const { data, error } = await supabase
    .from('assessment_events')
    .insert([
      {
        user_id: userId,
        activity_type: 'challenge',
        activity_name: 'Desafio: Objetivo 7 da ONU',
        total_score: 45,
        max_possible_score: 50,
        executed_at: new Date().toISOString()
      }
    ]);

  if (error) console.error('Error inserting challenge:', error);
  return data;
};

/**
 * STEP 4: Frontend Automatically Displays With New Icons
 */

// Dashboard "Atividades Recentes" card will automatically show:
// 🏆 Avaliação: Indicadores Sociais
// 🧠 Quiz: Conceitos Básicos de ESG
// 📚 Curso: Sustentabilidade Corporativa
// ⚡ Desafio: Objetivo 7 da ONU

// No changes needed in Dashboard.jsx - it uses getActivityConfig() which handles all types!

/**
 * MIGRATION FOR NEW TYPES (SQL)
 */

/*
-- Example migration file: add_new_activity_types.sql

-- Step 1: Update constraint to add new types
ALTER TABLE public.assessment_events
DROP CONSTRAINT activity_type_check;

ALTER TABLE public.assessment_events
ADD CONSTRAINT activity_type_check 
CHECK (activity_type IN ('assessment', 'quiz', 'certification', 'course', 'challenge'));

-- Step 2: Create index if needed
CREATE INDEX idx_assessment_events_activity_extended 
ON public.assessment_events(user_id, activity_type, executed_at DESC)
WHERE activity_type IN ('course', 'challenge');

-- Step 3: Verify
SELECT DISTINCT activity_type FROM assessment_events;
*/

/**
 * TESTING NEW TYPES
 */

// Test script to verify new activities appear in Dashboard

const testNewActivityTypes = async (supabase, userId) => {
  try {
    // Insert all types
    await insertQuizActivity(supabase, userId);
    await insertCourseActivity(supabase, userId);
    await insertChallengeActivity(supabase, userId);

    // Fetch all activities
    const { data: activities, error } = await supabase
      .from('assessment_events')
      .select('activity_type, activity_name, total_score, max_possible_score, executed_at')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    console.log('Activities inserted and retrieved:', activities);

    // Verify each type has correct configuration
    activities.forEach(activity => {
      const config = getActivityConfig(activity.activity_type);
      console.log(`${activity.activity_name}: ${config.label} (${activity.activity_type})`);
    });

  } catch (error) {
    console.error('Test failed:', error);
  }
};

/**
 * SUMMARY
 * 
 * To add a new activity type:
 * 1. Add config to ACTIVITY_TYPE_CONFIG in activityUtils.js
 * 2. Update DB constraint to accept new type
 * 3. Insert activities with new type in code
 * 4. Frontend auto-displays with icon and color
 * 
 * No changes to Dashboard.jsx or card rendering needed!
 * The system is fully extensible.
 */
