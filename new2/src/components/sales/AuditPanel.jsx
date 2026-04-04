import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { runFullAudit, correctAllSalesDiscrepancies } from "@/lib/salesService";
import { formatCurrency } from "@/lib/salesUtils";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldCheck, Play, Wrench } from "lucide-react";
import { format } from "date-fns";

const AuditPanel = () => {
  const [auditResults, setAuditResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const { toast } = useToast();

  const handleRunAudit = async () => {
    setIsLoading(true);
    try {
      const results = await runFullAudit();
      setAuditResults(results);
      setLastRun(new Date());
      
      const issues = results.filter(r => r.status === 'DISCREPANCY').length;
      if (issues > 0) {
        toast({ title: "Auditoría Completada", description: `Se encontraron ${issues} discrepancias.`, variant: "destructive" });
      } else {
        toast({ title: "Auditoría Completada", description: "Todos los datos están sincronizados.", className: "bg-green-600 text-white" });
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudo ejecutar la auditoría.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCorrectData = async () => {
    setIsCorrecting(true);
    try {
      const result = await correctAllSalesDiscrepancies();
      toast({ 
        title: "Corrección Completada", 
        description: `Se han recalculado los datos de ${result.correctedCount} miembros.`,
      });
      // Auto re-run audit to verify
      await handleRunAudit();
    } catch (error) {
      toast({ title: "Error", description: "Falló la corrección de datos.", variant: "destructive" });
    } finally {
      setIsCorrecting(false);
    }
  };

  const discrepanciesCount = auditResults ? auditResults.filter(r => r.status === 'DISCREPANCY').length : 0;
  const totalChecked = auditResults ? auditResults.length : 0;

  return (
    <div className="space-y-6">
      <Card className="border-t-4 border-t-purple-500 shadow-md">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 pb-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-xl text-gray-800">
                <ShieldCheck className="mr-2 h-6 w-6 text-purple-600" />
                Auditoría y Sincronización
              </CardTitle>
              <CardDescription className="mt-1">
                Herramienta administrativa para verificar la integridad de los datos de ventas.
              </CardDescription>
            </div>
            {lastRun && (
              <Badge variant="outline" className="bg-white">
                Última ejecución: {format(lastRun, "dd/MM/yyyy HH:mm:ss")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
               <span className="text-sm text-gray-500 font-medium uppercase">Estado General</span>
               <div className="mt-2 flex items-center">
                 {auditResults ? (
                    discrepanciesCount > 0 ? 
                    <span className="flex items-center text-red-600 font-bold"><AlertTriangle className="w-5 h-5 mr-1"/> Atención Requerida</span> : 
                    <span className="flex items-center text-green-600 font-bold"><CheckCircle2 className="w-5 h-5 mr-1"/> Sistema Saludable</span>
                 ) : (
                    <span className="text-gray-400 italic">Pendiente de ejecución</span>
                 )}
               </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
               <span className="text-sm text-gray-500 font-medium uppercase">Miembros Evaluados</span>
               <span className="text-2xl font-bold text-gray-800 mt-1">{totalChecked}</span>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center justify-center text-center">
               <span className="text-sm text-gray-500 font-medium uppercase">Discrepancias</span>
               <span className={`text-2xl font-bold mt-1 ${discrepanciesCount > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                 {discrepanciesCount}
               </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
                onClick={handleRunAudit} 
                disabled={isLoading || isCorrecting}
                className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
            >
                {isLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4"/>}
                {isLoading ? "Auditando..." : "Ejecutar Auditoría Completa"}
            </Button>
            
            <Button 
                onClick={handleCorrectData} 
                variant="destructive"
                disabled={isLoading || isCorrecting} 
                className="w-full sm:w-auto"
            >
                {isCorrecting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <Wrench className="mr-2 h-4 w-4"/>}
                {isCorrecting ? "Corrigiendo..." : "Corregir Todos los Datos"}
            </Button>
          </div>

          {auditResults && (
            <div className="border rounded-md overflow-hidden bg-white shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Resultados del Análisis</h3>
                <span className="text-xs text-gray-500">* Mostrando discrepancias y estados</span>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Miembro</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Detalle de Error (Si existe)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {auditResults.map((result) => (
                            <TableRow key={result.id} className={result.status === 'DISCREPANCY' ? 'bg-red-50' : ''}>
                                <TableCell className="font-medium">{result.name}</TableCell>
                                <TableCell>
                                    {result.status === 'OK' ? (
                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Sincronizado</Badge>
                                    ) : (
                                        <Badge variant="destructive">Discrepancia</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-sm">
                                    {result.status === 'DISCREPANCY' && result.details && (
                                        <div className="space-y-1 text-xs text-red-700">
                                            {Math.abs(result.details.monthlySales.stored - result.details.monthlySales.actual) > 0.01 && (
                                                <p>Ventas Mes: DB({formatCurrency(result.details.monthlySales.stored)}) vs Real({formatCurrency(result.details.monthlySales.actual)})</p>
                                            )}
                                            {Math.abs(result.details.quarterlySales.stored - result.details.quarterlySales.actual) > 0.01 && (
                                                <p>Ventas Tri: DB({formatCurrency(result.details.quarterlySales.stored)}) vs Real({formatCurrency(result.details.quarterlySales.actual)})</p>
                                            )}
                                            {Math.abs(result.details.monthlyBilling.stored - result.details.monthlyBilling.actual) > 0.01 && (
                                                <p>Billing Mes: DB({formatCurrency(result.details.monthlyBilling.stored)}) vs Real({formatCurrency(result.details.monthlyBilling.actual)})</p>
                                            )}
                                        </div>
                                    )}
                                    {result.status === 'OK' && <span className="text-gray-400">-</span>}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditPanel;