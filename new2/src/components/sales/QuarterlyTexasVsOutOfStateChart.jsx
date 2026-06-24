import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Map, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/salesUtils";
import { supabase } from "@/lib/customSupabaseClient";
import { getQuarterDateRange } from "@/lib/getQuarterDateRange";

const CustomTooltipContent = ({ active, payload }) => {
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

const QuarterlyTexasVsOutOfStateChart = ({
  selectedQuarter,
  includeResidential = true,
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodLabel, setPeriodLabel] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      console.log('📊 [QuarterlyTexasVsOutOfState] Fetching data...');
      console.log('  selectedQuarter:', selectedQuarter);
      console.log('  includeResidential:', includeResidential);
      
      setLoading(true);
      setError(null);
      
      try {
        let year, quarter, label;
        if (!selectedQuarter || selectedQuarter === 'current') {
           const now = new Date();
           year = now.getFullYear();
           quarter = Math.floor(now.getMonth() / 3) + 1;
           label = `Q${quarter} FY${year}`;
        } else if (selectedQuarter.includes('FY')) {
           const parts = selectedQuarter.split('-');
           year = parseInt(parts[0].replace('FY', ''));
           quarter = parseInt(parts[1].replace('Q', ''));
           label = selectedQuarter;
        } else {
           const parts = selectedQuarter.split('-');
           year = parseInt(parts[0]);
           quarter = parseInt(parts[1]);
           label = `Q${quarter} FY${year}`;
        }

        const qDates = getQuarterDateRange(year, quarter);
        const startDate = qDates.start;
        const endDate = qDates.end;

        setPeriodLabel(`Quarter: ${label}`);
        console.log(`📅 [QuarterlyTexasVsOutOfState] Date range (${label}): ${startDate.toISOString()} to ${endDate.toISOString()}`);

        let query = supabase
          .from('sales_records')
          .select('state, value, property_type, created_at')
          .eq('is_valid', true)
          .eq('is_deleted', false)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());

        const { data: records, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        let txTotal = 0, txCount = 0;
        let outTotal = 0, outCount = 0;

        records.forEach(record => {
          if (!includeResidential) {
            const pt = (record.property_type || '').toLowerCase().trim();
            if (pt === 'residential' || pt === 'residencial') {
              return; 
            }
          }

          const val = parseFloat(record.value) || 0;
          const state = (record.state || '').toUpperCase().trim();

          if (state === 'TX' || state === 'TEXAS') {
            txTotal += val;
            txCount++;
          } else {
            outTotal += val;
            outCount++;
          }
        });

        console.log(`✅ [QuarterlyTexasVsOutOfState] Fetched ${records.length} total records`);
        console.log(`💰 [QuarterlyTexasVsOutOfState] Texas: ${formatCurrency(txTotal)} (${txCount}), Out: ${formatCurrency(outTotal)} (${outCount})`);

        setData({ txTotal, txCount, outTotal, outCount });
      } catch (err) {
        console.error('❌ [QuarterlyTexasVsOutOfState] Error fetching data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedQuarter, includeResidential]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col h-[300px] w-full items-center justify-center text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p>Cargando datos trimestrales...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col h-[300px] w-full items-center justify-center text-red-500">
          <AlertCircle className="h-8 w-8 mb-4" />
          <p className="font-semibold text-red-600">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      );
    }

    if (!data || (data.txCount === 0 && data.outCount === 0)) {
      return (
        <div className="flex flex-col h-[300px] w-full items-center justify-center text-gray-400">
          <Map className="h-12 w-12 mb-4 opacity-20" />
          <p>No hay datos disponibles para este trimestre.</p>
        </div>
      );
    }

    const chartData = [
      { name: 'Texas', value: data.txTotal, count: data.txCount, fill: '#3B82F6' },
      { name: 'Out-of-State', value: data.outTotal, count: data.outCount, fill: '#F97316' }
    ];

    const combinedTotal = data.txTotal + data.outTotal;
    const combinedCount = data.txCount + data.outCount;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 13, fill: '#6b7280', fontWeight: 500 }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                tickFormatter={(value) => formatCurrency(value, 0)} 
                tick={{ fontSize: 12, fill: '#6b7280' }} 
                axisLine={false} 
                tickLine={false} 
                width={80}
              />
              <Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'transparent' }} />
              <Legend />
              <Bar dataKey="value" name="Volumen de Ventas" radius={[6, 6, 0, 0]} barSize={80} animationDuration={1000}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex flex-col justify-center space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-blue-800 font-semibold mb-2 flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-600 mr-2"></span>
              Texas
            </h4>
            <div className="text-3xl font-bold text-blue-900 mb-1">
              {formatCurrency(data.txTotal)}
            </div>
            <div className="text-sm font-medium text-blue-700">
              {data.txCount} transacciones
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-orange-800 font-semibold mb-2 flex items-center">
              <span className="w-3 h-3 rounded-full bg-orange-600 mr-2"></span>
              Out-of-State
            </h4>
            <div className="text-3xl font-bold text-orange-900 mb-1">
              {formatCurrency(data.outTotal)}
            </div>
            <div className="text-sm font-medium text-orange-700">
              {data.outCount} transacciones
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 mt-2">
            <h4 className="text-gray-500 font-medium text-sm uppercase mb-1">Total Combinado</h4>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(combinedTotal)}</div>
            <div className="text-sm text-gray-500">{combinedCount} transacciones totales</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-blue-100 mt-6 w-full">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-orange-50 px-8 py-6 border-b border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl text-gray-800 flex items-center gap-3">
              <div className="p-2 bg-white/60 backdrop-blur-sm rounded-lg shadow-sm">
                <Map className="h-6 w-6 text-blue-700" />
              </div>
              Comparativa Trimestral: Texas vs Out-of-State
            </CardTitle>
            <CardDescription className="mt-2 text-gray-600 font-medium flex items-center gap-2">
              <span className="bg-gray-200/50 px-2 py-1 rounded text-gray-700">{periodLabel}</span>
              {!includeResidential && <span className="text-orange-600 font-semibold">(Excluyendo Residencial)</span>}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default QuarterlyTexasVsOutOfStateChart;