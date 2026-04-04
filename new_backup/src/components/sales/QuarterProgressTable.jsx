import React from 'react';
import { formatCurrency } from '@/lib/salesUtils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarDays, TrendingUp } from 'lucide-react';

const QuarterProgressTable = ({ weeklyData, quarterGoal }) => {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPercent = (value) => {
    if (isNaN(value) || !isFinite(value)) return "0.0%";
    return `${value.toFixed(1)}%`;
  };

  // Helper to determine row styling based on performance
  const getRunRateColor = (rate) => {
    if (rate >= 100) return "text-green-600 font-bold";
    if (rate >= 90) return "text-green-500";
    if (rate >= 75) return "text-yellow-600";
    return "text-red-500";
  };
  
  const getRunRateBg = (rate) => {
    if (rate >= 100) return "bg-green-50";
    if (rate >= 75) return "bg-yellow-50";
    return "bg-red-50";
  };

  if (!weeklyData || weeklyData.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">No data available for the current quarter.</p>
      </div>
    );
  }

  // Find current week to highlight
  const now = new Date();
  const currentWeekIndex = weeklyData.findIndex(w => w.weekEnding >= now);
  const safeCurrentWeekIndex = currentWeekIndex === -1 ? weeklyData.length - 1 : currentWeekIndex;

  return (
    <Card className="w-full shadow-lg border-blue-100 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-blue-100">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDays className="h-6 w-6 text-blue-700" />
            </div>
            Progreso Semanal del Trimestre
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-white/50 px-4 py-2 rounded-full border border-blue-100 shadow-sm">
             <TrendingUp className="w-4 h-4 text-blue-600" />
             <span>Meta Trimestral: <strong>{formatCurrency(quarterGoal)}</strong></span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="w-[140px] font-bold text-gray-700">Week Ending</TableHead>
                <TableHead className="text-center font-bold text-gray-700">Week #</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Cumulative Goal</TableHead>
                <TableHead className="text-right font-bold text-gray-700">Accomplished (Cum.)</TableHead>
                <TableHead className="text-center font-bold text-gray-700">Run Rate (%)</TableHead>
                <TableHead className="text-center font-bold text-gray-700">Quarter Achievement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyData.map((week, index) => {
                const isCurrentWeek = index === safeCurrentWeekIndex;
                const isPast = index <= safeCurrentWeekIndex;
                const runRateColor = getRunRateColor(week.runRate);
                const rowBg = isCurrentWeek ? "bg-blue-50/60 border-l-4 border-l-blue-500" : (index % 2 === 0 ? "bg-white" : "bg-gray-50/50");
                
                return (
                  <TableRow 
                    key={week.weekNumber} 
                    className={`${rowBg} hover:bg-blue-50/80 transition-colors duration-150 ${isCurrentWeek ? 'shadow-inner' : ''}`}
                  >
                    <TableCell className="font-medium text-gray-700">
                      {formatDate(week.weekEnding)}
                      {isCurrentWeek && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Current</span>}
                    </TableCell>
                    <TableCell className="text-center text-gray-600">{week.weekNumber}</TableCell>
                    <TableCell className="text-right font-mono text-gray-600">
                      {formatCurrency(week.goal)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-gray-800">
                      {formatCurrency(week.accomplished)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRunRateBg(week.runRate)} ${runRateColor}`}>
                        {formatPercent(week.runRate)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium text-gray-700">
                        {formatPercent(week.quarterAchievement)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuarterProgressTable;