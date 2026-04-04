import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/salesUtils";
import { useColorPreferences } from "@/hooks/useColorPreferences";
import QuarterProgressChart from '@/components/sales/QuarterProgressChart';

const QuarterWeeklyProgressTable = ({ weeklyData, globalSettings, isLoading, isMemberView, totalWeeks }) => {
  useColorPreferences();
  
  const getStatusColor = (percentage) => {
      const val = parseFloat(percentage);
      if (val >= 100) return "text-custom-secondary font-bold";
      if (val >= 75) return "text-custom-accent font-bold";
      return "text-red-600 font-bold";
  };

  const individualQuarterlyTarget = parseFloat(globalSettings?.individual_quarterly_target || 0);
  const teamQuarterlyTarget = parseFloat(globalSettings?.team_quarterly_target || 0);
  
  const quarterGoal = isMemberView || individualQuarterlyTarget > 0 
    ? individualQuarterlyTarget 
    : teamQuarterlyTarget;

  const goalLabel = isMemberView || individualQuarterlyTarget > 0 ? "Individual Q Goal" : "Team Q Goal";

  const dataLength = weeklyData ? weeklyData.length : (totalWeeks || 1);

  // Base cumulative goal dynamically on actual total weeks of the quarter
  const calculateCumulativeGoal = (weekNumber, target) => {
    return (weekNumber / dataLength) * target;
  };

  const enrichedData = useMemo(() => {
    if (!weeklyData) return [];
    return weeklyData.map(row => {
      const computedCumGoal = calculateCumulativeGoal(row.weekNumber, quarterGoal);
      const computedRunRate = computedCumGoal > 0 
          ? ((parseFloat(row.accomplished) / computedCumGoal) * 100).toFixed(1) 
          : 0;
      const achievement = quarterGoal > 0 
          ? ((parseFloat(row.accomplished) / quarterGoal) * 100).toFixed(1) 
          : 0;

      return {
        ...row,
        computedCumGoal,
        computedRunRate,
        achievement
      };
    });
  }, [weeklyData, quarterGoal, dataLength]);

  const currentWeek = enrichedData.find(d => d.isCurrentWeek);
  const currentWeekNumber = currentWeek ? currentWeek.weekNumber : null;

  if (isLoading) {
    return (
        <Card className="mt-8 shadow-md border-gray-200">
            <CardHeader>
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </CardContent>
        </Card>
    );
  }

  if (!enrichedData || enrichedData.length === 0) {
      return (
        <Card className="mt-8 border-dashed border-2 bg-gray-50/50">
            <CardContent className="flex flex-col items-center justify-center py-10 text-gray-400">
                <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                <p>No progress data available for this quarter.</p>
            </CardContent>
        </Card>
      );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8"
      >
          <Card className="shadow-lg border-t-4 border-t-custom-secondary overflow-hidden card-custom">
              <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                          <CardTitle className="text-xl text-custom-text flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-custom-secondary" />
                              Quarter Weekly Progress
                          </CardTitle>
                          <CardDescription>
                              Cumulative performance tracked against {goalLabel}
                          </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                           <Badge variant="outline" className="bg-white text-custom-secondary border-custom-secondary px-3 py-1 text-sm font-medium shadow-sm">
                               {goalLabel}: {formatCurrency(quarterGoal)}
                           </Badge>
                      </div>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-gray-50/50">
                                  <TableHead className="w-[140px] text-custom-text opacity-80">Week Ending</TableHead>
                                  <TableHead className="text-center w-[80px] text-custom-text opacity-80">Week #</TableHead>
                                  <TableHead className="text-right text-custom-text opacity-80">Cumulative Goal</TableHead>
                                  <TableHead className="text-right text-custom-text opacity-80">Accomplished (Cum.)</TableHead>
                                  <TableHead className="text-right text-custom-text opacity-80">Run Rate</TableHead>
                                  <TableHead className="text-right pr-6 text-custom-text opacity-80">Qtr Achievement</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {enrichedData.map((row, index) => (
                                  <motion.tr 
                                      key={row.weekNumber} 
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                      className={`
                                          ${row.isCurrentWeek ? "bg-custom-secondary-light border-l-4 border-l-custom-secondary" : "hover:bg-slate-50"}
                                          transition-colors
                                      `}
                                  >
                                      <TableCell className="font-medium text-custom-text flex items-center gap-2">
                                          {row.weekEnding}
                                          {row.isCurrentWeek && (
                                              <Badge className="bg-custom-secondary text-xs h-5 px-1.5 hover:bg-custom-secondary/90">Current</Badge>
                                          )}
                                      </TableCell>
                                      <TableCell className="text-center">
                                          <span className="text-gray-500 font-mono text-xs bg-gray-100 px-2 py-1 rounded-full">
                                              {row.weekNumber}
                                          </span>
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-custom-text opacity-80">
                                          {formatCurrency(row.computedCumGoal)}
                                      </TableCell>
                                      <TableCell className="text-right font-bold text-custom-text text-base">
                                          {formatCurrency(row.accomplished)}
                                      </TableCell>
                                      <TableCell className={`text-right ${getStatusColor(row.computedRunRate)}`}>
                                          {row.computedRunRate}%
                                      </TableCell>
                                      <TableCell className={`text-right pr-6 ${getStatusColor(row.achievement)}`}>
                                          {row.achievement}%
                                      </TableCell>
                                  </motion.tr>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              </CardContent>
          </Card>
      </motion.div>

      <QuarterProgressChart 
        data={enrichedData}
        currentWeekNumber={currentWeekNumber}
        quarterLabel={goalLabel}
      />
    </div>
  );
};

export default QuarterWeeklyProgressTable;