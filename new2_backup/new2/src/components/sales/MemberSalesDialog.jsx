import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from '@/lib/customSupabaseClient';
import { formatCurrency } from "@/lib/salesUtils";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

const MemberSalesDialog = ({ isOpen, onOpenChange, member }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && member) {
        setLoading(true);
        const fetchSales = async () => {
            const { data, error } = await supabase
                .from('sales_records')
                .select('*')
                .eq('sales_member_id', member.id)
                .order('created_at', { ascending: false });
            
            if (!error && data) {
                setSales(data);
            }
            setLoading(false);
        };
        fetchSales();
    }
  }, [isOpen, member]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Ventas Individuales: {member?.name}</DialogTitle>
          <DialogDescription>
             Detalle de transacciones registradas por este miembro.
          </DialogDescription>
        </DialogHeader>
        
        <div className="max-h-[60vh] overflow-y-auto mt-4 border rounded-md">
           <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Cliente #</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                         <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                            </TableCell>
                         </TableRow>
                    ) : sales.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                Este miembro no tiene ventas registradas individualmente.
                            </TableCell>
                        </TableRow>
                    ) : (
                        sales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell className="text-xs text-gray-600">
                                    {format(new Date(sale.created_at), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell>{sale.state}</TableCell>
                                <TableCell>{sale.property_type}</TableCell>
                                <TableCell>{sale.client_number}</TableCell>
                                <TableCell className="text-right font-medium">
                                    {formatCurrency(sale.value)}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
           </Table>
        </div>
        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
             <span>Total Ventas: {sales.length}</span>
             <span>Suma Total: {formatCurrency(sales.reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0))}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberSalesDialog;