import { useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { calculateXP, getCurrentLevel } from '../utils/gamificationUtils';

/**
 * Hook para atualizar progressão do usuário após completar uma atividade
 * Calcula XP, atualiza banco de dados e retorna info de level up
 *
 * @returns {object} Hook com função updateUserProgression
 */
export const useProgressionUpdate = () => {
  const updateUserProgression = useCallback(
    async (userId, score, maxScore, activityType = 'assessment', preCalculatedXP = null) => {
      try {
        // 1. Calcular XP ganho (ou usar XP pré-calculado para scenarios)
        const xpGained = preCalculatedXP !== null ? preCalculatedXP : calculateXP(score, maxScore, activityType);

        // 2. Buscar user_progression atual
        const { data: currentProgression, error: fetchError } = await supabase
          .from('user_progression')
          .select('level, total_xp')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw new Error(`Erro ao buscar progressão: ${fetchError.message}`);
        }

        // Se não existe, criar novo registro
        if (!currentProgression) {
          const { data: newProgression, error: createError } = await supabase
            .from('user_progression')
            .insert({
              user_id: userId,
              level: 1,
              total_xp: xpGained
            })
            .select()
            .single();

          if (createError) throw createError;

          return {
            success: true,
            xpGained,
            previousLevel: 1,
            newLevel: 1,
            leveledUp: false,
            totalXP: xpGained
          };
        }

        // 3. Atualizar total_xp
        const newTotalXP = (currentProgression.total_xp || 0) + xpGained;
        const previousLevel = currentProgression.level || 1;
        const newLevel = getCurrentLevel(newTotalXP);
        const leveledUp = newLevel > previousLevel;

        const { error: updateError } = await supabase
          .from('user_progression')
          .update({
            level: newLevel,
            total_xp: newTotalXP
          })
          .eq('user_id', userId);

        if (updateError) throw updateError;

        return {
          success: true,
          xpGained,
          previousLevel,
          newLevel,
          leveledUp,
          totalXP: newTotalXP
        };
      } catch (error) {
        console.error('Erro ao atualizar progressão:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },
    []
  );

  return { updateUserProgression };
};
