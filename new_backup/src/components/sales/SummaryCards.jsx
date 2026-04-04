import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, getCustomQuarter } from '@/lib/salesUtils';
import { Trophy, TrendingUp, Calendar, PieChart, BarChart3, Target } from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass, borderClass }) => (
  <motion.div
    whileHover={{ scale: 1.02, translateY: -2 }}
    transition={{ duration: 0.2 }}
    className="h-full"
  >
    <Card className={`border-t-4 ${borderClass} shadow-md hover:shadow-xl transition-all duration-300 h-full min-h-[180px] flex flex-col justify-between overflow-hidden bg-white rounded-xl`}>
      <CardContent className="p-6 flex flex-col h-full justify-between">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
            <h3 className="text-3xl font-extrabold text-gray-900 leading-tight tracking-tight">{value}</h3>
          </div>
          <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 flex-shrink-0 ml-4 shadow-sm`}>
            <Icon className={`w-7 h-7 ${colorClass.replace('bg-', 'text-')}`} strokeWidth={2.5} />
          </div>
        </div>
        
        {subtext && (
          <div className="mt-auto pt-4 border-t border-gray-50 w-full">
             <p className="text-sm text-gray-500 font-medium flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
               {subtext}
             </p>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
);

const SummaryCards = ({ 
  totalMonthlySales, 
  totalQuarterlySales, 
  totalMonthlyNonResSales,
  totalQuarterlyNonResSales = 0,
  averageMonthlySales, 
  averageQuarterlySales, 
  topPerformer, 
  salesTeamCount,
  teamMonthlyAchievement = 0
}) => {
  const [quarterLabel, setQuarterLabel] = useState("");
  
  useEffect(() => {
    const { quarterLabel: ql } = getCustomQuarter();
    setQuarterLabel(ql);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full py-4">
      <StatCard 
        title="Ventas Totales (Mes)" 
        value={formatCurrency(totalMonthlySales)} 
        subtext={`${salesTeamCount} miembros activos`}
        icon={Calendar}
        colorClass="bg-emerald-100 text-emerald-600"
        borderClass="border-emerald-500"
      />
      <StatCard 
        title="Ventas Sin Residencial (Mes)" 
        value={formatCurrency(totalMonthlyNonResSales || 0)} 
        subtext="BPP + Comercial"
        icon={PieChart}
        colorClass="bg-blue-100 text-blue-600"
        borderClass="border-blue-500"
      />
      <StatCard 
        title={`Ventas Totales (${quarterLabel})`} 
        value={formatCurrency(totalQuarterlySales)} 
        subtext="Trimestre actual"
        icon={TrendingUp}
        colorClass="bg-violet-100 text-violet-600"
        borderClass="border-violet-500"
      />
      <StatCard 
        title={`Ventas Sin Residencial (${quarterLabel})`} 
        value={formatCurrency(totalQuarterlyNonResSales || 0)} 
        subtext="Acumulado Trimestral"
        icon={BarChart3}
        colorClass="bg-indigo-100 text-indigo-600"
        borderClass="border-indigo-500"
      />
      <StatCard 
        title="Logro de Equipo (Mes)" 
        value={`${teamMonthlyAchievement.toFixed(1)}%`}
        subtext="vs Meta Global"
        icon={Target}
        colorClass="bg-amber-100 text-amber-600"
        borderClass="border-amber-500"
      />
      <StatCard 
        title="Top Performer (Mes)" 
        value={topPerformer ? topPerformer.name : "N/A"} 
        subtext={topPerformer ? `Ventas: ${formatCurrency(topPerformer.sales)}` : "Sin datos"}
        icon={Trophy}
        colorClass="bg-rose-100 text-rose-600"
        borderClass="border-rose-500"
      />
    </div>
  );
};

export default SummaryCards;