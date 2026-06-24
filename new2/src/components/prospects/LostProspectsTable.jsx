import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw } from 'lucide-react';

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';

const LostProspectsTable = ({ prospects, onRestore, isLoading }) => {
  if (isLoading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-20 w-full" /></div>;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Calificación</TableHead>
            <TableHead>Valor Est.</TableHead>
            <TableHead>Razón</TableHead>
            <TableHead>Fecha Pérdida</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!prospects || prospects.length === 0) ? (
            <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No hay prospectos perdidos.</TableCell></TableRow>
          ) : (
            prospects.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.prospect_name || '—'}</TableCell>
                <TableCell><Badge variant="secondary">{p.qualification}/10</Badge></TableCell>
                <TableCell>{formatCurrency(p.estimated_property_value)}</TableCell>
                <TableCell><Badge variant="destructive">{p.lost_reason || 'Desconocida'}</Badge></TableCell>
                <TableCell>{formatDate(p.lost_at)}</TableCell>
                <TableCell className="max-w-[200px] truncate" title={p.lost_notes}>{p.lost_notes || '—'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onRestore(p)}>
                    <RefreshCcw className="h-4 w-4 mr-2" /> Restaurar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default LostProspectsTable;