import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { calculateMonthlyCommission } from '@/lib/commissionCalculationUtils';

export const useCommissionCalculation = (memberId, quarterStart, quarterEnd, quota, globalSettings) => {
  const [result, setResult] = useState({
    commissionAmount: 0,
    quotaPercentage: 0,
    appliedRate: 0,
    tierRange: "Loading...",
    billingAmount: 0,
    achievedQtd: 0,
    loading: true
  });

  const startMs = quarterStart?.getTime();
  const endMs = quarterEnd?.getTime();
  const tiersString = JSON.stringify(globalSettings?.commission_tiers || []);

  useEffect(() => {
    let isMounted = true;

    const fetchCommissionData = async () => {
      if (!memberId || !quarterStart || !quarterEnd || !globalSettings) {
        if (isMounted) setResult(prev => ({ ...prev, loading: false }));
        return;
      }

      if (isMounted) setResult(prev => ({ ...prev, loading: true }));

      try {
        const { data, error } = await supabase
          .from('sales_records')
          .select('value')
          .eq('sales_member_id', memberId)
          .eq('is_valid', true)
          .eq('is_deleted', false)
          .gte('created_at', quarterStart.toISOString())
          .lte('created_at', quarterEnd.toISOString())
          .neq('property_type', 'Residential')
          .neq('property_type', 'Residencial');

        if (error) throw error;

        const achievedQtd = (data || []).reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
        const targetQuota = parseFloat(quota) || 1;
        const tiers = globalSettings?.commission_tiers || [];

        const commissionResult = calculateMonthlyCommission({
          totalSalesOverride: achievedQtd,
          billingBaseOverride: achievedQtd,
          monthlyGoal: targetQuota,
          commissionTiers: tiers
        });

        if (isMounted) {
          setResult({
            commissionAmount: commissionResult.estimatedCommission,
            quotaPercentage: commissionResult.achievementPct,
            appliedRate: commissionResult.appliedRate,
            tierRange: `${commissionResult.appliedRate}%`,
            billingAmount: achievedQtd, 
            achievedQtd,
            loading: false
          });
        }
      } catch (err) {
        console.error("Error calculating QTD commission:", err);
        if (isMounted) {
          setResult(prev => ({ ...prev, loading: false, tierRange: "Error" }));
        }
      }
    };

    fetchCommissionData();

    if (memberId) {
      const channel = supabase.channel(`commission-${memberId}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` },
          () => {
            fetchCommissionData();
          }
        ).subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => { isMounted = false; };
  }, [memberId, startMs, endMs, quota, tiersString]);

  return result;
};