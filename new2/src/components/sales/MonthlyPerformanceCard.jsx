
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/salesUtils";
import { useMonthlyPerformance } from "@/hooks/useMonthlyPerformance";

const MonthlyPerformanceCard = ({ monthStart, monthEnd, memberId, globalSettings, quarterCommissionRate = 1, accumulatedCommission = 70721.34 }) => {
  const { 
    achieved_mtd_with_residential, 
    achieved_mtd_excluding_residential, 
    loading 
  } = useMonthlyPerformance(memberId, monthStart, monthEnd);

  const teamMonthlyTarget = globalSettings?.team_monthly_target ? parseFloat(globalSettings.team_monthly_target) : null;

  return (
    <Card className="h-full shadow-md border-t-4 border-t-custom-primary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-custom-primary">
          <TrendingUp className="mr-2 h-5 w-5" /> Rendimiento Mensual MTD
        </CardTitle>
        <CardDescription>Resumen de Logros Mensuales</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="animate-spin h-8 w-8 text-custom-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase">Volumen Total</p>
              <p className="text-2xl font-bold text-custom-text">
                {formatCurrency(achieved_mtd_with_residential)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase">Meta Mensual Equipo</p>
              <p className="text-xl font-semibold text-custom-primary">
                {teamMonthlyTarget && teamMonthlyTarget > 0 ? formatCurrency(teamMonthlyTarget) : "Meta no configurada"}
              </p>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500 uppercase">Tasa Act. (QTD)</p>
              <p className="text-xl font-bold text-custom-text">
                {quarterCommissionRate}%
              </p>
            </div>
            <div className="text-right mt-2">
              <p className="text-xs text-gray-500 uppercase">Comisión Acumulada</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(accumulatedCommission)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyPerformanceCard;
