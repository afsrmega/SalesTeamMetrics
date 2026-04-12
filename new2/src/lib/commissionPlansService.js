import { supabase } from '@/lib/customSupabaseClient';

export const getCommissionPlan = async (userId, quarterKey) => {
  const { data, error } = await supabase
    .from('commission_plans')
    .select('*')
    .eq('owner_user_id', userId)
    .eq('quarter_key', quarterKey)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const upsertCommissionPlan = async (
  userId, quarterKey, month1Key, month2Key, month3Key,
  plannedSalesTxM1, plannedSalesTxM2, plannedSalesTxM3,
  plannedSalesOutM1, plannedSalesOutM2, plannedSalesOutM3,
  billingPropertyTypeMode,
  goalOverrideM1, goalOverrideM2, goalOverrideM3,
  includeResidential, notes
) => {
  const payload = {
    owner_user_id: userId,
    quarter_key: quarterKey,
    month_1_key: month1Key,
    month_2_key: month2Key,
    month_3_key: month3Key,
    planned_sales_tx_m1: Math.max(0, plannedSalesTxM1 || 0),
    planned_sales_tx_m2: Math.max(0, plannedSalesTxM2 || 0),
    planned_sales_tx_m3: Math.max(0, plannedSalesTxM3 || 0),
    planned_sales_out_m1: Math.max(0, plannedSalesOutM1 || 0),
    planned_sales_out_m2: Math.max(0, plannedSalesOutM2 || 0),
    planned_sales_out_m3: Math.max(0, plannedSalesOutM3 || 0),
    billing_property_type_mode: billingPropertyTypeMode || 'Commercial',
    goal_override_m1: goalOverrideM1,
    goal_override_m2: goalOverrideM2,
    goal_override_m3: goalOverrideM3,
    include_residential: includeResidential,
    notes: notes || '',
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('commission_plans')
    .upsert(payload, { onConflict: 'owner_user_id,quarter_key' })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCommissionPlan = async (planId) => {
  const { error } = await supabase
    .from('commission_plans')
    .delete()
    .eq('id', planId);
  if (error) throw error;
};

export const listCommissionPlans = async (userId) => {
  const { data, error } = await supabase
    .from('commission_plans')
    .select('*')
    .eq('owner_user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};