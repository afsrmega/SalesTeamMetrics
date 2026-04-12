
import { supabase } from './customSupabaseClient';
import { resolveGoalForMemberPeriod } from './commissionEngine';

export const validateAdminOnly = async (userId) => {
  console.log("🔒 validating admin access... User ID:", String(userId));
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in validateAdminOnly');
  if (!userId) throw new Error("Solo el administrador puede modificar metas");

  let query = supabase.from('sales_team').select('role, is_admin');
  
  if (userId === null) {
    query = query.is('linked_user_id', null);
  } else {
    query = query.eq('linked_user_id', userId);
  }
  
  const { data, error } = await query.maybeSingle();
    
  if (error) throw new Error("Solo el administrador puede modificar metas");
  const isAdmin = data?.role === 'admin' || data?.is_admin === true;
  
  if (!isAdmin) throw new Error("Solo el administrador puede modificar metas");
  return true;
};

export const getEffectiveGoal = async (periodType, periodKey) => {
  console.log(`🔍 [getEffectiveGoal] Delegating to commissionEngine for ${periodType} ${periodKey}`);
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in getEffectiveGoal');
  const result = await resolveGoalForMemberPeriod(null, periodType, periodKey, null);
  return {
    teamGoal: result.teamGoal,
    individualGoal: result.goal,
    source: result.source
  };
};

export const getEffectiveMemberGoal = async (memberId, periodType, periodKey) => {
  console.log(`🔍 [getEffectiveMemberGoal] Delegating to commissionEngine for member: ${memberId}`);
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in getEffectiveMemberGoal');
  const result = await resolveGoalForMemberPeriod(memberId, periodType, periodKey, null);
  return { 
    goal: result.goal > 0 ? result.goal : null, 
    source: result.source, 
    overrideEnabled: result.overrideEnabled 
  };
};

export const getGoalsByPeriod = async (periodType, periodKey, globalSettings) => {
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in getGoalsByPeriod');
  const result = await getEffectiveGoal(periodType, periodKey);
  return {
    team_goal: result.teamGoal,
    individual_goal: result.individualGoal,
    isCustom: result.source === 'goals_by_period'
  };
};

export const saveGoalsByPeriod = async (periodType, periodKey, teamGoal, individualGoal, userId) => {
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in saveGoalsByPeriod');
  try {
    await validateAdminOnly(userId);
    const payload = {
      period_type: periodType,
      period_key: periodKey,
      team_goal: parseFloat(teamGoal) || 0,
      individual_goal: parseFloat(individualGoal) || 0,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('goals_by_period')
      .upsert(payload, { onConflict: 'period_type,period_key' })
      .select()
      .single();

    if (error) throw error;
    
    localStorage.removeItem(`goals_${periodType}_${periodKey}`);
    localStorage.removeItem('goals_cache');
    
    const freshGoals = await getEffectiveGoal(periodType, periodKey);
    const eventDetail = {
      periodType,
      periodKey,
      teamGoal: freshGoals.teamGoal,
      individualGoal: freshGoals.individualGoal,
      timestamp: new Date().toISOString()
    };
    window.dispatchEvent(new CustomEvent('goalsUpdated', { detail: eventDetail }));
    return data;
  } catch (error) {
    throw error;
  }
};

export const getEffectiveMonthlyGoalForMember = async (memberId, selectedMonthKey) => {
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in getEffectiveMonthlyGoalForMember');
  const res = await getEffectiveMemberGoal(memberId, 'month', selectedMonthKey);
  return res.goal;
};

export async function resolveQuarterGoalForMember({
  memberId,
  selectedQuarter,
  memberQuarterlyQuota,
  overrideEnabled = false,
  supabaseClient = supabase
}) {
  console.log(`[resolveQuarterGoalForMember] Resolving for memberId: ${memberId}, quarter: ${selectedQuarter}`);
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in resolveQuarterGoalForMember');

  if (overrideEnabled && memberQuarterlyQuota > 0) {
    console.log(`✅ Using member override: ${memberQuarterlyQuota}`);
    return Number(memberQuarterlyQuota);
  }

  if (selectedQuarter) {
    const { data: periodData, error: periodError } = await supabaseClient
      .from('goals_by_period')
      .select('individual_goal')
      .eq('period_type', 'quarter')
      .eq('period_key', selectedQuarter)
      .maybeSingle();

    if (!periodError && periodData?.individual_goal > 0) {
      console.log(`✅ Using goals_by_period: ${periodData.individual_goal}`);
      return Number(periodData.individual_goal);
    }
  }

  const { data: globalData, error: globalError } = await supabaseClient
    .from('global_settings')
    .select('individual_quarterly_target')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!globalError && globalData?.individual_quarterly_target > 0) {
    console.log(`✅ Using global_settings fallback: ${globalData.individual_quarterly_target}`);
    return Number(globalData.individual_quarterly_target);
  }

  console.log(`⚠️ No quarter goal found`);
  return 0;
}

export async function resolveMemberDashboardGoal({
  memberRow,
  periodKey,
  periodMode,
  supabaseClient = supabase
}) {
  console.log(`[resolveMemberDashboardGoal] Start: memberId=${memberRow?.id}, periodKey=${periodKey}, periodMode=${periodMode}`);
  console.log('AUDIT FIX: Replaced user_id with linked_user_id in resolveMemberDashboardGoal');

  if (memberRow?.monthly_quota_override_enabled) {
    const val = periodMode === 'month' ? (memberRow.monthly_quota || memberRow.monthlyQuota) : (memberRow.quarterly_quota || memberRow.quarterlyQuota);
    if (val > 0) {
      console.log(`✅ Using member override for ${periodMode}: ${val}`);
      return Number(val);
    }
  }

  if (periodKey) {
    const { data: periodData, error: periodError } = await supabaseClient
      .from('goals_by_period')
      .select('individual_goal')
      .eq('period_type', periodMode)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (periodError) {
      console.error(`[resolveMemberDashboardGoal] Error querying goals_by_period:`, periodError);
    } else if (periodData?.individual_goal > 0) {
      console.log(`✅ Using goals_by_period for ${periodMode}: ${periodData.individual_goal}`);
      return Number(periodData.individual_goal);
    }
  }

  const { data: globalData, error: globalError } = await supabaseClient
    .from('global_settings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (globalError) {
    console.error(`[resolveMemberDashboardGoal] Error querying global_settings:`, globalError);
  } else if (globalData) {
    const val = periodMode === 'month' 
      ? (globalData.individual_monthly_commission_threshold || globalData.individual_monthly_target) 
      : globalData.individual_quarterly_target;
      
    if (val > 0) {
      console.log(`✅ Using global_settings fallback for ${periodMode}: ${val}`);
      return Number(val);
    }
  }

  console.log(`⚠️ No goal found for ${periodMode}, returning 0`);
  return 0;
}
