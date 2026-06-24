import { supabase } from '@/lib/customSupabaseClient';

export const getTouchpointsByClient = async (clientId) => {
  const { data, error } = await supabase
    .from('client_touchpoints')
    .select('*')
    .eq('client_id', clientId)
    .order('step', { ascending: true });
  if (error) throw error;
  return data;
};

export const getTouchpointsByOwner = async (ownerId) => {
  const { data, error } = await supabase
    .from('client_touchpoints')
    .select('*, clients(*)')
    .eq('owner_user_id', ownerId)
    .order('due_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const updateTouchpointStatus = async (touchpointId, status, note = null) => {
  const updates = { status, updated_at: new Date().toISOString() };
  if (note !== null) updates.note = note;
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('client_touchpoints')
    .update(updates)
    .eq('id', touchpointId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const completeTouchpoint = async (touchpointId, note) => {
  return updateTouchpointStatus(touchpointId, 'completed', note);
};

export const rescheduleTouchpoint = async (touchpointId, newDueDate, note) => {
  const { data, error } = await supabase
    .from('client_touchpoints')
    .update({ 
      status: 'rescheduled', 
      due_at: newDueDate, 
      note,
      updated_at: new Date().toISOString() 
    })
    .eq('id', touchpointId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const skipTouchpoint = async (touchpointId, note) => {
  return updateTouchpointStatus(touchpointId, 'skipped', note);
};

export const getOverdueTouchpoints = async (ownerId) => {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('client_touchpoints')
    .select('*, clients!inner(estimated_property_value, prospect_name, id)')
    .eq('owner_user_id', ownerId)
    .in('status', ['scheduled', 'rescheduled'])
    .lt('due_at', now)
    .order('due_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const getUpcomingTouchpoints = async (ownerId, days = 7) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const future = new Date(today);
  future.setDate(today.getDate() + days);
  
  const { data, error } = await supabase
    .from('client_touchpoints')
    .select('*, clients!inner(estimated_property_value, prospect_name, id)')
    .eq('owner_user_id', ownerId)
    .in('status', ['scheduled', 'rescheduled'])
    .gte('due_at', now.toISOString())
    .lte('due_at', future.toISOString())
    .order('due_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const getRapportMetrics = async (ownerId) => {
  const overdue = await getOverdueTouchpoints(ownerId);
  const upcoming = await getUpcomingTouchpoints(ownerId, 7);
  
  return {
    overdueCount: overdue.length,
    overdueValue: overdue.reduce((sum, t) => sum + Number(t.clients?.estimated_property_value || 0), 0),
    upcomingCount: upcoming.length,
    upcomingValue: upcoming.reduce((sum, t) => sum + Number(t.clients?.estimated_property_value || 0), 0),
    overdueList: overdue,
    upcomingList: upcoming
  };
};