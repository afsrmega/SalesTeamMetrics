import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/salesUtils";
import { format } from "date-fns";
import { useColorPreferences } from "@/hooks/useColorPreferences";

const MonthlyWeeklyProgressTable = ({ weeks, globalSettings, isLoading }) => {
  useColorPreferences();
  const currentMonthName = format(new Date(), 'MMMM yyyy');

  const getStatusColor = (percentage) => {
      const val = parseFloat(percentage);
      if (val >= 100) return "text-custom-secondary font-bold";
      if (val >= 75) return "text-custom-accent font-bold";
      return "text-red-600 font-bold";
  };
  
  const monthlyGoal = globalSettings?.team_monthly_target || 0;

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

  if (!weeks || weeks.length === 0) {
      return (
        <Card className="mt-8 border-dashed border-2 bg-gray-50/50">
            <CardContent className="flex flex-col items-center justify-center py-10 text-gray-400">
                <TrendingUp className="w-12 h-12 mb-2 opacity-20" />
                <p>No monthly progress data available.</p>
            </CardContent>
        </Card>
      );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="mt-8"
    >
        <Card className="shadow-lg border-t-4 border-t-custom-primary overflow-hidden card-custom">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <CardTitle className="text-xl text-custom-text flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-custom-primary" />
                            Monthly Weekly Progress
                        </CardTitle>
                        <CardDescription>
                            {currentMonthName} — Performance Tracking against Team Goal
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <Badge variant="outline" className="bg-white text-custom-primary border-custom-primary px-3 py-1 text-sm font-medium shadow-sm">
                             Team Monthly Goal: {formatCurrency(monthlyGoal)}
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
                                <TableHead className="text-right pr-6 text-custom-text opacity-80">Month Achievement</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weeks.map((row, index) => (
                                <motion.tr 
                                    key={row.weekNumber} 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className={`
                                        ${row.isCurrent ? "bg-custom-primary-light border-l-4 border-l-custom-primary" : "hover:bg-slate-50"}
                                        transition-colors
                                    `}
                                >
                                    <TableCell className="font-medium text-custom-text flex items-center gap-2">
                                        {row.weekEnding}
                                        {row.isCurrent && (
                                            <Badge className="bg-custom-primary text-xs h-5 px-1.5 hover:bg-custom-primary/90">Current</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-gray-500 font-mono text-xs bg-gray-100 px-2 py-1 rounded-full">
                                            {row.weekNumber}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-medium text-custom-text opacity-80">
                                        {formatCurrency(row.cumulativeGoal)}
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-custom-text text-base">
                                        {formatCurrency(row.accomplished)}
                                    </TableCell>
                                    <TableCell className={`text-right ${getStatusColor(row.runRate)}`}>
                                        {row.runRate}%
                                    </TableCell>
                                    <TableCell className={`text-right pr-6 ${getStatusColor(row.monthAchievement)}`}>
                                        {row.monthAchievement}%
                                    </TableCell>
                                </motion.tr>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </motion.div>
  );
};

export default MonthlyWeeklyProgressTable;