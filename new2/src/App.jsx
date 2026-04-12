import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/components/LoginPage';
import SalesLoginPage from '@/components/SalesLoginPage';
import MainPage from '@/components/MainPage';
import SalesMemberDashboard from '@/components/SalesMemberDashboard';
import ProspectsPage from '@/components/prospects/ProspectsPage';
import AdminProspectsPage from '@/components/prospects/AdminProspectsPage';
import ClientsPage from '@/components/clients/ClientsPage';
import AdminClientsPage from '@/components/clients/AdminClientsPage';
import Header from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/SupabaseAuthContext';
import { useColorPreferences } from '@/hooks/useColorPreferences';

const GlobalStyles = () => {
  useColorPreferences(); 
  return null;
};

const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/sales-dashboard" replace />;
  return children;
};

const SalesRoute = ({ children }) => {
  const { user, isSalesMember, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;
  if (!user) return <Navigate to="/sales-login" replace />;
  if (!isSalesMember) return <Navigate to="/admin" replace />;
  return children;
};

const PublicRoute = ({ children, type = "admin" }) => {
  const { user, isAdmin, isSalesMember, loading } = useAuth();
  if (loading) return null;
  if (user) {
    if (isSalesMember) return <Navigate to="/sales-dashboard" replace />;
    if (isAdmin) return <Navigate to="/admin" replace />;
  }
  return children;
};

const AppContent = () => {
  const { user, signOut, isSalesMember } = useAuth();

  return (
    <>
      <GlobalStyles />
      {user && <Header user={user} onLogout={signOut} isSalesMember={isSalesMember} />}
      <Routes>
        <Route path="/" element={<PublicRoute type="admin"><LoginPage onLoginSuccess={() => {}} /></PublicRoute>} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/sales-login" element={<PublicRoute type="sales"><SalesLoginPage /></PublicRoute>} />

        <Route path="/admin" element={<AdminRoute><MainPage /></AdminRoute>} />
        <Route path="/admin/prospects" element={<AdminRoute><AdminProspectsPage /></AdminRoute>} />
        <Route path="/admin/clients" element={<AdminRoute><AdminClientsPage /></AdminRoute>} />

        <Route path="/sales-dashboard" element={<SalesRoute><SalesMemberDashboard /></SalesRoute>} />
        <Route path="/prospects" element={<SalesRoute><ProspectsPage /></SalesRoute>} />
        <Route path="/clients" element={<SalesRoute><ClientsPage /></SalesRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;