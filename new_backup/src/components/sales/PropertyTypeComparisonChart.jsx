import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { formatCurrency } from "@/lib/salesUtils";
import { Building2, Home } from "lucide-react";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-800 mb-1">{label}</p>
        <p className="text-sm font-medium" style={{ color: payload[0].color }}>
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const PropertyTypeComparisonChart = ({ comparisonData }) => {
  if (!comparisonData) return null;

  const data = [
    {
      name: "Residencial",
      value: comparisonData.residential || 0,
      color: "#3b82f6", // Blue-500
      icon: Home
    },
    {
      name: "Comercial / Otros",
      value: comparisonData.commercial || 0,
      color: "#f97316", // Orange-500
      icon: Building2
    }
  ];

  const total = (comparisonData.residential || 0) + (comparisonData.commercial || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="shadow-lg border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-blue-100">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                Ventas por Tipo de Propiedad
              </CardTitle>
              <CardDescription>
                Comparativa de volumen de ventas Residencial vs Comercial (Mes Actual)
              </CardDescription>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-500 uppercase font-semibold">Total Mes</span>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                layout="horizontal"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 13, fill: '#4b5563', fontWeight: 500 }} 
                  axisLine={false} 
                  tickLine={false} 
                  dy={10}
                />
                <YAxis 
                  tickFormatter={(value) => `${formatCurrency(value, 0)}`} 
                  tick={{ fontSize: 12, fill: '#6b7280' }} 
                  axisLine={false} 
                  tickLine={false} 
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                <Legend iconType="circle" />
                <Bar dataKey="value" name="Volumen de Ventas" radius={[6, 6, 0, 0]} barSize={80} animationDuration={1500}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PropertyTypeComparisonChart;