
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
  
  if (error) throw error;
  return data;
};

export const getClientHistory = async (clientId) => {
  const { data, error } = await supabase
    .from('client_history')
    .select('id, changed_by, effective_at, changes, note, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
};

export const deleteClient = async (id) => {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
};

export const getClientTags = async (clientId) => {
  const { data, error } = await supabase
    .from('client_tags')
    .select('tag_id, tags(id, name)')
    .eq('client_id', clientId);
  if (error) throw error;
  return data?.map(d => d.tags) || [];
};

export const buildClientTagsMap = async (clients) => {
  if (!clients || clients.length === 0) return {};
  const ids = clients.map(c => c.id);
  const { data, error } = await supabase
    .from('client_tags')
    .select('client_id, tags(id, name, color)')
    .in('client_id', ids);
    
  if (error) throw error;
  
  const map = {};
  ids.forEach(id => { map[id] = []; });
  data?.forEach(row => {
    if (row.tags) {
      map[row.client_id].push(row.tags);
    }
  });
  return map;
};
