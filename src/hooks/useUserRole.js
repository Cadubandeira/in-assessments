import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useUserRole = () => {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchRole = async () => {
      try {
        setLoading(true);

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setError('Usuário não autenticado.');
          return;
        }

        // Try to fetch existing profile
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          // Profile doesn't exist, create it with default role 'user'
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: user.id, role: 'user' }]);

          if (insertError) {
            // Check if it was a unique constraint error (profile already exists, race condition)
            if (insertError.code === '23505') {
              // Profile was created by another request, fetch it
              const { data: retryData, error: retryError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

              if (retryError) throw retryError;
              if (mounted) setRole(retryData?.role || 'user');
            } else {
              throw insertError;
            }
          } else {
            if (mounted) setRole('user');
          }
        } else {
          const nextRole = data?.role || 'user';
          if (mounted) setRole(['admin', 'user', 'corporate'].includes(nextRole) ? nextRole : 'user');
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
        if (mounted) setError(err.message || String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchRole();
    return () => { mounted = false; };
  }, []);

  return { role, loading, error };
};
