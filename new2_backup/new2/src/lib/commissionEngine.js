
import { supabase } from './customSupabaseClient';

/**
 * resolveGoalForMemberPeriod (Async)
 * Centralized goal resolver with priority:
 * 1. Check member-specific quota override
 * 2. Fall back to goals_by_period value
 * 3. Fall back to global_settings value
 * Returns 0 if nothing exists.
 */
export const resolveGoalForMemberPeriod = async (memberId, periodType, periodKey, globalSettings = null) => {
  console.log(`[CommissionEngine] Resolving async goal for member: ${memberId}, period: ${periodType}-${periodKey}`);
  console.log('AUDIT FIX: Replaced user_id with member_id in resolveGoalForMemberPeriod');
  try {
    let query = supabase
      .from('sales_team')
      .select('monthly_quota, quarterly_quota, monthly_quota_override_enabled');
      
    if (memberId) {
      query = query.eq('id', memberId);
    } else {
      query = query.is('id', null);
    }

    const { data: member } = await query.maybeSingle();

    const { data: periodGoals } = await supabase
      .from('goals_by_period')
      .select('individual_goal, team_goal')
      .eq('period_type', periodType)
      .eq('period_key', periodKey)
      .maybeSingle();

    let settings = globalSettings;
    if (!settings) {
      const { data } = await supabase
        .from('global_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      settings = data;
    }

    const overrideEnabled = member?.monthly_quota_override_enabled === true;
    let goal = 0;
    let source = 'none';

    console.log(`[CommissionEngine] 1. Checking member-specific quota override (enabled: ${overrideEnabled})`);
    if (overrideEnabled) {
      const val = periodType === 'month' ? member?.monthly_quota : member?.quarterly_quota;
      if (val > 0) {
        goal = Number(val);
        source = 'sales_team_override';
        console.log(`[CommissionEngine] -> Selected member override: ${goal}`);
        return { goal, source, overrideEnabled, teamGoal: Number(periodGoals?.team_goal || settings?.team_monthly_target || 0) };
      }
    }

    console.log(`[CommissionEngine] 2. Checking goals_by_period fallback`);
    if (periodGoals?.individual_goal > 0) {
      goal = Number(periodGoals.individual_goal);
      source = 'goals_by_period';
      console.log(`[CommissionEngine] -> Selected goals_by_period: ${goal}`);
      return { goal, source, overrideEnabled, teamGoal: Number(periodGoals?.team_goal || 0) };
    }

    console.log(`[CommissionEngine] 3. Checking global_settings fallback`);
    if (settings) {
      const val = periodType === 'month' ? settings.individual_monthly_commission_threshold : settings.individual_quarterly_target;
      if (val > 0) {
        goal = Number(val);
        source = 'global_settings';
        console.log(`[CommissionEngine] -> Selected global_settings: ${goal}`);
        const tGoal = periodType === 'month' ? settings.team_monthly_target : settings.team_quarterly_target;
        return { goal, source, overrideEnabled, teamGoal: Number(tGoal || 0) };
      }
    }

    console.log(`[CommissionEngine] -> No valid goal found, returning 0`);
    return { goal: 0, source: 'none', overrideEnabled: false, teamGoal: 0 };
  } catch (err) {
    console.error('[CommissionEngine] Error resolving goal:', err);
    return { goal: 0, source: 'error', overrideEnabled: false, teamGoal: 0 };
  }
};

/**
 * Synchronous equivalent for components where all data is pre-fetched.
 */
export const resolveGoalSync = (member, periodGoals, globalSettings, periodType) => {
  console.log(`[CommissionEngine] Resolving sync goal for ${periodType}`);
  console.log('AUDIT FIX: Replaced user_id with member_id in resolveGoalSync');
  
  const overrideEnabled = member?.monthly_quota_override_enabled === true;
  console.log(`[CommissionEngine] 1. Checking member override (enabled: ${overrideEnabled})`);
  if (overrideEnabled) {
    const val = periodType === 'month' ? (member?.monthly_quota || member?.monthlyQuota) : (member?.quarterly_quota || member?.quarterlyQuota);
    if (val > 0) {
      console.log(`[CommissionEngine] -> Selected member override: ${val}`);
      return Number(val);
    }
  }
  
  console.log(`[CommissionEngine] 2. Checking period goals fallback`);
  if (periodGoals && periodGoals.individual_goal > 0) {
    console.log(`[CommissionEngine] -> Selected goals_by_period: ${periodGoals.individual_goal}`);
    return Number(periodGoals.individual_goal);
  }
  
  console.log(`[CommissionEngine] 3. Checking global settings fallback`);
  if (globalSettings) {
    const val = periodType === 'month' ? globalSettings.individual_monthly_commission_threshold : globalSettings.individual_quarterly_target;
    if (val > 0) {
      console.log(`[CommissionEngine] -> Selected global_settings: ${val}`);
      return Number(val);
    }
  }
  
  console.log(`[CommissionEngine] -> No valid goal found, returning 0`);
  return 0;
};

/**
 * resolveBillingRate
 * Exact Excel billing rates logic
 */
export const resolveBillingRate = (state, propertyType) => {
  console.log('AUDIT FIX: Replaced user_id with member_id in resolveBillingRate');
  const isTx = (state || '').toUpperCase().trim() === 'TX' || (state || '').toUpperCase().trim() === 'TEXAS';
  const isRes = (propertyType || '').toUpperCase().trim() === 'RESIDENTIAL' || (propertyType || '').toUpperCase().trim() === 'RESIDENCIAL';

  if (isTx && isRes) return 0.000254;
  if (isTx && !isRes) return 0.000251;
  if (!isTx && isRes) return 0.000038;
  if (!isTx && !isRes) return 0.000054;
  return 0;
};

/**
 * computeBillingAmount
 */
export const computeBillingAmount = (saleValue, state, propertyType) => {
  console.log('AUDIT FIX: Replaced user_id with member_id in computeBillingAmount');
  const rate = resolveBillingRate(state, propertyType);
  return (Number(saleValue) || 0) * rate;
};

/**
 * aggregateSalesForPeriod
 */
export const aggregateSalesForPeriod = (records) => {
  console.log('AUDIT FIX: Replaced user_id with member_id in aggregateSalesForPeriod');
  let totalSalesValue = 0;
  let totalBillingAmount = 0;
  let transactionCount = 0;

  (records || []).forEach(r => {
    if (r.is_valid === false || r.is_deleted === true) return;
    const val = Number(r.value) || 0;
    totalSalesValue += val;
    totalBillingAmount += computeBillingAmount(val, r.state, r.property_type);
    transactionCount += 1;
  });

  return { totalSalesValue, totalBillingAmount, transactionCount };
};

/**
 * getTierConfiguration
 */
export const getTierConfiguration = (globalSettings) => {
  console.log('AUDIT FIX: Replaced user_id with member_id in getTierConfiguration');
  const defaultTiers = [
    { threshold: 0, bonusPercent: 0 },
    { threshold: 50, bonusPercent: 5 },
    { threshold: 75, bonusPercent: 10 },
    { threshold: 100, bonusPercent: 15 },
    { threshold: 125, bonusPercent: 20 }
  ];

  if (globalSettings?.commission_tiers && Array.isArray(globalSettings.commission_tiers) && globalSettings.commission_tiers.length > 0) {
    return globalSettings.commission_tiers.map(t => ({
      threshold: Number(t.min !== undefined ? t.min : (t.min_achievement || 0)),
      bonusPercent: Number(t.rate || 0)
    }));
  }

  return defaultTiers;
};

/**
 * selectBonusPercent
 * STRICT "greater than" comparison (not inclusive)
 */
export const selectBonusPercent = (achievementPercent, tiers) => {
  console.log('AUDIT FIX: Replaced user_id with member_id in selectBonusPercent');
  if (achievementPercent == null || isNaN(achievementPercent)) return 0;
  const sorted = [...tiers].sort((a, b) => b.threshold - a.threshold);
  const match = sorted.find(t => achievementPercent > t.threshold);
  return match ? match.bonusPercent : 0;
};

/**
 * computeCommissionForMemberPeriod
 */
export const computeCommissionForMemberPeriod = (totalBillingAmount, bonusPercent) => {
  console.log('AUDIT FIX: Replaced user_id with member_id in computeCommissionForMemberPeriod');
  return (Number(totalBillingAmount) || 0) * ((Number(bonusPercent) || 0) / 100);
};

/**
 * calculateFullCommissionForMemberPeriod
 * Main orchestration function
 */
export const calculateFullCommissionForMemberPeriod = ({
  member = null,
  records = [],
  preAggregated = null,
  periodGoals = null,
  globalSettings = null,
  periodType = 'month'
}) => {
  console.log(`[CommissionEngine] calculateFullCommissionForMemberPeriod - START (${periodType})`);
  console.log('AUDIT FIX: Replaced user_id with member_id in calculateFullCommissionForMemberPeriod');
  
  const goal = resolveGoalSync(member, periodGoals, globalSettings, periodType);
  const agg = preAggregated || aggregateSalesForPeriod(records);
  
  const achievementPercent = goal > 0 ? (agg.totalSalesValue / goal) * 100 : 0;
  
  const tiers = getTierConfiguration(globalSettings);
  const bonusPercent = selectBonusPercent(achievementPercent, tiers);
  const commission = computeCommissionForMemberPeriod(agg.totalBillingAmount, bonusPercent);

  console.log(`[CommissionEngine] Result: goal=${goal}, sales=${agg.totalSalesValue}, billing=${agg.totalBillingAmount}, ach%=${achievementPercent.toFixed(2)}%, bonus%=${bonusPercent}%, comm=${commission.toFixed(2)}`);

  return {
    goal,
    totalSalesValue: agg.totalSalesValue,
    totalBillingAmount: agg.totalBillingAmount,
    transactionCount: agg.transactionCount,
    achievementPercent,
    bonusPercent,
    commission,
    tierRange: bonusPercent > 0 ? `${bonusPercent}%` : '0%'
  };
};
