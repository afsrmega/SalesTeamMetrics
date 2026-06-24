import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Percent, ShieldCheck } from 'lucide-react';

const CoverageRatios = ({ hotCoveragePct, expectedCoveragePct, gapToGoal, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
        <CardContent className="space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent>
      </Card>
    );
  }

  if (gapToGoal <= 0) {
    return (
      <Card className="h-full bg-green-50 border-green-200">
        <CardContent className="flex flex-col items-center justify-center h-full p-6 text-center">
          <ShieldCheck className="h-12 w-12 text-green-500 mb-4" />
          <h3 className="text-xl font-bold text-green-700">Meta Mensual Alcanzada</h3>
          <p className="text-green-600 mt-2">No necesitas más prospectos para cubrir la meta este mes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Percent className="h-5 w-5" /> Cobertura de Faltante
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-2">Cobertura HOT (8-10)</h4>
          <div className="text-sm text-muted-foreground mb-1">
            Si cierras tus prospectos HOT, cubres <strong className="text-primary">{hotCoveragePct.toFixed(1)}%</strong> del faltante.
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-orange-500" style={{ width: `${Math.min(hotCoveragePct, 100)}%` }} />
          </div>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2">Cobertura Esperada (Prob.)</h4>
          <div className="text-sm text-muted-foreground mb-1">
            Con el valor esperado, cubres <strong className="text-primary">{expectedCoveragePct.toFixed(1)}%</strong> del faltante.
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(expectedCoveragePct, 100)}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CoverageRatios;