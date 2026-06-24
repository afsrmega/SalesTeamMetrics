
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Clock } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { getCustomQuarter } from '@/lib/salesUtils';

const TimeProgressChart = ({ quarterDefinitions }) => {
  const [progress, setProgress] = useState({
    month: { passed: 0, total: 30, percent: 0, remaining: 0, name: "" },
    quarter: { passed: 0, total: 90, percent: 0, remaining: 0, label: "" }
  });

  useEffect(() => {
    const updateProgress = () => {
      const now = new Date();
      
      // Monthly
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysPassedMonth = now.getDate();
      const percentMonth = (daysPassedMonth / daysInMonth) * 100;
      const monthName = now.toLocaleString('es-ES', { month: 'long' });

      // Custom Quarter
      const { quarterStart, quarterEnd, quarterLabel } = getCustomQuarter(now, quarterDefinitions);
      const totalQuarterTime = quarterEnd - quarterStart;
      const elapsedQuarterTime = now - quarterStart;
      
      // Calculate days roughly
      const totalQuarterDays = Math.ceil(totalQuarterTime / (1000 * 60 * 60 * 24));
      const elapsedQuarterDays = Math.max(0, Math.ceil(elapsedQuarterTime / (1000 * 60 * 60 * 24)));
      const percentQuarter = Math.min(100, Math.max(0, (elapsedQuarterTime / totalQuarterTime) * 100));

      setProgress({
        month: {
          passed: daysPassedMonth,
          total: daysInMonth,
          percent: percentMonth,
          remaining: daysInMonth - daysPassedMonth,
          name: monthName.charAt(0).toUpperCase() + monthName.slice(1)
        },
        quarter: {
          passed: elapsedQuarterDays,
          total: totalQuarterDays,
          percent: percentQuarter,
          remaining: Math.max(0, totalQuarterDays - elapsedQuarterDays),
          label: quarterLabel
        }
      });
    };

    updateProgress();
    const intervalId = setInterval(updateProgress, 1000 * 60 * 60);

    return () => clearInterval(intervalId);
  }, [quarterDefinitions]);

  return (
    <Card className="bg-gradient-to-br from-teal-500 to-emerald-700 text-white shadow-xl hover:shadow-2xl transition-shadow h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg font-medium">Tiempo Transcurrido</CardTitle>
        <Clock className="h-5 w-5 text-teal-200" />
      </CardHeader>
      <CardContent className="pt-2 space-y-6">
        
        {/* Month Section */}
        <div>
           <div className="flex justify-between items-end mb-1">
             <span className="text-sm font-medium opacity-90">Mes: {progress.month.name}</span>
             <span className="text-xs opacity-75">{progress.month.remaining} días rest.</span>
           </div>
           <Progress value={progress.month.percent} className="w-full h-2 mb-1 [&>div]:bg-white bg-teal-800/30" />
           <p className="text-right text-xs font-semibold opacity-90">{progress.month.percent.toFixed(1)}%</p>
        </div>

        {/* Quarter Section */}
        <div>
           <div className="flex justify-between items-end mb-1">
             <span className="text-sm font-medium opacity-90">{progress.quarter.label}</span>
             <span className="text-xs opacity-75">{progress.quarter.remaining} días rest.</span>
           </div>
           <Progress value={progress.quarter.percent} className="w-full h-2 mb-1 [&>div]:bg-purple-200 bg-teal-800/30" />
           <p className="text-right text-xs font-semibold opacity-90">{progress.quarter.percent.toFixed(1)}%</p>
        </div>

      </CardContent>
    </Card>
  );
};

export default TimeProgressChart;
