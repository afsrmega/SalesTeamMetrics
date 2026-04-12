import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/salesUtils";
import { motion } from "framer-motion";
import { CalendarRange, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const WeeklySalesTable = ({ weeklyData, loading, error }) => {
  if (loading) {
    return (
      <Card className="mt-8 border shadow-sm">
        <CardHeader>
           <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
           <div className="space-y-2">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
           </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Error cargando datos semanales: {error}</span>
      </div>
    );
  }

  if (!weeklyData || weeklyData.length === 0) {
    return (
      <Card className="mt-8 border-dashed border-2 bg-gray-50/50">
        <CardContent className="flex flex-col items-center justify-center py-10 text-gray-400">
           <CalendarRange className="w-12 h-12 mb-2 opacity-20" />
           <p>No hay ventas registradas en este trimestre aún.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-8"
    >
      <Card className="border shadow-md overflow-hidden">
        <CardHeader className="bg-gray-50 border-b py-4">
          <CardTitle className="text-lg flex items-center gap-2 text-gray-800">
            <CalendarRange className="w-5 h-5 text-blue-600" />
            Desglose Semanal de Ventas (Trimestre Actual)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="w-[100px]">Semana</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Ventas Totales</TableHead>
                <TableHead className="text-center">Propiedades</TableHead>
                <TableHead>Promedio / Prop</TableHead>
                <TableHead>Tipo de Propiedad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyData.map((week, index) => (
                <motion.tr
                  key={week.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="font-medium text-gray-700">
                    <Badge variant="outline" className="bg-white group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200">
                        {week.weekLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{week.dateRange}</TableCell>
                  <TableCell className="font-bold text-green-700 text-base">
                    {formatCurrency(week.totalSales)}
                  </TableCell>
                  <TableCell className="text-center font-medium">
                     <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                       {week.count}
                     </span>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatCurrency(week.average)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs gap-1">
                      {week.residentialCount > 0 && (
                        <span className="text-blue-600 font-medium">
                           Residencial: {week.residentialCount}
                        </span>
                      )}
                      {week.commercialCount > 0 && (
                        <span className="text-orange-600 font-medium">
                           Comercial: {week.commercialCount}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default WeeklySalesTable;