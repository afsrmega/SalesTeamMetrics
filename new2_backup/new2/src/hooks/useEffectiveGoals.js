import { useState, useEffect, useCallback } from 'react';
import { getEffectiveGoal, getEffectiveMemberGoal } from '@/lib/goalsService';

export function useEffectiveGoals(periodType, periodKey, memberId = null) {
  const [goals, setGoals] = useState({
    teamGoal: null,
    individualGoal: null,
    memberGoal: null,
    source: 'loading',
    memberSource: 'loading',
    overrideEnabled: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGoals = useCallback(async () => {
    if (!periodType || !periodKey) return;
    
    setLoading(true);
    try {
      const { teamGoal, individualGoal, source } = await getEffectiveGoal(periodType, periodKey);
      
      let memberGoal = individualGoal;
      let memberSource = source;
      let overrideEnabled = false;

      if (memberId) {
        const memberResult = await getEffectiveMemberGoal(memberId, periodType, periodKey);
        memberGoal = memberResult.goal;
        memberSource = memberResult.source;
        overrideEnabled = memberResult.overrideEnabled;
      }

      setGoals({
        teamGoal,
        individualGoal,
        memberGoal,
        source,
        memberSource,
        overrideEnabled
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching effective goals:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [periodType, periodKey, memberId]);

  useEffect(() => {
    fetchGoals();

    const handleGoalsUpdated = (event) => {
      const { detail } = event;
      if (detail && detail.periodType === periodType && detail.periodKey === periodKey) {
        console.log(`♻️ [useEffectiveGoals] Refetching goals triggered by 'goalsUpdated' event`);
        fetchGoals();
      } else if (!detail) {
        fetchGoals(); // fallback if no details provided
      }
    };

    const handleOverridesUpdated = () => {
      console.log(`♻️ [useEffectiveGoals] Refetching goals triggered by 'overridesUpdated' event`);
      fetchGoals();
    };

    window.addEventListener('goalsUpdated', handleGoalsUpdated);
    window.addEventListener('overridesUpdated', handleOverridesUpdated);
    
    return () => {
      window.removeEventListener('goalsUpdated', handleGoalsUpdated);
      window.removeEventListener('overridesUpdated', handleOverridesUpdated);
    };
  }, [fetchGoals, periodType, periodKey]);

  return { ...goals, loading, error, refetch: fetchGoals };
}