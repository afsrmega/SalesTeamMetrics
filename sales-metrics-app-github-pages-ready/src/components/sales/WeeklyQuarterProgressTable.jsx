import React from 'react';
import { useWeeklyQuarterProgress } from '@/hooks/useWeeklyQuarterProgress';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/salesUtils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

const WeeklyQuarterProgressTable = ({ memberId, quarterInfo, quarterTarget }) => {
  const { weeklyData, loading, error } = useWeeklyQuarterProgress(memberId, quarterInfo, quarterTarget);

  const getStatusColor = (percentage) => {
      const val = parseFloat(percentage);
      if (val >= 100) return "text-green-600 font-bold";
      if (val >= 75) return "text-yellow-600 font-bold";
      return "text-red-600 font-bold";
  };

  if (loading) {
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

  if (error) {
      return (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 mt-8 border border-red-200">
              <AlertTriangle className="h-5 w-5" />
              <span>Error loading quarter progress: {error}</span>
          </div>
      );
  }

  if (!weeklyData || weeklyData.length === 0) {
      return null;
  }

  const finalRow = weeklyData[weeklyData.length - 1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-8"
    >
        <Card className="shadow-lg border-blue-100 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100 pb-4">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-600" />
                            Quarter Performance
                        </CardTitle>
                        <CardDescription>
                            Week-by-Week Cumulative Progress vs Goal ({formatCurrency(quarterTarget)})
                        </CardDescription>
                    </div>
                    {finalRow && (
                        <div className="text-right">
                             <div className="text-sm text-gray-500 font-medium uppercase">Current Achievement</div>
                             <div className={`text-2xl ${getStatusColor(finalRow.quarterAchievement)}`}>
                                 {finalRow.quarterAchievement}%
                             </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50/50">
                                <TableHead className="w-[120px]">Week Ending</TableHead>
                                <TableHead className="text-center w-[80px]">Week #</TableHead>
                                <TableHead className="text-right">Goal (Cumulative)</TableHead>
                                <TableHead className="text-right">Accomplished (Cumulative)</TableHead>
                                <TableHead className="text-right">Run Rate</TableHead>
                                <TableHead className="text-right pr-6">Qtr Achievement</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeklyData.map((row, index) => (
                                <TableRow key={row.weekNum} className="hover:bg-blue-50/30 transition-colors">
                                    <TableCell className="font-medium text-gray-700">{row.weekEnding}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-normal">
                                            {row.weekNum}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-gray-600">
                                        {formatCurrency(row.goalCumulative)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-gray-800 text-base">
                                        {formatCurrency(row.accomplishedCumulative)}
                                    </TableCell>
                                    <TableCell className={`text-right ${getStatusColor(row.runRate)}`}>
                                        {row.runRate}%
                                    </TableCell>
                                    <TableCell className={`text-right pr-6 ${getStatusColor(row.quarterAchievement)}`}>
                                        {row.quarterAchievement}%
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Summary Footer Row */}
                            <TableRow className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                <TableCell colSpan={2} className="text-right text-gray-600 uppercase text-xs tracking-wider pt-4 pb-4">
                                    Final Totals
                                </TableCell>
                                <TableCell className="text-right text-gray-800 pt-4 pb-4">
                                    {formatCurrency(finalRow?.goalCumulative || 0)}
                                </TableCell>
                                <TableCell className="text-right text-blue-800 text-lg pt-4 pb-4">
                                    {formatCurrency(finalRow?.accomplishedCumulative || 0)}
                                </TableCell>
                                <TableCell className={`text-right pt-4 pb-4 ${getStatusColor(finalRow?.runRate || 0)}`}>
                                    {finalRow?.runRate || 0}%
                                </TableCell>
                                <TableCell className={`text-right pr-6 pt-4 pb-4 ${getStatusColor(finalRow?.quarterAchievement || 0)}`}>
                                    {finalRow?.quarterAchievement || 0}%
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </motion.div>
  );
};

export default WeeklyQuarterProgressTable;