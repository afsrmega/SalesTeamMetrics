import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getMonthlyWeeklySalesData } from '@/lib/salesService';
import { 
  addDays, 
  isBefore, 
  format, 
  startOfMonth, 
  endOfMonth, 
  getDay
} from 'date-fns';

export const useMonthlyWeeklyProgress = (memberId, globalSettings, refreshTrigger = 0) => {
  const [weeks, setWeeks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateProgress = useCallback(async () => {
    if (!memberId || !globalSettings) return;

    setIsLoading(true);
    try {
      const monthlyGoal = parseFloat(globalSettings.team_monthly_target) || 0;
      
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // getMonthlyWeeklySalesData already updated to exclude deleted
      const records = await getMonthlyWeeklySalesData(memberId, monthStart, monthEnd);

      const fridays = [];
      let currentLoopDate = new Date(monthStart);
      
      const getNextFriday = (date) => {
         const day = getDay(date);
         const diff = (5 - day + 7) % 7; 
         if (diff === 0 && day === 5) return date; 
         return addDays(date, diff);
      };

      let loopFriday = getNextFriday(currentLoopDate);
      let weekNum = 1;

      while (isBefore(loopFriday, monthEnd) || loopFriday.getTime() === monthEnd.getTime()) {
         fridays.push({ 
             date: new Date(loopFriday), 
             num: weekNum 
         });
         loopFriday = addDays(loopFriday, 7);
         weekNum++;
      }
      
      const totalWeeks = fridays.length > 0 ? fridays.length : 4;
      const today = new Date();

      const processedWeeks = fridays.map((week) => {
          const cumulativeGoal = monthlyGoal * (week.num / totalWeeks);
          
          const fridayEndOfDay = new Date(week.date);
          fridayEndOfDay.setHours(23, 59, 59, 999);

          const salesUpToNow = records
            .filter(r => new Date(r.created_at) <= fridayEndOfDay)
            .reduce((sum, r) => sum + (parseFloat(r.value) || 0), 0);
          
          const cumulativeAccomplished = salesUpToNow;
          const runRate = cumulativeGoal > 0 ? (cumulativeAccomplished / cumulativeGoal) * 100 : 0;
          const monthAchievement = monthlyGoal > 0 ? (cumulativeAccomplished / monthlyGoal) * 100 : 0;
          
          let isCurrent = false;
          const currentWeekFriday = getNextFriday(today);
          if (week.date.toDateString() === currentWeekFriday.toDateString()) {
              isCurrent = true;
          }

          return {
              weekEnding: format(week.date, 'MMM d, yyyy'),
              weekNumber: week.num,
              cumulativeGoal: cumulativeGoal, 
              accomplished: cumulativeAccomplished,
              runRate: runRate.toFixed(1),
              monthAchievement: monthAchievement.toFixed(1),
              isCurrent
          };
      });

      setWeeks(processedWeeks);
      setError(null);
    } catch (err) {
      console.error("Error in useMonthlyWeeklyProgress:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [memberId, globalSettings, refreshTrigger]); 

  useEffect(() => {
    calculateProgress();

    const channel = supabase.channel(`monthly-weekly-progress-${memberId}`)
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
  }, [calculateProgress, memberId, globalSettings]);

  return { weeks, isLoading, error };
};