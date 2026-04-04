
import { supabase } from '@/lib/customSupabaseClient';

export const getProspects = async (filters = {}) => {
  let query = supabase.from('prospects').select('*');
  if (filters.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);
  if (filters.status) query = query.eq('status', filters.status);
  
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getProspectById = async (id) => {
  const { data, error } = await supabase.from('prospects').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
};

export const createProspect = async (prospectData) => {
  const { data, error } = await supabase.from('prospects').insert([prospectData]).select().single();
  if (error) throw error;
  return data;
};

export const updateProspectWithHistory = async (prospectId, updates, effectiveAt, note) => {
  const { data, error } = await supabase.rpc('update_prospect_with_history', {
    p_prospect_id: prospectId,
    p_updates: updates,
    p_effective_at: effectiveAt,
    p_note: note || ''
  });
  if (error) throw error;
  return data;
};

export const convertProspectToClient = async (prospectId, effectiveAt, note) => {
  const { data, error } = await supabase.rpc('convert_prospect_to_client', {
    p_prospect_id: prospectId,
    p_effective_at: effectiveAt,
    p_note: note || ''
  });
  if (error) throw error;
  return data;
};

export const getProspectHistory = async (prospectId) => {
  const { data, error } = await supabase.from('prospect_history').select('*').eq('prospect_id', prospectId).order('effective_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const deleteProspect = async (id) => {
  const { error } = await supabase.from('prospects').delete().eq('id', id);
  if (error) throw error;
};
