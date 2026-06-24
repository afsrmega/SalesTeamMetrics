import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { calculateDateRange } from '@/lib/filterSalesRecords';
import { Filter, X } from 'lucide-react';
import { motion } from 'framer-motion';

const MODES = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'ayer', label: 'Ayer' },
  { id: '7dias', label: 'Últimos 7 días' },
  { id: '30dias', label: 'Últimos 30 días' },
  { id: 'mes', label: 'Este mes' },
  { id: 'trimestre', label: 'Este trimestre' },
  { id: 'custom', label: 'Personalizado' }
];

export default function SalesFiltersBlock({ 
  dateFilter, 
  setDateFilter, 
  includeResidential, 
  setIncludeResidential 
}) {
  const activeRange = calculateDateRange(dateFilter.mode, dateFilter.startDate, dateFilter.endDate);
  const isDateFiltered = dateFilter.mode !== 'reset';
  const isFiltered = isDateFiltered || !includeResidential;

  const handleReset = () => {
    setDateFilter({ mode: 'reset', startDate: null, endDate: null });
    setIncludeResidential(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-xl shadow-md border border-gray-100 mb-6 space-y-4"
    >
      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-custom-primary">
          <Filter className="w-5 h-5" /> Filtros Globales
        </h3>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-500 hover:text-red-600">
            <X className="w-4 h-4 mr-2" /> Limpiar Filtros
          </Button>
        )}
      </div>

      <div className="flex flex-col space-y-4">
        <div>
          <Label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider font-semibold">Rango de Fechas</Label>
          <div className="flex flex-wrap gap-2">
            {MODES.map(m => (
              <Button 
                key={m.id} 
                variant={dateFilter.mode === m.id ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDateFilter({ ...dateFilter, mode: m.id })}
                className={dateFilter.mode === m.id ? 'bg-custom-primary text-white hover:bg-custom-primary/90' : 'text-gray-600 border-gray-200'}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </div>

        {dateFilter.mode === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100"
          >
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Desde</Label>
              <Input 
                type="date" 
                value={dateFilter.startDate || ''} 
                onChange={e => setDateFilter({...dateFilter, startDate: e.target.value})} 
                className="h-9 text-sm w-40" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Hasta</Label>
              <Input 
                type="date" 
                value={dateFilter.endDate || ''} 
                onChange={e => setDateFilter({...dateFilter, endDate: e.target.value})} 
                className="h-9 text-sm w-40" 
              />
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-4 pt-2">
          <div className="flex items-center space-x-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
            <Switch 
              id="residential-toggle" 
              checked={includeResidential} 
              onCheckedChange={setIncludeResidential} 
              className="data-[state=checked]:bg-custom-primary"
            />
            <Label htmlFor="residential-toggle" className="cursor-pointer font-medium text-sm text-gray-700">
              {includeResidential ? 'Incluyendo Residenciales' : 'Sin Residenciales (Ocultos)'}
            </Label>
          </div>
        </div>
      </div>

      {isFiltered && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-50">
          {isDateFiltered && activeRange?.start && activeRange?.end && (
             <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                📅 Filtrando: {format(activeRange.start, 'MMM d, yyyy')} - {format(activeRange.end, 'MMM d, yyyy')}
             </Badge>
          )}
          <Badge variant="outline" className={includeResidential ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-purple-50 text-purple-700 border-purple-200 font-medium"}>
             🏠 {includeResidential ? 'Con residenciales' : 'Sin residenciales'}
          </Badge>
        </div>
      )}
    </motion.div>
  );
}