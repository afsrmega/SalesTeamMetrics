
import React from 'react';
import ProspectsPage from './ProspectsPage';

const AdminProspectsPage = () => {
  return (
    <div className="admin-prospects">
      <div className="bg-orange-100 text-orange-800 p-2 text-center text-sm font-medium">Modo Administrador - Mostrando todos los prospectos</div>
      <ProspectsPage />
    </div>
  );
};

export default AdminProspectsPage;
