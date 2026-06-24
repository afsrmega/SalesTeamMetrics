import React from 'react';
import ClientsPage from './ClientsPage';

const AdminClientsPage = () => {
  return (
    <div className="admin-clients">
      <div className="bg-orange-100 text-orange-800 p-2 text-center text-sm font-medium">Modo Administrador - Mostrando todos los clientes</div>
      <ClientsPage />
    </div>
  );
};

export default AdminClientsPage;