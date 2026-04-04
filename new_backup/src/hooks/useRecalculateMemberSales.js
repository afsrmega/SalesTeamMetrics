import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { syncMemberMonthlyMetrics } from '@/lib/salesService';

export const useRecalculateMemberSales = (memberId) => {
  useEffect(() => {
    if (!memberId) return;

    // Use the robust shared service function to ensure consistency across the app
    const performSync = async () => {
       try {
         await syncMemberMonthlyMetrics(memberId);
       } catch (err) {
         console.error("Auto-recalculation failed:", err);
       }
    };

    // Initial calculation on mount
    performSync();

    // Listen for changes
    const channel = supabase
      .channel(`sales-records-changes-${memberId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_records',
          filter: `sales_member_id=eq.${memberId}`
        },
        () => {
          console.log("Change detected in sales_records, recalculating...");
          performSync();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId]);
};