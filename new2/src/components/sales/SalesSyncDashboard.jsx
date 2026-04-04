import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { syncSalesTotals } from "@/lib/salesService";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/salesUtils";
import { format } from "date-fns";
import { RefreshCw, CheckCircle2, AlertTriangle, Search, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const SalesSyncDashboard = () => {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    const { data } = await supabase.from('sales_team').select('id, name');
    if (data) setMembers(data);
  };

  const performAudit = async (memberId) => {
    if (!memberId) return;
    setIsLoading(true);
    setAuditData(null);

    try {
      // 1. Fetch current stored totals
      const { data: storedData } = await supabase
        .from('sales_team')
        .select('monthly_sales, quarterly_sales')
        .eq('id', memberId)
        .single();

      // 2. Fetch all records to calculate manually
      const { data: records } = await supabase
        .from('sales_records')
        .select('*')
        .eq('sales_member_id', memberId)
        .order('created_at', { ascending: false });

      // 3. Calculate expected totals
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const currentQuarter = Math.floor(currentMonth / 3);

      let calcMonthly = 0;
      let calcQuarterly = 0;

      records.forEach(r => {
        const d = new Date(r.created_at);
        const val = parseFloat(r.value || 0);
        
        if (d.getFullYear() === currentYear) {
            if (d.getMonth() === currentMonth) calcMonthly += val;
            if (Math.floor(d.getMonth() / 3) === currentQuarter) calcQuarterly += val;
        }
      });

      setAuditData({
        stored: {
            monthly: storedData.monthly_sales || 0,
            quarterly: storedData.quarterly_sales || 0
        },
        calculated: {
            monthly: calcMonthly,
            quarterly: calcQuarterly
        },
        records: records,
        discrepancy: (
            Math.abs((storedData.monthly_sales || 0) - calcMonthly) > 0.01 ||
            Math.abs((storedData.quarterly_sales || 0) - calcQuarterly) > 0.01
        )
      });

    } catch (error) {
      console.error("Audit error:", error);
      toast({ title: "Error", description: "Falló la auditoría del miembro.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMemberSelect = (val) => {
    setSelectedMember(val);
    performAudit(val);
  };

  const handleFixSync = async () => {
    if (!selectedMember) return;
    setIsSyncing(true);
    try {
        const result = await syncSalesTotals(selectedMember);
        
        if (result && result.success) {
            toast({ title: "Sincronización Exitosa", description: "Los datos han sido corregidos." });
            // Re-run audit to show everything is green now
            performAudit(selectedMember);
        } else {
            throw new Error("La función de sincronización no retornó éxito.");
        }
    } catch (error) {
        console.error(error);
        toast({ title: "Error al Sincronizar", description: error.message, variant: "destructive" });
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <Card className="shadow-lg border-purple-100">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-4">
            <CardTitle className="flex items-center text-purple-800">
                <Activity className="mr-2 h-6 w-6" />
                Auditoría y Sincronización de Datos
            </CardTitle>
            <CardDescription>
                Herramienta para administradores: verifica y corrige discrepancias entre el historial de ventas y los totales acumulados.
            </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="max-w-md mb-6">
                <label className="text-sm font-medium text-gray-700 mb-1 block">Seleccionar Miembro para Auditar</label>
                <Select onValueChange={handleMemberSelect} value={selectedMember || ""}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un miembro..." />
                    </SelectTrigger>
                    <SelectContent>
                        {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8 text-gray-500">
                    <RefreshCw className="animate-spin h-6 w-6 mr-2" />
                    Auditando datos...
                </div>
            )}

            {!isLoading && auditData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Comparison Card */}
                        <div className={`p-4 rounded-lg border ${auditData.discrepancy ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className={`font-bold text-lg ${auditData.discrepancy ? 'text-red-700' : 'text-green-700'}`}>
                                    {auditData.discrepancy ? '⚠️ Discrepancia Detectada' : '✅ Datos Sincronizados'}
                                </h3>
                                {auditData.discrepancy && (
                                    <Button 
                                        size="sm" 
                                        onClick={handleFixSync} 
                                        disabled={isSyncing}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        {isSyncing ? <RefreshCw className="animate-spin h-4 w-4 mr-2"/> : <RefreshCw className="h-4 w-4 mr-2"/>}
                                        Corregir Datos (Sync)
                                    </Button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500 font-medium">Totales Almacenados (DB)</p>
                                    <div className="mt-1 space-y-1">
                                        <p>Mes: <span className="font-mono font-bold">{formatCurrency(auditData.stored.monthly)}</span></p>
                                        <p>Quarter: <span className="font-mono font-bold">{formatCurrency(auditData.stored.quarterly)}</span></p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-gray-500 font-medium">Suma Real (Registros)</p>
                                    <div className="mt-1 space-y-1">
                                        <p>Mes: <span className="font-mono font-bold">{formatCurrency(auditData.calculated.monthly)}</span></p>
                                        <p>Quarter: <span className="font-mono font-bold">{formatCurrency(auditData.calculated.quarterly)}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <div className="flex items-center space-x-2 mb-2">
                                <Search className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-600">Total Registros Históricos:</span>
                                <span className="font-bold text-gray-900">{auditData.records.length}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                * Los cálculos se basan en la fecha de creación del registro. Mes actual y trimestre actual.
                            </p>
                        </div>
                    </div>

                    {/* Detailed Records Table Preview */}
                    <div className="border rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 border-b">
                            Últimos 5 Registros de Venta
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="text-right">Valor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {auditData.records.slice(0, 5).map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell className="text-xs">{format(new Date(r.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                                        <TableCell>{r.property_type}</TableCell>
                                        <TableCell className="text-right font-medium">{formatCurrency(r.value)}</TableCell>
                                    </TableRow>
                                ))}
                                {auditData.records.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-gray-500 py-4">Sin registros</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </CardContent>
    </Card>
  );
};

export default SalesSyncDashboard;