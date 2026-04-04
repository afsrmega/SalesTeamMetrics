import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { getPropertyTypeTotals } from '@/lib/salesService';

export const usePropertyTypeComparison = () => {
  const [data, setData] = useState({ residential: 0, commercial: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchComparisonData = useCallback(async () => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Fetch all sales records for the current month
      const { data: records, error: fetchError } = await supabase
        .from('sales_records')
        .select('value, property_type')
        .gte('created_at', startOfMonth);

      if (fetchError) throw fetchError;

      // Calculate totals using the service helper
      const totals = getPropertyTypeTotals(records || []);
      
      setData(totals);
      setError(null);
    } catch (err) {
      console.error("Error fetching property type comparison:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComparisonData();

    // Real-time subscription for immediate updates
    const channel = supabase.channel('property-type-comparison')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sales_records' }, 
        () => {
            fetchComparisonData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComparisonData]);

  return { comparisonData: data, loading, error };
};