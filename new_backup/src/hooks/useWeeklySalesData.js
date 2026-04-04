import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getCustomQuarter } from '@/lib/salesUtils';
import { getSalesRecordsByMemberAndDateRange } from '@/lib/salesService';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';

export const useWeeklySalesData = (memberId) => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWeeklyData = useCallback(async () => {
    if (!memberId) return;
    
    setLoading(true);
    try {
      const { quarterStart, quarterEnd } = getCustomQuarter();
      // getSalesRecordsByMemberAndDateRange already has eq('is_deleted', false) from Task 5
      const records = await getSalesRecordsByMemberAndDateRange(memberId, quarterStart, quarterEnd);
      
      const groupedData = {};
      
      records.forEach(record => {
        const recordDate = new Date(record.created_at);
        const weekStart = startOfWeek(recordDate, { weekStartsOn: 1 });
        const weekKey = weekStart.toISOString();
        
        if (!groupedData[weekKey]) {
          groupedData[weekKey] = {
            weekStart: weekStart,
            records: []
          };
        }
        groupedData[weekKey].records.push(record);
      });

      const sortedKeys = Object.keys(groupedData).sort();
      
      const results = sortedKeys.map((key, index) => {
        const weekGroup = groupedData[key];
        const weekStart = weekGroup.weekStart;
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        
        const totalSales = weekGroup.records.reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
        const count = weekGroup.records.length;
        const average = count > 0 ? totalSales / count : 0;
        
        let residentialCount = 0;
        let commercialCount = 0;
        
        weekGroup.records.forEach(r => {
           const type = (r.property_type || '').toLowerCase().trim();
           if (type === 'residential' || type === 'residencial') {
             residentialCount++;
           } else {
             commercialCount++;
           }
        });

        return {
          id: key,
          weekLabel: `Semana ${index + 1}`,
          dateRange: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`,
          totalSales,
          count,
          average,
          residentialCount,
          commercialCount
        };
      });

      setWeeklyData(results);
      setError(null);
    } catch (err) {
      console.error("Error fetching weekly sales data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    if (memberId) {
      fetchWeeklyData();

      const channel = supabase.channel(`weekly-sales-${memberId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` }, 
          () => {
            fetchWeeklyData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [memberId, fetchWeeklyData]);

  return { weeklyData, loading, error };
};