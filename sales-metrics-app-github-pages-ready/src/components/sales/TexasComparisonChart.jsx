import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Map, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/salesUtils";
import { supabase } from "@/lib/customSupabaseClient";

const CustomTooltipContent = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg z-50">
        <p className="font-bold text-gray-900 mb-1">{data.name}</p>
        <p className="text-sm text-gray-600">
          Ventas: <span className="font-semibold text-gray-900">{formatCurrency(data.value)}</span>
        </p>
        <p className="text-sm text-gray-600">
          Transacciones: <span className="font-semibold text-gray-900">{data.count}</span>
        </p>
      </div>
    );
  }
  return null;
};

const TexasComparisonChart = ({ salesTeam }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ tx: { value: 0, count: 0 }, out: { value: 0, count: 0 } });

  useEffect(() => {
    const fetchData = async () => {
      if (!salesTeam || salesTeam.length === 0) return;
      
      setLoading(true);
      try {
        const memberIds = salesTeam.map(m => m.id);
        const { data: records, error } = await supabase
          .from('sales_records')
          .select('state, value')
          .in('sales_member_id', memberIds);

        if (error) throw error;

        let txValue = 0;
        let txCount = 0;
        let outValue = 0;
        let outCount = 0;

        records.forEach(record => {
          const val = parseFloat(record.value) || 0;
          if (record.state === 'TX') {
            txValue += val;
            txCount++;
          } else {
            outValue += val;
            outCount++;
          }
        });

        setStats({
          tx: { value: txValue, count: txCount },
          out: { value: outValue, count: outCount }
        });

        setData([
          { name: 'Texas', value: txValue, count: txCount, fill: '#3B82F6' }, // blue-500
          { name: 'Out-of-State', value: outValue, count: outCount, fill: '#F97316' } // orange-500
        ]);
        
      } catch (err) {
        console.error("Error fetching geo sales data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [salesTeam]);

  if (!salesTeam || salesTeam.length === 0) return null;

  return (
    <Card className="shadow-lg border-blue-100 mt-6">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-orange-50 px-8 py-6 border-b border-blue-100">
        <CardTitle className="text-2xl text-gray-800 flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Map className="h-6 w-6 text-blue-700" />
          </div>
          Comparativa de Ventas: Texas vs. Out-of-State
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8">
        {loading ? (
          <div className="flex h-[300px] w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                    tick={{ fontSize: 12, fill: '#6b7280' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'transparent' }} />
                  <Legend />
                  <Bar dataKey="value" name="Volumen de Ventas" radius={[6, 6, 0, 0]} barSize={80}>
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col justify-center space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h4 className="text-blue-800 font-semibold mb-2 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                  Texas
                </h4>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(stats.tx.value)}
                </div>
                <div className="text-sm text-gray-600">
                  {stats.tx.count} transacciones
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 rounded-xl p-6">
                <h4 className="text-orange-800 font-semibold mb-2 flex items-center">
                  <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                  Out-of-State
                </h4>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatCurrency(stats.out.value)}
                </div>
                <div className="text-sm text-gray-600">
                  {stats.out.count} transacciones
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TexasComparisonChart;