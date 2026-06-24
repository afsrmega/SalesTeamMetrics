import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { startOfDay, addDays, isBefore, isSameDay, format } from 'date-fns';
import { formatM } from '@/lib/formatters';

const COLORS = {
  Cold: '#3b82f6', // blue
  Warm: '#f59e0b', // orange
  Hot: '#ef4444'   // red
};

const FollowUpTimeline = ({ filteredProspects = [], isLoading }) => {
  const { timelineData, overdueStats } = useMemo(() => {
    const today = startOfDay(new Date());
    
    let overdueCount = 0;
    let overdueValue = 0;

    // Initialize 14 days
    const days = Array.from({ length: 14 }).map((_, i) => {
      const date = addDays(today, i);
      return {
        date,
        dateStr: format(date, 'MMM dd'),
        isToday: i === 0,
        Cold: 0,
        Warm: 0,
        Hot: 0,
        count: 0,
        totalValue: 0
      };
    });

    filteredProspects.forEach(p => {
      if (!p.follow_up_at) return;
      const followUpDate = startOfDay(new Date(p.follow_up_at));
      const val = Number(p.estimated_property_value || 0);
      const q = p.qualification || 0;
      
      let stage = 'Cold';
      if (q >= 8) stage = 'Hot';
      else if (q >= 5) stage = 'Warm';

      if (isBefore(followUpDate, today)) {
        overdueCount++;
        overdueValue += val;
      } else {
        const dayMatch = days.find(d => isSameDay(d.date, followUpDate));
        if (dayMatch) {
          dayMatch[stage] += val;
          dayMatch.count++;
          dayMatch.totalValue += val;
        }
      }
    });

    return { timelineData: days, overdueStats: { count: overdueCount, value: overdueValue } };
  }, [filteredProspects]);

  if (isLoading) {
    return (
      <Card className="h-[450px]">
        <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-lg min-w-[200px]">
          <p className="font-bold border-b pb-1 mb-2">{data.dateStr} {data.isToday ? '(Hoy)' : ''}</p>
          <p className="text-sm font-semibold mb-1">Total: ${formatM(data.totalValue)} ({data.count} props)</p>
          {payload.map(p => (
            p.value > 0 && (
              <div key={p.dataKey} className="flex justify-between text-sm">
                <span style={{ color: p.color }}>{p.name}:</span>
                <span>${formatM(p.value)}</span>
              </div>
            )
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomXAxisTick = ({ x, y, payload }) => {
    const isToday = timelineData[payload.index]?.isToday;
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill={isToday ? '#000' : '#666'}
          fontWeight={isToday ? 'bold' : 'normal'}
          fontSize={12}
        >
          {payload.value}
        </text>
        {isToday && (
          <circle cx={0} cy={22} r={3} fill="#ef4444" />
        )}
      </g>
    );
  };

  const totalUpcomingCount = timelineData.reduce((acc, d) => acc + d.count, 0);

  return (
    <Card className="h-[450px] flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5" /> Follow-Up Timeline (14 Días)
          </CardTitle>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-destructive font-semibold text-sm">
              <AlertCircle className="h-4 w-4" /> Vencidos: {overdueStats.count}
            </div>
            <div className="text-xs text-muted-foreground">
              ${formatM(overdueStats.value)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full h-full"
        >
          {totalUpcomingCount === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No hay seguimientos programados en este rango.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={timelineData}
                margin={{ top: 20, right: 10, left: 10, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="dateStr" 
                  tick={<CustomXAxisTick />} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(val) => `$${formatM(val)}`}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Cold" name="Cold (1-4)" stackId="a" fill={COLORS.Cold} animationDuration={1000} />
                <Bar dataKey="Warm" name="Warm (5-7)" stackId="a" fill={COLORS.Warm} animationDuration={1000} />
                <Bar dataKey="Hot" name="Hot (8-10)" stackId="a" fill={COLORS.Hot} animationDuration={1000} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default FollowUpTimeline;