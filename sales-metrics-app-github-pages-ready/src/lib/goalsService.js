
import { supabase } from './customSupabaseClient';

export const getGoalsByPeriod = async (periodType, periodKey, globalSettings) => {
  try {
    const { data, error } = await supabase
      .from('goals_by_period')
      .select('*')
      .eq('period_type', periodType)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (error) {
      console.error('Error fetching period goals:', error);
      throw error;
    }

    if (data) {
      return {
        team_goal: parseFloat(data.team_goal) || 0,
        individual_goal: parseFloat(data.individual_goal) || 0,
        isCustom: true
      };
    }

    // Fallback to global settings
    if (periodType === 'quarter') {
      return {
        team_goal: parseFloat(globalSettings?.team_quarterly_target) || 0,
        individual_goal: parseFloat(globalSettings?.individual_quarterly_target) || 0,
        isCustom: false
      };
    } else {
      return {
        team_goal: parseFloat(globalSettings?.team_monthly_target) || 0,
        individual_goal: parseFloat(globalSettings?.individual_monthly_commission_threshold) || 0,
        isCustom: false
      };
    }
  } catch (error) {
    console.error('Failed to get goals by period:', error);
    return { team_goal: 0, individual_goal: 0, isCustom: false };
  }
};

export const saveGoalsByPeriod = async (periodType, periodKey, teamGoal, individualGoal) => {
  try {
    const payload = {
      period_type: periodType,
      period_key: periodKey,
      team_goal: parseFloat(teamGoal) || 0,
      individual_goal: parseFloat(individualGoal) || 0,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('goals_by_period')
      .upsert(payload, { onConflict: 'period_key' })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving period goals:', error);
    throw error;
  }
};
