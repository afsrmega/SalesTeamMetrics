import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/salesUtils';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Trash2 } from 'lucide-react';
import InvalidateSaleDialog from './InvalidateSaleDialog';
import { invalidateSale } from '@/lib/salesRecordsService';
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const AllSalesRecordsTable = () => {
  console.log('AUDIT FIX: AllSalesRecordsTable now uses correct member identifiers');
  const { toast } = useToast();
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordToInvalidate, setRecordToInvalidate] = useState(null);
  const [isInvalidating, setIsInvalidating] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sales_records')
        .select(`
          id,
          value,
          property_type,
          state,
          created_at,
          is_valid,
          invalidation_reason,
          is_deleted,
          deletion_reason,
          sales_team ( name )
        `)
        .order('created_at', { ascending: false });
        
      if (!showDeleted) {
          query = query.eq('is_deleted', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error("Error fetching all records:", err);
      toast({ title: "Error", description: "Failed to load records.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    
    const channel = supabase.channel('all-records-table')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_records' }, () => {
            fetchRecords();
        }).subscribe();
        
    return () => supabase.removeChannel(channel);
  }, [showDeleted]);

  const handleInvalidateClick = (record) => {
    setRecordToInvalidate(record);
  };

  const handleConfirmInvalidate = async (reason) => {
    if (!recordToInvalidate || !user) return;
    setIsInvalidating(true);
    try {
      await invalidateSale(recordToInvalidate.id, reason, user.id);
      toast({ title: "Éxito", description: "Venta invalidada correctamente." });
      setRecordToInvalidate(null);
      fetchRecords();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsInvalidating(false);
    }
  };

  if (loading && records.length === 0) {
      return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Historial de Ventas General</h3>
                <p className="text-sm text-gray-500">Vista de administrador de todos los registros de ventas.</p>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showDeleted" 
                  checked={showDeleted} 
                  onCheckedChange={(checked) => setShowDeleted(checked)}
                />
                <Label htmlFor="showDeleted" className="text-sm font-medium cursor-pointer text-gray-700">Mostrar Borradas</Label>
            </div>
        </div>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Miembro</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {records.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">No hay registros de ventas.</TableCell>
                    </TableRow>
                ) : (
                    records.map((record) => (
                    <TableRow key={record.id} className={!record.is_valid || record.is_deleted ? "bg-gray-50 opacity-75" : ""}>
                        <TableCell className="whitespace-nowrap">
                            {format(new Date(record.created_at), 'dd MMM yyyy, HH:mm')}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                            {record.sales_team?.name || 'Desconocido'}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">
                            {formatCurrency(record.value)}
                        </TableCell>
                        <TableCell>{record.property_type || '-'}</TableCell>
                        <TableCell>{record.state || '-'}</TableCell>
                        <TableCell>
                            {record.is_deleted ? (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Badge variant="outline" className="bg-gray-200 text-gray-600 border-gray-300">BORRADA</Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">Razón: {record.deletion_reason || "Sin razón."}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            ) : record.is_valid ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Válida</Badge>
                            ) : (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">INVALIDADA</Badge>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="max-w-xs">{record.invalidation_reason || "Sin razón especificada."}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            {record.is_valid && !record.is_deleted && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleInvalidateClick(record)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Invalidar
                                </Button>
                            )}
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
        </div>

        <InvalidateSaleDialog 
            isOpen={!!recordToInvalidate}
            onOpenChange={(open) => !open && setRecordToInvalidate(null)}
            onConfirm={handleConfirmInvalidate}
            isProcessing={isInvalidating}
        />
    </div>
  );
};

export default AllSalesRecordsTable;