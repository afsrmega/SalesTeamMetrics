
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { 
  getProspectMetrics, 
  getTopProspects, 
  getTopClients, 
  getUrgentFollowUps, 
  getUpcomingFollowUps,
  getMonthlyQuota,
  getAchievedMTD
} from '@/lib/prospectsService';

export const useProspectsData = () => {
  const { user, isSalesMember, isAdmin } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pipelineMetrics, setPipelineMetrics] = useState({});
  const [topProspects, setTopProspects] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [urgentFollowUps, setUrgentFollowUps] = useState({ prospects: [], clients: [] });
  const [upcomingFollowUps, setUpcomingFollowUps] = useState({ prospects: [], clients: [] });
  
  const [monthlyQuota, setMonthlyQuota] = useState(null);
  const [achievedMTD, setAchievedMTD] = useState(0);
  const [quotaLoading, setQuotaLoading] = useState(true);

  const fetchProspects = useCallback(async () => {
    if (!user) return [];
    console.log('[fetchProspects] Start fetching...');
    setLoading(true);
    setQuotaLoading(true);
    try {
      let query = supabase.from('prospects').select('*, prospect_tags(tag_id, tags(*))');
      if (isSalesMember && !isAdmin) {
        query = query.eq('owner_user_id', user.id);
      }
      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      
      const fetchedProspects = data || [];
      console.log(`[fetchProspects] Data fetched, count: ${fetchedProspects.length}`);
      
      console.log('[fetchProspects] Calling setProspects...');
      setProspects(fetchedProspects);

      if (isSalesMember && !isAdmin) {
        const metrics = await getProspectMetrics(user.id);
        setPipelineMetrics(metrics);
        
        let topPQuery = supabase.from('prospects').select('*, prospect_tags(tag_id, tags(*))').eq('owner_user_id', user.id).eq('status', 'active').order('estimated_property_value', { ascending: false }).limit(10);
        const { data: topP } = await topPQuery;
        setTopProspects(topP || []);
        
        let topCQuery = supabase.from('clients').select('*, client_tags(tag_id, tags(*))').eq('owner_user_id', user.id).order('estimated_property_value', { ascending: false }).limit(10);
        const { data: topC } = await topCQuery;
        setTopClients(topC || []);
        
        const urgent = await getUrgentFollowUps(user.id);
        setUrgentFollowUps(urgent);
        
        const upcoming = await getUpcomingFollowUps(user.id, 7);
        setUpcomingFollowUps(upcoming);

        const currentMonth = new Date();
        const fetchedQuota = await getMonthlyQuota(user.id, currentMonth);
        const fetchedAchieved = await getAchievedMTD(user.id, currentMonth);
        
        setMonthlyQuota(fetchedQuota);
        setAchievedMTD(fetchedAchieved || 0);
      } else if (isAdmin) {
        let topCQuery = supabase.from('clients').select('*, client_tags(tag_id, tags(*))').order('estimated_property_value', { ascending: false }).limit(10);
        const { data: topC } = await topCQuery;
        setTopClients(topC || []);
      }

      console.log('[fetchProspects] Returning fresh data:', fetchedProspects);
      return fetchedProspects;
    } catch (err) {
      console.error('[fetchProspects] Error:', err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
      setQuotaLoading(false);
    }
  }, [user, isSalesMember, isAdmin]);

  useEffect(() => {
    fetchProspects();
    if (!user) return;

    const channel1 = supabase.channel('prospects_changes_p')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, () => fetchProspects())
      .subscribe();
      
    const channel2 = supabase.channel('prospects_changes_c')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchProspects())
      .subscribe();
      
    const channel3 = supabase.channel('prospects_changes_sales')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_records' }, () => fetchProspects())
      .subscribe();
      
    const channel4 = supabase.channel('prospects_changes_tags')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prospect_tags' }, () => fetchProspects())
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
      supabase.removeChannel(channel3);
      supabase.removeChannel(channel4);
    };
  }, [fetchProspects, user]);

  const effectiveQuota = monthlyQuota || 0;
  const gapToGoal = Math.max(0, effectiveQuota - achievedMTD);
  const hotCoveragePct = gapToGoal > 0 ? ((pipelineMetrics.hot_value || 0) / gapToGoal) * 100 : 0;
  const expectedCoveragePct = gapToGoal > 0 ? ((pipelineMetrics.expected_prospects || 0) / gapToGoal) * 100 : 0;

  return { 
    prospects, 
    loading, 
    error, 
    refetch: fetchProspects,
    pipelineMetrics,
    topProspects,
    topClients,
    urgentFollowUps,
    upcomingFollowUps,
    monthlyQuota,
    memberQuota: effectiveQuota, 
    achievedMTD,
    gapToGoal,
    hotCoveragePct,
    expectedCoveragePct,
    quotaLoading
  };
};
