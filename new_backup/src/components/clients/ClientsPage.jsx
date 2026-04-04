
import React, { useState } from 'react';
import { useClientsData } from '@/hooks/useClientsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, History } from 'lucide-react';
import ClientHistoryDrawer from './ClientHistoryDrawer';

const ClientsPage = () => {
  const { clients, loading } = useClientsData();
  const [selectedClientForHistory, setSelectedClientForHistory] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const totalPotencial = clients.reduce((sum, c) => sum + Number(c.estimated_property_value || 0), 0);
  const pendingCount = clients.filter(c => c.pending_for_financials).length;

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-2xl font-bold mb-6">Mis Clientes</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Valor Total Clientes</h3>
          <p className="text-2xl font-bold">${totalPotencial.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow border">
          <h3 className="text-sm text-gray-500 font-semibold mb-1">Pendientes de Financiamiento</h3>
          <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Externo</TableHead>
              <TableHead>Tipo Propiedad</TableHead>
              <TableHead>Valor Est.</TableHead>
              <TableHead>Estado Financiero</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map(c => (
              <TableRow key={c.id}>
                <TableCell>{c.external_id || 'N/A'}</TableCell>
                <TableCell>{c.property_type || 'N/A'}</TableCell>
                <TableCell>${Number(c.estimated_property_value || 0).toLocaleString()}</TableCell>
                <TableCell>{c.pending_for_financials ? 'Pendiente' : 'Completado'}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => { setSelectedClientForHistory(c.id); setIsHistoryOpen(true); }}>
                    <History className="h-4 w-4 mr-2" /> Historial
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {clients.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-gray-500">No hay clientes.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ClientHistoryDrawer 
        open={isHistoryOpen} 
        onOpenChange={setIsHistoryOpen} 
        clientId={selectedClientForHistory} 
      />
    </div>
  );
};

export default ClientsPage;
