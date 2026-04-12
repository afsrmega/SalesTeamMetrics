
import { supabase } from './customSupabaseClient';

export const getSavedSegments = async (userId, scope) => {
  const { data, error } = await supabase
    .from('saved_segments')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('scope', scope)
    .order('is_favorite', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createSavedSegment = async (userId, scope, name, filters, isFavorite = false) => {
  // Check for duplicates case-insensitively
  const { data: existing } = await supabase
    .from('saved_segments')
    .select('id')
    .eq('owner_user_id', userId)
    .eq('scope', scope)
    .ilike('name', name)
    .single();

  if (existing) {
    throw new Error('Segment name already exists');
  }

  const { data, error } = await supabase
    .from('saved_segments')
    .insert([{
      owner_user_id: userId,
      scope,
      name,
      filters,
      is_favorite: isFavorite
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Segment name already exists');
    throw error;
  }
  return data;
};

export const updateSavedSegment = async (segmentId, name, filters, isFavorite) => {
  const updates = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (filters !== undefined) updates.filters = filters;
  if (isFavorite !== undefined) updates.is_favorite = isFavorite;

  const { data, error } = await supabase
    .from('saved_segments')
    .update(updates)
    .eq('id', segmentId)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('Segment name already exists');
    throw error;
  }
  return data;
};

export const deleteSavedSegment = async (segmentId) => {
  const { error } = await supabase
    .from('saved_segments')
    .delete()
    .eq('id', segmentId);

  if (error) throw error;
  return { success: true };
};

export const toggleFavorite = async (segmentId, isFavorite) => {
  const { data, error } = await supabase
    .from('saved_segments')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', segmentId)
    .select('id, is_favorite')
    .single();

  if (error) throw error;
  return data;
};
