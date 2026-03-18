import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import { DEFAULT_AVATAR_BG, DEFAULT_AVATAR_KEY } from '../config/communityProfile';

const getFallbackName = (user) => {
  if (!user) return 'Usuário';
  return user.user_metadata?.display_name
    || user.user_metadata?.full_name
    || user.user_metadata?.name
    || user.email?.split('@')[0]
    || 'Usuário';
};

export const resolveDisplayName = (user, profile) => profile?.display_name || getFallbackName(user);

export const useCommunityProfile = (user) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = user?.id || null;
  const hasLoadedRef = useRef(false);

  const fallbackName = useMemo(
    () => getFallbackName(user),
    [user?.id, user?.email, user?.user_metadata?.display_name, user?.user_metadata?.full_name, user?.user_metadata?.name]
  );

  const ensureProfileRow = useCallback(async ({ silent = false } = {}) => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      hasLoadedRef.current = false;
      return null;
    }

    if (!silent || !hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, role, display_name, avatar_key, avatar_bg_color, community_opt_in, community_onboarded_at, is_banned, banned_reason')
        .eq('id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const initialProfile = {
          id: userId,
          role: 'user',
          display_name: fallbackName,
          avatar_key: DEFAULT_AVATAR_KEY,
          avatar_bg_color: DEFAULT_AVATAR_BG,
          community_opt_in: false
        };

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert([initialProfile])
          .select('id, role, display_name, avatar_key, avatar_bg_color, community_opt_in, community_onboarded_at, is_banned, banned_reason')
          .single();

        if (insertError && insertError.code !== '23505') {
          throw insertError;
        }

        if (insertError?.code === '23505') {
          const { data: retried, error: retryError } = await supabase
            .from('profiles')
            .select('id, role, display_name, avatar_key, avatar_bg_color, community_opt_in, community_onboarded_at, is_banned, banned_reason')
            .eq('id', userId)
            .single();

          if (retryError) throw retryError;
          setProfile(retried);
          return retried;
        }

        setProfile(inserted);
        return inserted;
      }

      setProfile(data);
      hasLoadedRef.current = true;
      return data;
    } catch (err) {
      setError(err.message || String(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [fallbackName, userId]);

  useEffect(() => {
    ensureProfileRow({ silent: true });
  }, [userId, ensureProfileRow]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`profile-updates-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            setProfile(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const updateProfile = useCallback(async (updates) => {
    if (!userId) return { data: null, error: new Error('Usuário não autenticado') };

    const payload = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId)
      .select('id, role, display_name, avatar_key, avatar_bg_color, community_opt_in, community_onboarded_at, is_banned, banned_reason')
      .single();

    if (updateError) {
      setError(updateError.message || String(updateError));
      return { data: null, error: updateError };
    }

    setProfile(data);
    return { data, error: null };
  }, [userId]);

  return {
    profile,
    loading,
    error,
    displayName: resolveDisplayName(user, profile),
    refreshProfile: ensureProfileRow,
    updateProfile
  };
};
