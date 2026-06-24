import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, TrendingUp, AlertTriangle, Briefcase, FileText } from 'lucide-react';
import PipelineFunnel from '@/components/prospects/PipelineFunnel';
import { formatM } from '@/lib/formatters';

const PipelineMetrics = ({ filteredProspects = [], filteredClients = [], isLoading }) => {
  const { pipelineTotal, expectedValue, hotValue, pendingFinancials, totalProspects } = useMemo(() => {
    let pipelineTotal = 0;
    let expectedValue = 0;
    let hotValue = 0;
    let pendingFinancials = 0;
    let totalProspects = 0;

    filteredProspects.forEach(p => {
      const val = Number(p.estimated_property_value || 0);
      totalProspects += val;
      pipelineTotal += val;

      let prob = 0.05;
      if (p.qualification >= 4 && p.qualification <= 5) prob = 0.15;
      else if (p.qualification >= 6 && p.qualification <= 7) prob = 0.30;
      else if (p.qualification >= 8 && p.qualification <= 9) prob = 0.55;
      else if (p.qualification === 10) prob = 0.75;
      
      expectedValue += (val * prob);

      if (p.qualification >= 8) {
        hotValue += val;
      }
    });

    filteredClients.forEach(c => {
      const val = Number(c.estimated_property_value || 0);
      pipelineTotal += val;
      
      if (c.pending_for_financials) {
        pendingFinancials += val;
      }
    });

    return { pipelineTotal, expectedValue, hotValue, pendingFinancials, totalProspects };
  }, [filteredProspects, filteredClients]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-t-4 border-t-custom-primary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
              <Briefcase className="w-4 h-4 mr-2" /> Pipeline Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatM(pipelineTotal)}</div>
            <p className="text-xs text-gray-400 mt-1">Prospectos + Clientes</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-custom-secondary shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
              <Target className="w-4 h-4 mr-2" /> Valor Esperado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatM(expectedValue)}</div>
            <p className="text-xs text-gray-400 mt-1">Basado en calificación</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-red-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
              <TrendingUp className="w-4 h-4 mr-2" /> Hot Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatM(hotValue)}</div>
            <p className="text-xs text-gray-400 mt-1">Prospectos Calif. 8+</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-400 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-500 font-medium flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" /> Pendiente Financials
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${formatM(pendingFinancials)}</div>
            <p className="text-xs text-gray-400 mt-1">Clientes en espera</p>
          </CardContent>
        </Card>
      </div>

      <PipelineFunnel filteredProspects={filteredProspects} isLoading={isLoading} />
    </div>
  );
};

export default PipelineMetrics;