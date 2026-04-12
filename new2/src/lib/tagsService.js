
import { supabase } from '@/lib/customSupabaseClient';

export const getTags = async () => {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const getAvailableTags = async (userId) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .or(`owner_user_id.is.null,owner_user_id.eq.${userId}`)
    .order('name');
  if (error) throw error;
  return data || [];
};

export const createTag = async (name, color, owner_user_id, created_by) => {
  if (!name || !name.trim()) throw new Error("Tag name is required");
  
  const payload = {
    name: name.trim(),
    color: color || '#64748b', // default gray
    owner_user_id: owner_user_id || null,
    created_by: created_by
  };

  const { data, error } = await supabase
    .from('tags')
    .insert([payload])
    .select()
    .single();
    
  if (error) {
    if (error.code === '23505') throw new Error("A tag with this name already exists.");
    throw error;
  }
  return data;
};

export const assignTag = async (entityType, entityId, tagId) => {
  const table = entityType === 'client' ? 'client_tags' : 'prospect_tags';
  const column = entityType === 'client' ? 'client_id' : 'prospect_id';
  
  const { data, error } = await supabase
    .from(table)
    .insert([{ [column]: entityId, tag_id: tagId }])
    .select();
    
  if (error) throw error;
  return data;
};

export const removeTag = async (entityType, entityId, tagId) => {
  const table = entityType === 'client' ? 'client_tags' : 'prospect_tags';
  const column = entityType === 'client' ? 'client_id' : 'prospect_id';
  
  const { error } = await supabase
    .from(table)
    .delete()
    .match({ [column]: entityId, tag_id: tagId });
    
  if (error) throw error;
};

export const getProspectTags = async (prospectId) => {
  const { data, error } = await supabase
    .from('prospect_tags')
    .select('tag_id, tags(*)')
    .eq('prospect_id', prospectId);
  if (error) throw error;
  return data || [];
};

export const getClientTags = async (clientId) => {
  const { data, error } = await supabase
    .from('client_tags')
    .select('tag_id, tags(*)')
    .eq('client_id', clientId);
  if (error) throw error;
  return data || [];
};
