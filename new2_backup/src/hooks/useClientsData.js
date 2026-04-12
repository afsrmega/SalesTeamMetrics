
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useClientsData = () => {
  const { user, isSalesMember, isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('clients').select('*');
      if (isSalesMember && !isAdmin) {
        query = query.eq('owner_user_id', user.id);
      }
      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      setClients(data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, isSalesMember, isAdmin]);

  useEffect(() => {
    fetchClients();
    if (!user) return;

    const channel = supabase.channel('clients_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients, user]);

  return { clients, loading, error, refetch: fetchClients };
};
