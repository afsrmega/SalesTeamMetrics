import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/salesUtils";
import { useQuarterPerformance } from "@/hooks/useQuarterPerformance";

const QuarterPerformanceCard = ({ quarterStart, quarterEnd, memberId, globalSettings }) => {
  const { 
    achieved_qtd_with_residential, 
    achieved_qtd_excluding_residential, 
    loading 
  } = useQuarterPerformance(memberId, quarterStart, quarterEnd);

  // Extract individual_quarterly_target from globalSettings for calculation
  const individualQuarterlyTarget = parseFloat(globalSettings?.individual_quarterly_target || 0);

  // Use achieved_qtd_with_residential for percentage calculation (includes residential)
  const percentage = individualQuarterlyTarget > 0 
    ? (achieved_qtd_with_residential / individualQuarterlyTarget) * 100 
    : 0;

  return (
    <Card className="h-full shadow-md border-t-4 border-t-custom-secondary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-custom-secondary">
          <TrendingUp className="mr-2 h-5 w-5" /> Rendimiento Trimestral QTD
        </CardTitle>
        <CardDescription>Resumen de Logros</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin h-8 w-8 text-custom-secondary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase">Logrado QTD (Total)</p>
                <p className="text-2xl font-bold text-custom-text">
                  {formatCurrency(achieved_qtd_with_residential)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase">Meta Ind. (Total)</p>
                <p className="text-xl font-semibold text-custom-secondary">
                  {formatCurrency(individualQuarterlyTarget)}
                </p>
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs text-gray-600">
                <span>% Cuota (Total)</span>
                <span>{percentage.toFixed(1)}%</span>
              </div>
              <Progress value={Math.min(percentage, 100)} className="h-2 [&>div]:bg-custom-secondary" />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default QuarterPerformanceCard;