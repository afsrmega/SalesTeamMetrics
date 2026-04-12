
import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter } from 'lucide-react';
import { formatM } from '@/lib/formatters';

const COLORS = {
  Cold: '#3b82f6', // blue-500
  Warm: '#f59e0b', // orange-500
  Hot: '#ef4444'   // red-500
};

const PipelineFunnel = ({ filteredProspects = [], isLoading }) => {
  const [displayMode, setDisplayMode] = useState('value'); // 'count' or 'value'

  const funnelData = useMemo(() => {
    const buckets = {
      Cold: { name: 'Cold (1-4)', count: 0, value: 0, color: COLORS.Cold },
      Warm: { name: 'Warm (5-7)', count: 0, value: 0, color: COLORS.Warm },
      Hot: { name: 'Hot (8-10)', count: 0, value: 0, color: COLORS.Hot }
    };

    let totalCount = 0;
    let totalValue = 0;

    filteredProspects.forEach(p => {
      const q = p.qualification || 0;
      const val = Number(p.estimated_property_value || 0);
      
      let stage = 'Cold';
      if (q >= 8) stage = 'Hot';
      else if (q >= 5) stage = 'Warm';

      buckets[stage].count += 1;
      buckets[stage].value += val;
      totalCount += 1;
      totalValue += val;
    });

    const data = [buckets.Hot, buckets.Warm, buckets.Cold].map(b => ({
      ...b,
      avg: b.count > 0 ? b.value / b.count : 0
    }));

    return { data, totalCount, totalValue };
  }, [filteredProspects]);

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-bold">{data.name}</p>
          <p className="text-sm">Prospectos: {data.count}</p>
          <p className="text-sm">Valor Total: ${formatM(data.value)}</p>
          <p className="text-sm">Promedio: ${formatM(data.avg)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-[450px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" /> Pipeline Funnel
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setDisplayMode(prev => prev === 'value' ? 'count' : 'value')}
          >
            Ver por: {displayMode === 'value' ? 'Valor ($)' : 'Cantidad'}
          </Button>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span>Total Prospectos: <strong className="text-foreground">{funnelData.totalCount}</strong></span>
          <span>Valor Total: <strong className="text-foreground">${formatM(funnelData.totalValue)}</strong></span>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div 
            key={displayMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {funnelData.totalCount === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Sin datos para mostrar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnelData.data}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.3} />
                  <XAxis 
                    type="number" 
                    tickFormatter={displayMode === 'value' ? (val) => `$${formatM(val)}` : undefined} 
                  />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={displayMode} 
                    radius={[0, 4, 4, 0]}
                    animationDuration={1000}
                  >
                    {funnelData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default PipelineFunnel;
