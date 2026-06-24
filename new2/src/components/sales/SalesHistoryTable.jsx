import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/salesUtils';
import { format } from 'date-fns';
import { Loader2, Trash2 } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { isWithin48Hours, deleteSale } from '@/lib/salesRecordsService';
import DeleteSaleDialog from './DeleteSaleDialog';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

const SalesHistoryTable = ({ memberId, onSalesChange }) => {
  console.log('AUDIT FIX: SalesHistoryTable now uses correct member identifiers');
  const { user } = useAuth();
  const { toast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSales = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sales_records')
        .select('*')
        .eq('sales_member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (err) {
      console.error("Error fetching sales:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();

    const channel = supabase.channel(`sales-history-${memberId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'sales_records', filter: `sales_member_id=eq.${memberId}` }, 
        () => {
          fetchSales();
          if (onSalesChange) onSalesChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [memberId, onSalesChange]);

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
  };

  const handleConfirmDelete = async (reason) => {
    if (!recordToDelete || !user) return;
    setIsDeleting(true);
    try {
      const result = await deleteSale(recordToDelete.id, reason, user.id);
      if (result.success) {
        toast({ title: "Éxito", description: "Sale deleted successfully." });
        setRecordToDelete(null);
        fetchSales();
        if (onSalesChange) onSalesChange();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-gray-500" /></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-lg font-semibold text-gray-800">Tus Ventas (Recientes)</h3>
      </div>
      <div className="overflow-x-auto max-h-[400px]">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Estatus</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">No hay ventas registradas.</TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => {
                const within48h = isWithin48Hours(sale.created_at);
                const showDeleteBtn = !sale.is_deleted;
                const canDelete = within48h;

                return (
                  <TableRow key={sale.id} className={`${!sale.is_valid || sale.is_deleted ? 'opacity-60 bg-gray-50' : ''}`}>
                    <TableCell className="whitespace-nowrap">{format(new Date(sale.created_at), 'dd MMM, HH:mm')}</TableCell>
                    <TableCell className="font-medium text-gray-900">{formatCurrency(sale.value)}</TableCell>
                    <TableCell>
                       {sale.property_type}
                       {sale.property_subtype && <span className="block text-xs text-gray-500">{sale.property_subtype}</span>}
                    </TableCell>
                    <TableCell>{sale.state}</TableCell>
                    <TableCell className="text-gray-500 text-sm">#{sale.client_number}</TableCell>
                    <TableCell>
                      {sale.is_deleted ? (
                         <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                 <Badge variant="outline" className="bg-gray-200 text-gray-600 border-gray-300">BORRADA</Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                 <p className="max-w-xs">Razón: {sale.deletion_reason}</p>
                              </TooltipContent>
                            </Tooltip>
                         </TooltipProvider>
                      ) : sale.is_valid ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Válida</Badge>
                      ) : (
                        <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger>
                                <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Invalidada</Badge>
                             </TooltipTrigger>
                             <TooltipContent>
                                <p className="max-w-xs">{sale.invalidation_reason}</p>
                             </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                       {showDeleteBtn && (
                          <TooltipProvider>
                             <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => canDelete && handleDeleteClick(sale)}
                                      disabled={!canDelete}
                                      className={`text-red-600 hover:text-red-800 hover:bg-red-50 ${!canDelete ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                {!canDelete && (
                                   <TooltipContent>
                                     <p>Only can be deleted within first 48 hours</p>
                                   </TooltipContent>
                                )}
                             </Tooltip>
                          </TooltipProvider>
                       )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteSaleDialog 
         isOpen={!!recordToDelete}
         onOpenChange={(open) => !open && setRecordToDelete(null)}
         onConfirm={handleConfirmDelete}
         isProcessing={isDeleting}
      />
    </div>
  );
};

export default SalesHistoryTable;