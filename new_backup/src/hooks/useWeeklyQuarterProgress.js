import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getWeeklyQuarterData } from '@/lib/salesService';
import { addDays, isAfter, isBefore, format, endOfWeek } from 'date-fns';

export const useWeeklyQuarterProgress = (memberId, quarterInfo, quarterTarget) => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateWeeks = useCallback(async () => {
    if (!memberId || !quarterInfo || !quarterTarget) return;

    setLoading(true);
    try {
      const { quarterStart, quarterEnd } = quarterInfo;
      const records = await getWeeklyQuarterData(memberId, quarterStart, quarterEnd);

      // Generate all weeks in the quarter
      const weeks = [];
      let currentWeekStart = new Date(quarterStart);
      
      // Align to the first Sunday logic if needed, but standard quarters are usually contiguous
      // We'll iterate by adding 7 days until we exceed quarterEnd
      // Week 1 starts at quarterStart.
      
      let weekNum = 1;
      let loopDate = new Date(quarterStart);
      
      // Calculate total weeks in quarter for goal distribution
      // Estimate total weeks roughly to distribute goal evenly
      const diffTime = Math.abs(quarterEnd - quarterStart);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      const totalWeeksEstimated = Math.ceil(diffDays / 7);
      
      // Recalculate exact weeks loop to be sure
      const tempWeeks = [];
      while (isBefore(loopDate, quarterEnd) || loopDate.getTime() === quarterEnd.getTime()) {
         let weekEnding = endOfWeek(loopDate, { weekStartsOn: 1 }); // Sunday
         if (isAfter(weekEnding, quarterEnd)) {
             weekEnding = quarterEnd; // Cap at quarter end
         }
         tempWeeks.push({ start: new Date(loopDate), end: weekEnding, num: weekNum });
         loopDate = addDays(weekEnding, 1); // Next week starts day after Sunday
         weekNum++;
         if (isAfter(loopDate, quarterEnd)) break;
      }
      
      const totalWeeks = tempWeeks.length;
      const weeklyGoalAmount = parseFloat(quarterTarget) / totalWeeks;

      let cumulativeAccomplished = 0;
      let cumulativeGoal = 0;

      const processedData = tempWeeks.map((week) => {
          cumulativeGoal += weeklyGoalAmount;
          
          // Sum sales for this specific week
          const weekSales = records
            .filter(r => {
                const d = new Date(r.created_at);
                // Inclusive of start and end of this week segment
                return d >= week.start && d <= week.end; // Simple inclusive check
            })
            .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);

          cumulativeAccomplished += weekSales;
          
          const runRate = cumulativeGoal > 0 ? (cumulativeAccomplished / cumulativeGoal) * 100 : 0;
          const quarterAchievement = parseFloat(quarterTarget) > 0 ? (cumulativeAccomplished / parseFloat(quarterTarget)) * 100 : 0;

          return {
              weekEnding: format(week.end, 'MMM d, yyyy'),
              weekNum: week.num,
              goalCumulative: cumulativeGoal,
              accomplishedCumulative: cumulativeAccomplished,
              runRate: runRate.toFixed(1),
              quarterAchievement: quarterAchievement.toFixed(1)
          };
      });

      setWeeklyData(processedData);
      setError(null);
    } catch (err) {
      console.error("Error in useWeeklyQuarterProgress:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [memberId, quarterInfo, quarterTarget]);

  useEffect(() => {
    calculateWeeks();

    const channel = supabase.channel(`quarter-progress-${memberId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` }, 
          () => {
            calculateWeeks();
          }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [calculateWeeks, memberId]);

  return { weeklyData, loading, error };
};