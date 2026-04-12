
import { supabase } from '@/lib/customSupabaseClient';

export const getEffectiveMemberGoal = async (memberId, periodType, periodKey) => {
  console.log(`🔍 [getEffectiveMemberGoal] Fetching for member: ${memberId}, ${periodType}: ${periodKey}`);
  try {
    // Priority 1: Check sales_team.monthly_quota if override is enabled
    const { data: teamData, error: teamError } = await supabase
      .from('sales_team')
      .select('monthly_quota, quarterly_quota, monthly_quota_override_enabled')
      .or(`linked_user_id.eq.${memberId},id.eq.${memberId}`)
      .maybeSingle();
      
    if (!teamError && teamData && teamData.monthly_quota_override_enabled) {
      if (periodType === 'month' && teamData.monthly_quota > 0) {
        console.log(`✅ [getEffectiveMemberGoal] Using sales_team override: ${teamData.monthly_quota}`);
        return { goal: Number(teamData.monthly_quota), source: 'sales_team' };
      } else if (periodType === 'quarter' && teamData.quarterly_quota > 0) {
        console.log(`✅ [getEffectiveMemberGoal] Using sales_team override: ${teamData.quarterly_quota}`);
        return { goal: Number(teamData.quarterly_quota), source: 'sales_team' };
      }
    }

    // Priority 2: Check goals_by_period
    const { data: periodData, error: periodError } = await supabase
      .from('goals_by_period')
      .select('individual_goal')
      .eq('period_type', periodType)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (!periodError && periodData && periodData.individual_goal > 0) {
      console.log(`✅ [getEffectiveMemberGoal] Using goals_by_period: ${periodData.individual_goal}`);
      return { goal: Number(periodData.individual_goal), source: 'goals_by_period' };
    }

    // Priority 3: Fallback to global_settings
    const { data: globalData, error: globalError } = await supabase
      .from('global_settings')
      .select('individual_monthly_commission_threshold, individual_quarterly_target')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!globalError && globalData) {
      if (periodType === 'month' && globalData.individual_monthly_commission_threshold > 0) {
        console.log(`✅ [getEffectiveMemberGoal] Using global settings (month): ${globalData.individual_monthly_commission_threshold}`);
        return { goal: Number(globalData.individual_monthly_commission_threshold), source: 'global_settings' };
      } else if (periodType === 'quarter' && globalData.individual_quarterly_target > 0) {
        console.log(`✅ [getEffectiveMemberGoal] Using global settings (quarter): ${globalData.individual_quarterly_target}`);
        return { goal: Number(globalData.individual_quarterly_target), source: 'global_settings' };
      }
    }

    console.log(`❌ [getEffectiveMemberGoal] No goal found, returning null`);
    return { goal: null, source: 'none' };
  } catch (error) {
    console.error('❌ [getEffectiveMemberGoal] Error:', error);
    return { goal: null, source: 'error' };
  }
};

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

export const checkExternalIdUnique = async (externalId) => {
  const { data, error } = await supabase
    .from('prospects')
    .select('id')
    .eq('external_id', externalId)
    .maybeSingle();
    
  if (error) throw new Error('Error al verificar la disponibilidad del ID externo.');
  return !data;
};

export const createProspect = async (prospectData) => {
  if (!prospectData.external_id) throw new Error('El ID Externo es obligatorio.');
  if (!prospectData.prospect_name || !prospectData.prospect_name.trim()) throw new Error('El Nombre del prospecto es obligatorio.');
  if (!prospectData.source_lead) throw new Error('El Origen es obligatorio.');
  if (!prospectData.property_type) throw new Error('El Tipo de Propiedad es obligatorio.');

  const isUnique = await checkExternalIdUnique(prospectData.external_id);
  if (!isUnique) throw new Error(`El ID Externo ${prospectData.external_id} ya existe. Por favor usa uno diferente.`);

  const formattedData = {
    ...prospectData,
    prospect_name: prospectData.prospect_name.trim()
  };

  const { data, error } = await supabase
    .from('prospects')
    .insert([formattedData])
    .select()
    .single();
    
  if (error) {
    if (error.code === '23505') {
      throw new Error('Ya existe un registro con este ID Externo.');
    }
    throw new Error(error.message || 'Error al crear el prospecto.');
  }
  return data;
};

export const updateProspectWithHistory = async (prospectId, updates, effectiveAt, note) => {
  try {
    const formattedUpdates = { ...updates };
    if (formattedUpdates.prospect_name) {
      formattedUpdates.prospect_name = formattedUpdates.prospect_name.trim();
    }

    const { error } = await supabase.rpc('update_prospect_with_history', {
      p_prospect_id: prospectId,
      p_updates: formattedUpdates,
      p_effective_at: effectiveAt,
      p_note: note || ''
    });
    
    if (error) throw error;

    const { data: updatedProspect, error: fetchError } = await supabase
      .from('prospects')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (fetchError) throw fetchError;
    return updatedProspect;
  } catch (error) {
    console.error('Error updating prospect:', error);
    throw new Error(error.message || 'Error al actualizar el prospecto. Verifica tus permisos y asegúrate de ser el propietario.');
  }
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

export const markAsLost = async (prospectId, lostReason, lostNotes) => {
  try {
    const { error } = await supabase
      .from('prospects')
      .update({
        status: 'lost',
        stage: 'Lost',
        lost_reason: lostReason,
        lost_notes: lostNotes,
        lost_at: new Date().toISOString()
      })
      .eq('id', prospectId)
    
    if (error) throw error;
    return { success: true }
  } catch (error) {
    console.error('❌ markAsLost failed:', error)
    throw error
  }
}

export const restoreProspect = async (prospectId) => {
  try {
    const { error } = await supabase
      .from('prospects')
      .update({
        status: 'active',
        stage: 'Active',
        lost_reason: null,
        lost_notes: null,
        lost_at: null
      })
      .eq('id', prospectId)
    
    if (error) throw error;
    return { success: true }
  } catch (error) {
    console.error('❌ restoreProspect failed:', error)
    throw error
  }
}

export const getProspectHistory = async (prospectId) => {
  const { data, error } = await supabase.from('prospect_history').select('*').eq('prospect_id', prospectId).order('effective_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const deleteProspect = async (id) => {
  const { error } = await supabase.from('prospects').delete().eq('id', id);
  if (error) throw error;
};

export const deleteProspectWithReason = async (prospectId, deletionReason, userId) => {
  const trimmedReason = deletionReason?.trim();
  if (!trimmedReason) throw new Error("El motivo de eliminación es obligatorio.");
  if (!userId) throw new Error("El ID de usuario es obligatorio para realizar esta acción.");

  try {
    const { data, error } = await supabase.rpc('delete_prospect_with_reason', {
      p_prospect_id: prospectId,
      p_deletion_reason: trimmedReason,
      p_deleted_by: userId
    });
    
    if (error) throw new Error(`Error al eliminar el prospecto: ${error.message}`);
    return { success: true, prospectId, deletionReason: trimmedReason };
  } catch (error) {
    throw error;
  }
};

export const getProspectTags = async (prospectId) => {
  const { data, error } = await supabase
    .from('prospect_tags')
    .select('tag_id, tags(id, name)')
    .eq('prospect_id', prospectId);
  if (error) throw error;
  return data?.map(d => d.tags) || [];
};

export const buildProspectTagsMap = async (prospects) => {
  if (!prospects || prospects.length === 0) return {};
  const ids = prospects.map(p => p.id);
  const { data, error } = await supabase
    .from('prospect_tags')
    .select('prospect_id, tags(id, name, color)')
    .in('prospect_id', ids);
    
  if (error) throw error;
  
  const map = {};
  ids.forEach(id => { map[id] = []; });
  data?.forEach(row => {
    if (row.tags) {
      map[row.prospect_id].push(row.tags);
    }
  });
  return map;
};

export const getProspectMetrics = async (userId, filters = {}) => {
  let pQuery = supabase.from('prospects').select('estimated_property_value, qualification, status').eq('owner_user_id', userId).eq('status', 'active');
  let cQuery = supabase.from('clients').select('estimated_property_value, pending_for_financials').eq('owner_user_id', userId);
  
  const [pRes, cRes] = await Promise.all([pQuery, cQuery]);
  
  const prospects = pRes.data || [];
  const clients = cRes.data || [];
  
  const pipeline_total = prospects.reduce((sum, p) => sum + Number(p.estimated_property_value || 0), 0) + 
                         clients.reduce((sum, c) => sum + Number(c.estimated_property_value || 0), 0);
                         
  const expected_prospects = prospects.reduce((sum, p) => {
    let prob = 0.05;
    if(p.qualification >= 4 && p.qualification <= 5) prob = 0.15;
    else if(p.qualification >= 6 && p.qualification <= 7) prob = 0.30;
    else if(p.qualification >= 8 && p.qualification <= 9) prob = 0.55;
    else if(p.qualification === 10) prob = 0.75;
    return sum + (Number(p.estimated_property_value || 0) * prob);
  }, 0);

  const pending_financials_value = clients.filter(c => c.pending_for_financials).reduce((sum, c) => sum + Number(c.estimated_property_value || 0), 0);
  const hot_value = prospects.filter(p => p.qualification >= 8).reduce((sum, p) => sum + Number(p.estimated_property_value || 0), 0);

  return {
    pipeline_total,
    expected_prospects,
    pending_financials_value,
    hot_value,
    total_prospects_value: prospects.reduce((sum, p) => sum + Number(p.estimated_property_value || 0), 0)
  };
};

export const getTopProspects = async (userId, limit = 10, filters = {}) => {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('status', 'active')
    .order('estimated_property_value', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
};

export const getTopClients = async (userId, limit = 10, filters = {}) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('owner_user_id', userId)
    .order('estimated_property_value', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
};

export const getUrgentFollowUps = async (userId) => {
  const today = new Date().toISOString();
  
  const [pRes, cRes] = await Promise.all([
    supabase.from('prospects').select('*').eq('owner_user_id', userId).eq('status', 'active').lt('follow_up_at', today),
    supabase.from('clients').select('*').eq('owner_user_id', userId).lt('client_follow_up_at', today)
  ]);
  
  return {
    prospects: pRes.data || [],
    clients: cRes.data || []
  };
};

export const getUpcomingFollowUps = async (userId, days = 7) => {
  const today = new Date();
  const future = new Date();
  future.setDate(today.getDate() + days);
  
  const todayStr = today.toISOString();
  const futureStr = future.toISOString();
  
  const [pRes, cRes] = await Promise.all([
    supabase.from('prospects').select('*').eq('owner_user_id', userId).eq('status', 'active').gte('follow_up_at', todayStr).lte('follow_up_at', futureStr),
    supabase.from('clients').select('*').eq('owner_user_id', userId).gte('client_follow_up_at', todayStr).lte('client_follow_up_at', futureStr)
  ]);
  
  return {
    prospects: pRes.data || [],
    clients: cRes.data || []
  };
};

export const getMonthlyQuota = async (userId, month) => {
  const date = typeof month === 'string' ? new Date(month + '-01T00:00:00') : (month || new Date());
  const yyyyMm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  const { goal } = await getEffectiveMemberGoal(userId, 'month', yyyyMm);
  return goal;
};

export const getAchievedMTD = async (userId, month) => {
  const date = typeof month === 'string' ? new Date(month + '-01T00:00:00') : (month || new Date());
  
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

  let { data: teamData } = await supabase.from('sales_team')
    .select('id')
    .or(`linked_user_id.eq.${userId},user_id.eq.${userId}`)
    .maybeSingle();

  if (!teamData || !teamData.id) return 0;

  let { data: salesData } = await supabase.from('sales_records')
    .select('value')
    .eq('sales_member_id', teamData.id)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)
    .eq('is_valid', true)
    .eq('is_deleted', false);

  return (salesData || []).reduce((sum, record) => sum + Number(record.value || 0), 0);
};
