import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, UserCheck, CalendarCheck, Wallet } from "lucide-react";
import { formatCurrency, getBarColor, getCustomQuarter } from "@/lib/salesUtils";

const CustomTooltipContent = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px]">
        <p className="font-bold text-gray-900 mb-2 border-b pb-1">{`${label}`}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex justify-between items-center mb-1">
             <span className="text-sm text-gray-600 mr-4">{entry.name}:</span>
             <span className="font-semibold" style={{ color: entry.color }}>{formatCurrency(entry.value)}</span>
          </div>
        ))}
        {data.achievement !== undefined && (
             <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Logro (Volumen):</span>
                    <span className="text-gray-800 font-bold">{data.achievement.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-medium">Tasa Coms:</span>
                    <span className="text-green-600 font-bold">{data.rate}%</span>
                </div>
             </div>
        )}
      </div>
    );
  }
  return null;
};

const TeamPerformanceCharts = ({ salesTeam, globalSettings }) => {
  const [quarterLabel, setQuarterLabel] = useState("");

  useEffect(() => {
    const { quarterLabel: ql } = getCustomQuarter();
    setQuarterLabel(ql);
  }, []);

  if (salesTeam.length === 0) return null;

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full"
      >
        <Card className="shadow-lg border-purple-100">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-purple-100">
            <CardTitle className="text-2xl text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-700" />
              </div>
              Comparativa de Billing Amount Individual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 gap-12">
              {salesTeam.map((member) => {
                const monthlyBilling = parseFloat(member.monthlyBillingAmount) || 0;
                const quarterlyBilling = parseFloat(member.quarterlyBillingAmount) || 0;
                
                const monthlyAchievement = member.metrics?.monthlyAchievementPercent || 0;
                const monthlyRate = member.metrics?.commissionRate || 0;

                const monthlyChartData = [
                  { 
                      name: 'Billing Mes', 
                      value: monthlyBilling, 
                      color: '#8b5cf6', // purple-500
                      achievement: monthlyAchievement,
                      rate: monthlyRate
                  }
                ];

                const quarterlyChartData = [
                  { name: `Billing ${quarterLabel}`, value: quarterlyBilling, color: '#6366f1' }, // indigo-500
                ];

                return (
                  <div key={member.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Monthly Chart */}
                        <div className="flex flex-col h-full min-h-[400px]">
                            <div className="flex items-center justify-between mb-6 px-2">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">M</div>
                                    {member.name} <span className="text-purple-600 font-normal text-sm ml-1"> (Mensual)</span>
                                </h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${monthlyAchievement >= 100 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {monthlyAchievement.toFixed(1)}% Quota
                                </span>
                            </div>
                            <div className="flex-grow bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200">
                                <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tickFormatter={(value) => `${formatCurrency(value)}`} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltipContent />} cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                                    {monthlyChartData.map((entry, index) => <Cell key={`m-${index}`} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Quarterly Chart */}
                        <div className="flex flex-col h-full min-h-[400px]">
                             <div className="flex items-center justify-between mb-6 px-2">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">Q</div>
                                    {member.name} <span className="text-indigo-600 font-normal text-sm ml-1"> (Trimestral)</span>
                                </h4>
                            </div>
                             <div className="flex-grow bg-gray-50 rounded-lg p-4 border border-dashed border-gray-200">
                                <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={quarterlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis tickFormatter={(value) => `${formatCurrency(value)}`} tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltipContent />} cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={60}>
                                    {quarterlyChartData.map((entry, index) => <Cell key={`q-${index}`} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
  );
};

export default TeamPerformanceCharts;