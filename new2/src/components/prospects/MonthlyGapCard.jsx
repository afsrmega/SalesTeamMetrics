import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Trophy, TrendingDown } from 'lucide-react';
import { getMonthlyQuota, getAchievedMTD } from '@/lib/prospectsService';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { formatCurrency } from '@/lib/salesUtils';

const MonthlyGapCard = ({ gap, quota, achieved, isLoading: parentLoading }) => {
  const { user } = useAuth();
  const [monthlyQuota, setMonthlyQuota] = useState(quota || null);
  const [achievedMTD, setAchievedMTD] = useState(achieved || 0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const currentMonth = new Date();
        const fetchedQuota = await getMonthlyQuota(user.id, currentMonth);
        const fetchedAchieved = await getAchievedMTD(user.id, currentMonth);
        
        setMonthlyQuota(fetchedQuota);
        setAchievedMTD(fetchedAchieved);
      } catch (error) {
        console.error("Error fetching monthly metrics", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Use local loading state, but sync with parent if provided
  const isDataLoading = loading || parentLoading;
  
  const hasQuota = monthlyQuota !== null && monthlyQuota > 0;
  const gapToGoal = hasQuota ? Math.max(0, monthlyQuota - achievedMTD) : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5" /> Meta Mensual
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Trophy className="h-4 w-4"/> Meta:
              </span>
              <span className="font-medium">
                {hasQuota ? formatCurrency(monthlyQuota) : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4"/> Logrado MTD:
              </span>
              <span className="font-medium text-green-600">
                {formatCurrency(achievedMTD)}
              </span>
            </div>
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Faltante:</span>
                <span className={`text-xl font-bold ${hasQuota && gapToGoal === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  {!hasQuota 
                    ? 'Meta no configurada' 
                    : (gapToGoal > 0 ? formatCurrency(gapToGoal) : '¡Meta Alcanzada!')}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyGapCard;