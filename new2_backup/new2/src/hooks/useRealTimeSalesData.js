
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { fetchGlobalSettingsData, fetchSalesTeamData, syncMemberMonthlyMetrics } from '@/lib/salesService';
import { useToast } from '@/components/ui/use-toast';

export const useRealTimeSalesData = (userId) => {
  console.log('AUDIT FIX: useRealTimeSalesData now uses correct member identifiers');
  const { toast } = useToast();
  const [salesTeam, setSalesTeam] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [settings, team, { data: records }] = await Promise.all([
        fetchGlobalSettingsData(userId),
        fetchSalesTeamData(userId),
        supabase.from('sales_records').select('*').eq('is_valid', true).eq('is_deleted', false).order('created_at', { ascending: false }) // Task 6 filter
      ]);

      setGlobalSettings(settings);
      setSalesTeam(team || []);
      setSalesRecords(records || []);
      setError(null);
    } catch (err) {
      console.error("Error fetching real-time data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('consolidated-realtime-sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_settings' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_team' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_records' }, async (payload) => {
        // Handle Toast for Invalidations
        if (payload.eventType === 'UPDATE' && payload.old && payload.new) {
            if (payload.old.is_valid === true && payload.new.is_valid === false) {
                toast({
                    title: "Sale Invalidated",
                    description: "One of your sales was marked as invalidated by the admin.",
                    variant: "destructive",
                });
            }
        }

        const memberId = payload.new?.sales_member_id || payload.old?.sales_member_id;
        if (memberId) {
          try {
            await syncMemberMonthlyMetrics(memberId);
            fetchData();
          } catch (err) {
            console.error('Error syncing metrics from realtime listener:', err);
          }
        } else {
            fetchData();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, toast]);

  return { 
    salesTeam, 
    salesRecords,
    globalSettings, 
    loading, 
    error, 
    refresh: fetchData 
  };
};
