import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Edit3 } from "lucide-react";
import { formatCurrency, getCustomQuarter } from "@/lib/salesUtils";
import { Badge } from "@/components/ui/badge";

const SalesTeamTableQuarterly = ({ salesTeam, globalSettings, onDeleteMember, onEditMember, disabled, effectiveMonthGoals, effectiveQuarterGoals, periodMode }) => {
  const [quarterLabel, setQuarterLabel] = useState("");

  const teamGoalUsed = periodMode === 'month' 
    ? (effectiveMonthGoals?.team_goal > 0 ? effectiveMonthGoals.team_goal : globalSettings?.team_monthly_target)
    : (effectiveQuarterGoals?.team_goal > 0 ? effectiveQuarterGoals.team_goal : globalSettings?.team_quarterly_target);

  useEffect(() => {
    console.log(`📊 [SalesTeamTableQuarterly] (6) Using periodMode: ${String(periodMode)}, team goal used:`, String(teamGoalUsed));
  }, [periodMode, teamGoalUsed]);

  useEffect(() => {
    const { quarterLabel: label } = getCustomQuarter();
    setQuarterLabel(String(label));
  }, []);

  const rankedTeam = salesTeam.length > 0 
    ? [...salesTeam].sort((a, b) => (parseFloat(b.quarterlySales) || 0) - (parseFloat(a.quarterlySales) || 0))
    : [];

  const getAchievementColor = (percent) => {
    if (percent >= 100) return "bg-green-100 text-green-800 border-green-300";
    if (percent >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  if (rankedTeam.length === 0 && !disabled) {
     return null;
  }
  
  if (disabled) {
     return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="bg-white shadow-xl rounded-lg overflow-hidden border border-blue-200"
    >
      <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          Leaderboard {quarterLabel}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
           Progreso Trimestral calculado sobre Ventas Totales.
        </p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead className="w-[60px]">Foto</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="text-right">Total {quarterLabel}</TableHead>
              <TableHead className="text-right text-indigo-700">Sin Residencial</TableHead>
              <TableHead className="text-center">Achievement %</TableHead>
              <TableHead className="text-center">Commission</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankedTeam.map((member, index) => {
              const quarterlySales = parseFloat(member.quarterlySales) || 0;
              const quarterlyNonRes = parseFloat(member.quarterlyNonResidentialSales) || 0;
              
              const metrics = member.metrics || {};
              const achievementPercent = metrics.quarterlyAchievementPercent || 0;
              const commissionAmount = metrics.quarterlyCommissionAmount || 0;

              return (
                <TableRow key={member.id} className="hover:bg-blue-50/30 transition-colors">
                  <TableCell className="text-center font-bold">{index + 1}</TableCell>
                  <TableCell>
                    <Avatar className="h-10 w-10 border-2 border-gray-200">
                      <AvatarImage src={member.photo_url || undefined} alt={member.name} />
                      <AvatarFallback className="bg-gray-200">{member.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium text-gray-800">{member.name}</TableCell>
                  <TableCell className="text-right text-gray-900 font-bold">
                    {formatCurrency(quarterlySales)}
                  </TableCell>
                  <TableCell className="text-right text-indigo-700 font-medium">
                    {formatCurrency(quarterlyNonRes)}
                  </TableCell>
                  <TableCell className="text-center w-[140px]">
                        <Badge variant="outline" className={`px-2 py-1 ${getAchievementColor(achievementPercent)}`}>
                            {achievementPercent.toFixed(2)}%
                        </Badge>
                  </TableCell>
                  <TableCell className="text-center font-bold text-green-700">
                      {formatCurrency(commissionAmount)}
                  </TableCell>
                  <TableCell className="text-center space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEditMember(member)} className="text-blue-600 h-8 w-8">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteMember(member.id)} className="text-red-600 h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default SalesTeamTableQuarterly;