import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { formatCurrency, getCustomQuarter } from "@/lib/salesUtils";
import RadialProgressChart from "./RadialProgressChart";

const TeamOverallProgressCharts = ({ salesTeam, globalSettings, totalMonthlySales, totalQuarterlySales, totalMonthlyNonResSales, totalQuarterlyNonResSales }) => {
  const [quarterLabel, setQuarterLabel] = useState("");

  useEffect(() => {
    const { quarterLabel: ql } = getCustomQuarter();
    setQuarterLabel(ql);
  }, []);

  const currentTotalMonthly = totalMonthlyNonResSales ?? salesTeam.reduce((sum, member) => {
    return sum + (parseFloat(member.monthlyNonResidentialSales) || 0);
  }, 0);

  const currentTotalQuarterly = totalQuarterlyNonResSales ?? salesTeam.reduce((sum, member) => {
    return sum + (parseFloat(member.quarterlyNonResidentialSales) || 0);
  }, 0);

  const teamMonthlyTarget = parseFloat(globalSettings?.team_monthly_target) || 0;
  const teamQuarterlyTarget = parseFloat(globalSettings?.team_quarterly_target) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="shadow-lg border-green-100 overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 px-8 py-6 border-b border-green-100">
          <CardTitle className="text-2xl text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-700" />
            </div>
            Progreso General del Equipo <span className="text-green-600 text-lg font-normal">(Sin Residencial)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
              <RadialProgressChart 
                value={currentTotalMonthly}
                goal={teamMonthlyTarget}
                label="Mes Actual (MTD)"
                colorTheme="green"
                period="month"
              />
            </div>
            
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
              <RadialProgressChart 
                value={currentTotalQuarterly}
                goal={teamQuarterlyTarget}
                label={`Trimestre (${quarterLabel})`}
                colorTheme="purple"
                period="quarter"
              />
            </div>

          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TeamOverallProgressCharts;