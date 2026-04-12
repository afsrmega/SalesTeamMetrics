
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Edit3, User, Percent, List } from "lucide-react";
import { formatCurrency, getCustomQuarter } from "@/lib/salesUtils";
import MemberSalesDialog from "@/components/sales/MemberSalesDialog";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SalesTeamTable = ({ salesTeam, globalSettings, onDeleteMember, onEditMember, disabled, effectiveMonthGoals, effectiveQuarterGoals, periodMode }) => {
  const [selectedMemberForSales, setSelectedMemberForSales] = useState(null);
  const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
  const [quarterLabel, setQuarterLabel] = useState("");

  const teamGoalUsed = periodMode === 'month' 
    ? (effectiveMonthGoals?.team_goal > 0 ? effectiveMonthGoals.team_goal : globalSettings?.team_monthly_target)
    : (effectiveQuarterGoals?.team_goal > 0 ? effectiveQuarterGoals.team_goal : globalSettings?.team_quarterly_target);

  useEffect(() => {
    console.log(`📊 [SalesTeamTable] (6) Using periodMode: ${String(periodMode)}, team goal used:`, String(teamGoalUsed));
  }, [periodMode, teamGoalUsed]);

  useEffect(() => {
    const { quarterLabel: ql } = getCustomQuarter(new Date());
    setQuarterLabel(String(ql));
  }, []);

  const rankedTeam = salesTeam.length > 0 
    ? [...salesTeam].sort((a, b) => (parseFloat(b.monthlySales) || 0) - (parseFloat(a.monthlySales) || 0))
    : [];

  const handleViewSales = (member) => {
    setSelectedMemberForSales(member);
    setIsSalesModalOpen(true);
  };

  const getAchievementColor = (percent) => {
    if (percent >= 100) return "bg-green-100 text-green-800 border-green-300";
    if (percent >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  if (rankedTeam.length === 0 && !disabled) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-md">
        <User className="mx-auto h-16 w-16 text-gray-300 mb-4" />
        <p className="text-gray-500">Equipo de Ventas Vacío</p>
      </div>
    );
  }
  
  if (disabled) {
     return <div className="text-center py-10 bg-white shadow-md rounded-lg"><p className="text-gray-500">Inicia sesión para ver.</p></div>;
  }

  return (
    <>
        <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white shadow-xl rounded-lg overflow-hidden border border-green-200"
        >
        <div className="p-6 bg-gradient-to-r from-green-50 to-teal-50 border-b border-green-200">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
            Leaderboard Mensual (Live)
            </h2>
            <p className="text-sm text-gray-600 mt-1">
            Comisiones escalonadas basadas en % de Cumplimiento de Cuota.
            </p>
        </div>
        <div className="overflow-x-auto">
            <Table>
            <TableHeader className="bg-gray-50">
                <TableRow>
                <TableHead className="w-[50px] text-center">#</TableHead>
                <TableHead className="w-[60px]">Foto</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Volumen</TableHead>
                <TableHead className="text-right text-purple-700">Billing Amount</TableHead>
                <TableHead className="text-center">Quota %</TableHead>
                <TableHead className="text-center">Rate</TableHead>
                <TableHead className="text-right text-green-700">Commission</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {rankedTeam.map((member, index) => {
                const monthlySales = parseFloat(member.monthlySales) || 0;
                
                const metrics = member.metrics || {};
                const monthlyBilling = metrics.monthlyBillingAmount || 0;
                const quotaPercent = metrics.quotaPercentage || 0; 
                const commissionRate = metrics.commissionRate || 0;
                const commissionAmount = metrics.commissionAmount || 0;
                const tierRange = metrics.tierRange || "";
                
                return (
                    <TableRow key={member.id} className="hover:bg-green-50/30 transition-colors">
                    <TableCell className="text-center font-bold">{index + 1}</TableCell>
                    <TableCell>
                        <Avatar className="h-10 w-10 border-2 border-gray-200">
                        <AvatarImage src={member.photo_url || undefined} alt={member.name} />
                        <AvatarFallback className="bg-gray-200">{member.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">{member.name}</TableCell>
                    <TableCell className="text-right text-gray-600 font-medium">
                        {formatCurrency(monthlySales)}
                    </TableCell>
                    <TableCell className="text-right text-purple-700 font-bold">
                        {formatCurrency(monthlyBilling)}
                    </TableCell>
                    <TableCell className="text-center w-[120px]">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <Badge variant="outline" className={`px-2 py-1 cursor-help ${getAchievementColor(quotaPercent)}`}>
                                        {quotaPercent.toFixed(1)}%
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Tier Range: {tierRange}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-center font-medium text-gray-700">
                        <div className="flex items-center justify-center">
                        <Percent className="h-4 w-4 mr-1 text-indigo-500" />
                        {commissionRate}%
                        </div>
                    </TableCell>
                    <TableCell className="text-right text-green-700 font-bold">
                        {formatCurrency(commissionAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                       <div className="flex justify-center space-x-1">
                        <Button variant="ghost" size="icon" onClick={() => handleViewSales(member)} className="text-indigo-600 h-8 w-8">
                           <List className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEditMember(member)} className="text-blue-600 h-8 w-8">
                            <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteMember(member.id)} className="text-red-600 h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                       </div>
                    </TableCell>
                    </TableRow>
                );
                })}
            </TableBody>
            </Table>
        </div>
        </motion.div>
        
        <MemberSalesDialog 
            isOpen={isSalesModalOpen}
            onOpenChange={setIsSalesModalOpen}
            member={selectedMemberForSales}
        />
    </>
  );
};

export default SalesTeamTable;
