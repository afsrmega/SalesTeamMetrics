import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { formatCurrency } from '@/lib/salesUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-md text-sm min-w-[200px]">
        <p className="font-bold text-gray-800 mb-3 border-b pb-2">Week Ending: {label}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-600">Cum. Goal:</span>
            <span className="text-[#0ea5e9] font-semibold">{formatCurrency(data.computedCumGoal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-600">Accomplished:</span>
            <span className="text-[#8b5cf6] font-semibold">{formatCurrency(data.accomplished)}</span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t">
            <span className="font-medium text-gray-600">Run Rate:</span>
            <span className="text-gray-900">{data.computedRunRate}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-600">Achievement:</span>
            <span className="text-gray-900">{data.achievement}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const QuarterProgressChart = ({ data, currentWeekNumber, quarterLabel }) => {
  if (!data || data.length === 0) return null;

  const currentWeekData = data.find(d => d.weekNumber === currentWeekNumber);
  const currentWeekDateLabel = currentWeekData ? currentWeekData.weekEnding : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-6"
    >
      <Card className="shadow-lg border-t-4 border-t-[#0ea5e9] overflow-hidden card-custom">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <CardTitle className="text-xl text-custom-text">
            Progress Over Time {quarterLabel ? `- ${quarterLabel}` : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="weekEnding" 
                  stroke="#6b7280" 
                  fontSize={12}
                  tickMargin={10}
                />
                <YAxis 
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  stroke="#6b7280"
                  fontSize={12}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                
                {currentWeekDateLabel && (
                  <ReferenceLine 
                    x={currentWeekDateLabel} 
                    stroke="#ef4444" 
                    strokeDasharray="3 3"
                    label={{ position: 'top', value: 'Current Week', fill: '#ef4444', fontSize: 12, fontWeight: 500 }} 
                  />
                )}
                
                <Line 
                  type="monotone" 
                  name="Cumulative Goal"
                  dataKey="computedCumGoal" 
                  stroke="#0ea5e9"
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 6 }}
                  animationDuration={500}
                />
                <Line 
                  type="monotone" 
                  name="Accomplished (Cum)"
                  dataKey="accomplished" 
                  stroke="#8b5cf6"
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default QuarterProgressChart;