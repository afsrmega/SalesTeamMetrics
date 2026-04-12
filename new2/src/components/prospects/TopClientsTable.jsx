
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from 'date-fns';
import { Edit, Calendar, FileText } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import EditClientModal from '@/components/clients/EditClientModal';
import UpdateFollowUpModal from '@/components/clients/UpdateFollowUpModal';
import ClientNotesHistoryDrawer from '@/components/clients/ClientNotesHistoryDrawer';

const TopClientsTable = ({ filteredClients, isLoading, refetch }) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  if (isLoading) {
    return <div className="text-center p-4">Cargando clientes...</div>;
  }

  if (!filteredClients || filteredClients.length === 0) {
    return <div className="text-center p-4 bg-white border rounded-lg shadow">No hay clientes para mostrar.</div>;
  }

  const handleEditClick = (client) => {
    setSelectedClient(client);
    setEditModalOpen(true);
  };

  const handleFollowUpClick = (client) => {
    setSelectedClient(client);
    setFollowUpModalOpen(true);
  };

  const handleNotesClick = (client) => {
    setSelectedClient(client);
    setNotesDrawerOpen(true);
  };

  const handleSave = () => {
    if (refetch) refetch();
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Valor Est.</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Próx. Contacto</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">{client.prospect_name || client.client_name || 'Sin Nombre'}</TableCell>
                <TableCell>${Number(client.estimated_property_value || 0).toLocaleString()}</TableCell>
                <TableCell>{client.property_type === 'Residential' ? 'Residencial' : 'Comercial'}</TableCell>
                <TableCell>
                  {client.pending_for_financials ? (
                    <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                      Pendiente Finanzas
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Al Día
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {client.client_follow_up_at 
                    ? format(new Date(client.client_follow_up_at), 'dd MMM yyyy') 
                    : <span className="text-gray-400">Sin programar</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <button 
                      type="button"
                      onClick={() => handleEditClick(client)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      title="Editar Cliente"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleFollowUpClick(client)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      title="Actualizar Seguimiento"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleNotesClick(client)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
                      title="Notas e Historial"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditClientModal 
        isOpen={editModalOpen} 
        onClose={() => setEditModalOpen(false)} 
        client={selectedClient} 
        onSave={handleSave} 
      />

      <UpdateFollowUpModal 
        isOpen={followUpModalOpen} 
        onClose={() => setFollowUpModalOpen(false)} 
        client={selectedClient} 
        onSave={handleSave} 
      />

      <ClientNotesHistoryDrawer 
        isOpen={notesDrawerOpen} 
        onClose={() => setNotesDrawerOpen(false)} 
        client={selectedClient} 
        onSave={handleSave}
        onEditClick={(c) => { setNotesDrawerOpen(false); handleEditClick(c); }}
        onFollowUpClick={(c) => { setNotesDrawerOpen(false); handleFollowUpClick(c); }}
      />
    </>
  );
};

export default TopClientsTable;
