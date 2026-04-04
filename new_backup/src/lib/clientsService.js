
import { supabase } from '@/lib/customSupabaseClient';

export const getClients = async (filters = {}) => {
  let query = supabase.from('clients').select('*');
  if (filters.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getClientById = async (id) => {
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createClient = async (clientData) => {
  const { data, error } = await supabase.from('clients').insert([clientData]).select().single();
  if (error) throw error;
  return data;
};

export const updateClientWithHistory = async (clientId, updates, effectiveAt, note) => {
  const { data, error } = await supabase.rpc('update_client_with_history', {
    p_client_id: clientId,
    p_updates: updates,
    p_effective_at: effectiveAt,
    p_note: note || ''
  });
  // Note: Added fallback normal update if RPC not strictly defined yet in prompt for client
  if (error && error.message.includes('function public.update_client_with_history does not exist')) {
    await supabase.from('clients').update(updates).eq('id', clientId);
    await supabase.from('client_history').insert([{
        client_id: clientId,
        changed_by: (await supabase.auth.getUser()).data.user.id,
        effective_at: effectiveAt,
        changes: updates,
        note: note
    }]);
    return;
  }
  if (error) throw error;
  return data;
};

export const getClientHistory = async (clientId) => {
  const { data, error } = await supabase.from('client_history').select('*').eq('client_id', clientId).order('effective_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const deleteClient = async (id) => {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
};
