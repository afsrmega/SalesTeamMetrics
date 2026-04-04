import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getCustomQuarter } from '@/lib/salesUtils';

export const useQuarterProgressData = (quarterGoal, userId) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const { quarterStart, quarterEnd } = getCustomQuarter();
      
      // 1. Generate Week Endings (Fridays) for the current quarter
      const weeks = [];
      let currentDate = new Date(quarterStart);
      
      // Advance to the first Friday if start is not a Friday
      while (currentDate.getDay() !== 5) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Collect all Fridays until quarterEnd
      while (currentDate <= quarterEnd) {
        const weekEnding = new Date(currentDate);
        weekEnding.setHours(23, 59, 59, 999);
        weeks.push(weekEnding);
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      const totalWeeks = weeks.length;
      const parsedQuarterGoal = parseFloat(quarterGoal) || 0;

      // 2. Get Team Member IDs
      const { data: teamMembers, error: teamError } = await supabase
        .from('sales_team')
        .select('id');

      if (teamError) throw teamError;
      
      const teamMemberIds = teamMembers.map(m => m.id);

      if (teamMemberIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // 3. Fetch Records
      const { data: records, error: fetchError } = await supabase
        .from('sales_records')
        .select('value, created_at')
        .in('sales_member_id', teamMemberIds)
        .gte('created_at', quarterStart.toISOString())
        .lte('created_at', quarterEnd.toISOString());

      if (fetchError) throw fetchError;

      // 4. Process data for each week
      const weeklyProgress = weeks.map((friday, index) => {
        const weekNumber = index + 1;
        
        const cumulativeGoal = totalWeeks > 0 
          ? (weekNumber / totalWeeks) * parsedQuarterGoal 
          : 0;

        const cumulativeAccomplished = records.reduce((sum, record) => {
          const recordDate = new Date(record.created_at);
          if (recordDate <= friday) {
            return sum + (parseFloat(record.value) || 0);
          }
          return sum;
        }, 0);

        const runRate = cumulativeGoal > 0 
          ? (cumulativeAccomplished / cumulativeGoal) * 100 
          : 0;

        const quarterAchievement = parsedQuarterGoal > 0 
          ? (cumulativeAccomplished / parsedQuarterGoal) * 100 
          : 0;

        return {
          weekEnding: friday,
          weekNumber,
          goal: cumulativeGoal,
          accomplished: cumulativeAccomplished,
          runRate,
          quarterAchievement,
          isFuture: friday > new Date() && (friday.getTime() - new Date().getTime() > 604800000)
        };
      });

      setData(weeklyProgress);
      setError(null);
    } catch (err) {
      console.error("Error fetching quarter progress data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [quarterGoal]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Listen for ANY change in sales_records and reload the progress
    const channel = supabase.channel('realtime-quarter-progress')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sales_records' }, 
        () => {
          console.log('Quarter progress data: Detected sales change, refreshing...');
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  return { weeklyData: data, loading, error, refetch: fetchData };
};