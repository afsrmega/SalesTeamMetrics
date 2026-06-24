
import { supabase } from './customSupabaseClient';
import { resolveGoalForMemberPeriod } from './commissionEngine';
import { getEffectiveGoalForMember, getEffectiveQuarterGoalForMember } from './onboardingHelpers';

export const validateAdminOnly = async (userId) => {
  console.log("🔒 validating admin access... User ID:", String(userId));
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
  const result = await resolveGoalForMemberPeriod(null, periodType, periodKey, null);
  return {
    teamGoal: result.teamGoal,
    individualGoal: result.goal, // Note: This doesn't have member info to adjust, it's just the base goal
    source: result.source
  };
};

export const getEffectiveMemberGoal = async (memberId, periodType, periodKey) => {
  console.log(`🔍 [getEffectiveMemberGoal] Delegating to commissionEngine for member: ${memberId}`);
  const result = await resolveGoalForMemberPeriod(memberId, periodType, periodKey, null);
  
  let finalGoal = result.goal;

  // Retrieve member details to apply onboarding multipliers if applicable
  if (memberId && result.goal > 0) {
    const { data: memberData, error } = await supabase
      .from('sales_team')
      .select('is_new_member, new_member_start_date')
      .or(`id.eq.${memberId},linked_user_id.eq.${memberId}`)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching member:', error);
    } else if (memberData?.is_new_member && memberData?.new_member_start_date) {
      if (periodType === 'month') {
        finalGoal = getEffectiveGoalForMember(memberData, result.goal, 'month', periodKey);
        console.log(`[getEffectiveMemberGoal] Month Mode - BaseGoal: ${result.goal}, Multiplier: ${finalGoal / result.goal}, EffectiveGoal: ${finalGoal}`);
      } else if (periodType === 'quarter') {
        // Assume result.goal is the total quarter goal, meaning monthly is result.goal / 3
        finalGoal = getEffectiveQuarterGoalForMember(memberData, result.goal / 3, periodKey);
        console.log(`[getEffectiveMemberGoal] Quarter Mode - BaseGoal: ${result.goal}, EffectiveGoal: ${finalGoal}`);
      }
    }
  }

  return { 
    goal: finalGoal > 0 ? finalGoal : null, 
    source: result.source, 
    overrideEnabled: result.overrideEnabled 
  };
};

export const getGoalsByPeriod = async (periodType, periodKey, globalSettings) => {
  const result = await getEffectiveGoal(periodType, periodKey);
  return {
    team_goal: result.teamGoal,
    individual_goal: result.individualGoal,
    isCustom: result.source === 'goals_by_period'
  };
};

export const saveGoalsByPeriod = async (periodType, periodKey, teamGoal, individualGoal, userId) => {
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

  let baseGoal = 0;

  if (overrideEnabled && memberQuarterlyQuota > 0) {
    console.log(`✅ Using member override: ${memberQuarterlyQuota}`);
    baseGoal = Number(memberQuarterlyQuota);
  } else if (selectedQuarter) {
    const { data: periodData, error: periodError } = await supabaseClient
      .from('goals_by_period')
      .select('individual_goal')
      .eq('period_type', 'quarter')
      .eq('period_key', selectedQuarter)
      .maybeSingle();

    if (!periodError && periodData?.individual_goal > 0) {
      console.log(`✅ Using goals_by_period: ${periodData.individual_goal}`);
      baseGoal = Number(periodData.individual_goal);
    } else {
      const { data: globalData, error: globalError } = await supabaseClient
        .from('global_settings')
        .select('individual_quarterly_target')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!globalError && globalData?.individual_quarterly_target > 0) {
        console.log(`✅ Using global_settings fallback: ${globalData.individual_quarterly_target}`);
        baseGoal = Number(globalData.individual_quarterly_target);
      }
    }
  }

  if (baseGoal > 0 && memberId) {
    const { data: memberData, error } = await supabaseClient
      .from('sales_team')
      .select('is_new_member, new_member_start_date')
      .or(`id.eq.${memberId},linked_user_id.eq.${memberId}`)
      .maybeSingle();
      
    if (error) {
      console.error('Error fetching member:', error);
    } else if (memberData?.is_new_member && memberData?.new_member_start_date) {
      const effectiveGoal = getEffectiveQuarterGoalForMember(memberData, baseGoal / 3, selectedQuarter || 'current');
      console.log(`[resolveQuarterGoalForMember] Onboarding applied. BaseGoal: ${baseGoal}, EffectiveGoal: ${effectiveGoal}`);
      return effectiveGoal;
    }
  }

  console.log(`⚠️ No onboarding applied. Calculated baseGoal: ${baseGoal}`);
  return baseGoal;
}

export async function resolveMemberDashboardGoal({
  memberRow,
  periodKey,
  periodMode,
  supabaseClient = supabase
}) {
  console.log(`[resolveMemberDashboardGoal] Start: memberId=${memberRow?.id}, periodKey=${periodKey}, periodMode=${periodMode}`);

  let baseGoal = 0;

  if (memberRow?.monthly_quota_override_enabled) {
    const val = periodMode === 'month' ? (memberRow.monthly_quota || memberRow.monthlyQuota) : (memberRow.quarterly_quota || memberRow.quarterlyQuota);
    if (val > 0) {
      console.log(`✅ Using member override for ${periodMode}: ${val}`);
      baseGoal = Number(val);
    }
  }

  if (baseGoal === 0 && periodKey) {
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
      baseGoal = Number(periodData.individual_goal);
    }
  }

  if (baseGoal === 0) {
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
        baseGoal = Number(val);
      }
    }
  }

  let effectiveGoal = baseGoal;
  
  if (baseGoal > 0 && memberRow?.is_new_member && memberRow?.new_member_start_date) {
    if (periodMode === 'month') {
      effectiveGoal = getEffectiveGoalForMember(memberRow, baseGoal, 'month', periodKey);
      console.log(`[resolveMemberDashboardGoal] Onboarding applied (Month). BaseGoal: ${baseGoal}, Multiplier: ${effectiveGoal / baseGoal}, EffectiveGoal: ${effectiveGoal}`);
    } else {
      effectiveGoal = getEffectiveQuarterGoalForMember(memberRow, baseGoal / 3, periodKey);
      console.log(`[resolveMemberDashboardGoal] Onboarding applied (Quarter). BaseGoal: ${baseGoal}, EffectiveGoal: ${effectiveGoal}`);
    }
  } else {
    console.log(`⚠️ Returning standard computed baseGoal for ${periodMode}: ${baseGoal}`);
  }

  return effectiveGoal;
}
