import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useQuarterPerformance = (memberId, quarterStart, quarterEnd) => {
  const [achieved_qtd_with_residential, setAchievedWith] = useState(0);
  const [achieved_qtd_excluding_residential, setAchievedExcl] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId || !quarterStart || !quarterEnd) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('sales_records')
          .select('value, property_type')
          .eq('sales_member_id', memberId)
          .eq('is_valid', true)
          .eq('is_deleted', false)
          .gte('created_at', quarterStart.toISOString())
          .lte('created_at', quarterEnd.toISOString());

        if (error) throw error;

        let totalSalesWithRes = 0;
        let totalSalesExclRes = 0;

        (data || []).forEach(record => {
          const val = parseFloat(record.value) || 0;
          const pType = record.property_type ? record.property_type.toLowerCase() : '';
          const isRes = pType === 'residential' || pType === 'residencial';

          totalSalesWithRes += val;
          if (!isRes) {
            totalSalesExclRes += val;
          }
        });

        setAchievedWith(totalSalesWithRes);
        setAchievedExcl(totalSalesExclRes); 
      } catch (err) {
        console.error("Error fetching quarter performance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const channel = supabase.channel(`quarter-perf-hook-${memberId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` },
        () => { fetchData(); }
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [memberId, quarterStart, quarterEnd]);

  return { 
    achieved_qtd_with_residential, 
    achieved_qtd_excluding_residential, 
    loading 
  };
};