
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { isBefore, addDays, addMinutes, isAfter, isWithinInterval } from 'date-fns';

export const useReminders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [overdueList, setOverdueList] = useState([]);
  const [upcomingList, setUpcomingList] = useState([]);
  const [notifiedIds, setNotifiedIds] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchAndCheckReminders = async () => {
      try {
        const { data, error } = await supabase
          .from('client_touchpoints')
          .select('*, clients(prospect_name, estimated_property_value)')
          .eq('owner_user_id', user.id)
          .in('status', ['scheduled', 'rescheduled']);
          
        if (error) throw error;
        
        const now = new Date();
        const tomorrow = addDays(now, 1);
        const in30Mins = addMinutes(now, 30);
        
        const overdue = data.filter(t => isBefore(new Date(t.due_at), now));
        const upcoming = data.filter(t => !isBefore(new Date(t.due_at), now));
        
        setOverdueList(overdue);
        setUpcomingList(upcoming);

        const toNotify = data.filter(t => {
          if (notifiedIds.has(t.id)) return false;
          const due = new Date(t.due_at);
          
          const is1DayBefore = isWithinInterval(due, { start: now, end: tomorrow }) && isAfter(due, in30Mins);
          const is30MinBefore = isWithinInterval(due, { start: now, end: in30Mins });
          
          return is1DayBefore || is30MinBefore;
        });

        toNotify.forEach(t => {
          toast({
            title: `Rapport follow-up due for ${t.clients?.prospect_name || 'Client'}`,
            description: `Step ${t.step} - ${t.purpose}`,
          });
          setNotifiedIds(prev => new Set([...prev, t.id]));
        });

      } catch (err) {
        console.error("Failed to fetch reminders:", err);
      }
    };

    fetchAndCheckReminders();
    const intervalId = setInterval(fetchAndCheckReminders, 5 * 60 * 1000); // 5 mins

    return () => clearInterval(intervalId);
  }, [user, toast, notifiedIds]);

  return { overdueList, upcomingList };
};
