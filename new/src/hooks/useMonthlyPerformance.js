import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useMonthlyPerformance = (memberId, monthStart, monthEnd) => {
  const [achieved_mtd_with_residential, setAchievedWith] = useState(0);
  const [achieved_mtd_excluding_residential, setAchievedExcl] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId || !monthStart || !monthEnd) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sales_records')
          .select('value, property_type')
          .eq('sales_member_id', memberId)
          .eq('is_valid', true)
          .eq('is_deleted', false) // Task 6
          .gte('created_at', monthStart.toISOString())
          .lte('created_at', monthEnd.toISOString());

        if (error) throw error;

        let totalWithResidential = 0;
        let totalExcludingResidential = 0;

        (data || []).forEach(record => {
          const val = parseFloat(record.value) || 0;
          totalWithResidential += val;
          
          if (record.property_type !== 'Residential' && record.property_type !== 'Residencial') {
            totalExcludingResidential += val;
          }
        });

        setAchievedWith(totalWithResidential);
        setAchievedExcl(totalExcludingResidential);
      } catch (err) {
        console.error("Error fetching monthly performance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase.channel(`monthly-perf-hook-${memberId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` },
        () => { fetchData(); }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [memberId, monthStart, monthEnd]);

  return { 
    achieved_mtd_with_residential, 
    achieved_mtd_excluding_residential, 
    loading 
  };
};