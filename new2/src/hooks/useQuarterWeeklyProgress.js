import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { addDays, format, getDay } from 'date-fns';

export const useQuarterWeeklyProgress = (memberId, quarterInfo, globalSettings, refreshTrigger = 0) => {
  const [weeklyData, setWeeklyData] = useState([]);
  const [totalWeeks, setTotalWeeks] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateProgress = useCallback(async () => {
    if (!memberId || !quarterInfo || !quarterInfo.quarterStart || !quarterInfo.quarterEnd || !globalSettings) return;

    setLoading(true);
    try {
      const quarterGoal = parseFloat(globalSettings.individual_quarterly_target) || 
                          parseFloat(globalSettings.team_quarterly_target) || 0;

      const { quarterStart, quarterEnd } = quarterInfo;

      const { data: records, error: fetchError } = await supabase
        .from('sales_records')
        .select('*')
        .eq('sales_member_id', memberId)
        .eq('is_valid', true)
        .eq('is_deleted', false)
        .gte('created_at', quarterStart.toISOString())
        .lte('created_at', quarterEnd.toISOString()); 

      if (fetchError) throw fetchError;

      const weeks = [];
      let currentLoopDate = new Date(quarterStart);
      
      const getNextFriday = (date) => {
         const day = getDay(date);
         const diff = (5 - day + 7) % 7; 
         if (diff === 0 && day === 5) return date;
         return addDays(date, diff);
      };

      let loopFriday = getNextFriday(currentLoopDate);
      let weekNum = 1;
      
      // Dynamically generate ALL weeks within the fiscal quarter
      while (loopFriday <= quarterEnd) {
         weeks.push({ 
             date: new Date(loopFriday), 
             num: weekNum 
         });
         loopFriday = addDays(loopFriday, 7);
         weekNum++;
      }
      
      const dynamicTotalWeeks = weeks.length || 1;
      setTotalWeeks(dynamicTotalWeeks);
      
      const today = new Date();

      const processedData = weeks.map((week) => {
          // Dynamic cumulative goal based on total generated weeks
          const cumulativeGoal = quarterGoal * (week.num / dynamicTotalWeeks);
          
          const endDateOfDay = new Date(week.date);
          endDateOfDay.setHours(23, 59, 59, 999);

          const salesUpToNow = (records || [])
            .filter(r => new Date(r.created_at) <= endDateOfDay)
            .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
          
          const cumulativeAccomplished = salesUpToNow;

          const runRate = cumulativeGoal > 0 ? (cumulativeAccomplished / cumulativeGoal) * 100 : 0;
          const quarterAchievement = quarterGoal > 0 ? (cumulativeAccomplished / quarterGoal) * 100 : 0;
          
          let isCurrentWeek = false;
          const currentWeekFriday = getNextFriday(today);
          if (week.date.toDateString() === currentWeekFriday.toDateString() || week.date.toDateString() === quarterEnd.toDateString() && today >= week.date) {
              isCurrentWeek = true;
          }

          return {
              weekEnding: format(week.date, 'MMM d, yyyy'),
              weekNumber: week.num,
              cumulativeGoal: cumulativeGoal, 
              accomplished: cumulativeAccomplished,
              runRate: runRate.toFixed(1),
              quarterAchievement: quarterAchievement.toFixed(1),
              isCurrentWeek
          };
      });

      setWeeklyData(processedData);
      setError(null);
    } catch (err) {
      console.error("Error in useQuarterWeeklyProgress:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [memberId, quarterInfo, globalSettings, refreshTrigger]); 

  useEffect(() => {
    calculateProgress();

    if (!memberId) return;

    const channel = supabase.channel(`quarter-weekly-progress-${memberId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` }, 
          () => {
            calculateProgress();
          }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [calculateProgress, memberId]); 

  return { weeklyData, loading, error, totalWeeks };
};