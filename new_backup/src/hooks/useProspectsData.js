
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useProspectsData = () => {
  const { user, isSalesMember, isAdmin } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProspects = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('prospects').select('*');
      if (isSalesMember && !isAdmin) {
        query = query.eq('owner_user_id', user.id);
      }
      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setProspects(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, isSalesMember, isAdmin]);

  useEffect(() => {
    fetchProspects();
    if (!user) return;

    const channel = supabase.channel('prospects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, () => {
        fetchProspects();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProspects, user]);

  return { prospects, loading, error, refetch: fetchProspects };
};
