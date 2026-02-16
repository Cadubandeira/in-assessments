import { supabase } from './supabaseClient';

export const getActiveAssessmentVersion = async (assessmentId) => {
  const { data, error } = await supabase
    .from('assessment_versions')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('is_active', true)
    .single();

  if (error) {
    // It's better to not throw here but return the error, allowing the caller to handle it.
    // Or handle specific cases like "PGRST116" (single row not found) gracefully.
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error(`No active version found for assessment ID ${assessmentId}.`) };
    }
    return { data: null, error };
  }
  
  return { data, error: null };
};
