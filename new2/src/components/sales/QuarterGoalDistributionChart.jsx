
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/salesUtils";
import { Target, AlertCircle } from "lucide-react";

const QuarterGoalDistributionChart = ({ quarterGoal }) => {
  const goalValue = parseFloat(quarterGoal) || 0;

  if (goalValue <= 0) {
    return (
      <Card className="h-full shadow-md border-t-4 border-t-gray-300">
        <CardHeader>
          <CardTitle className="text-gray-700 flex items-center">
            <Target className="mr-2 h-5 w-5" />
            Quarter Goal Distribution
          </CardTitle>
          <CardDescription>Theoretical distribution: 90% Texas, 10% Out of Texas</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-64 text-gray-500">
          <AlertCircle className="h-10 w-10 mb-2 opacity-50" />
          <p>No goal set for the selected quarter</p>
        </CardContent>
      </Card>
    );
  }

  const txGoal = goalValue * 0.90;
  const ootGoal = goalValue * 0.10;

  const data = [
    { name: 'Texas Goal', value: txGoal, percentage: 90, color: '#3B82F6' },
    { name: 'Out of Texas Goal', value: ootGoal, percentage: 10, color: '#F59E0B' }
  ];

  const renderCustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="font-medium text-gray-900">{dataItem.name}</p>
          <p className="text-sm text-gray-600 mb-1">Percentage: {dataItem.percentage}%</p>
          <p className="font-bold text-gray-900">Value: {formatCurrency(dataItem.value)}</p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <ul className="flex flex-col gap-2 mt-4">
        {payload.map((entry, index) => {
          const { name, percentage, value, color } = entry.payload;
          return (
            <li key={`item-${index}`} className="flex items-center text-sm">
              <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: color }}></span>
              <span className="font-medium text-gray-700 mr-1">{name}</span>
              <span className="text-gray-400 mx-1">—</span>
              <span className="text-gray-600 font-medium">{percentage}%</span>
              <span className="text-gray-400 mx-1">—</span>
              <span className="font-bold text-gray-900">{formatCurrency(value)}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-bold text-sm drop-shadow-md">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="h-full shadow-md border-t-4 border-t-blue-500 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-gray-800 flex items-center">
          <Target className="mr-2 h-5 w-5 text-blue-500" />
          Quarter Goal Distribution
        </CardTitle>
        <CardDescription>Theoretical distribution: 90% Texas, 10% Out of Texas</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col pt-4">
        <div className="h-[220px] w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={90}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
              <Legend content={renderLegend} verticalAlign="bottom" wrapperStyle={{ paddingTop: "20px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-auto pt-6">
          <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Texas Goal (90%)</p>
            <p className="text-xl font-bold text-blue-950">{formatCurrency(txGoal)}</p>
          </div>
          <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-100 shadow-sm transition-all hover:shadow-md">
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Out of Texas (10%)</p>
            <p className="text-xl font-bold text-amber-950">{formatCurrency(ootGoal)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuarterGoalDistributionChart;
