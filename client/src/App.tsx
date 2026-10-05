import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';

import { SuperAdminDashboard } from './pages/superadmin/SuperAdminDashboard';
import { CompanyDashboard } from './pages/company/CompanyDashboard';
import { WhatsAppConnect } from './pages/company/WhatsAppConnect';
import { MenuManager } from './pages/company/MenuManager';
import { KnowledgeBase } from './pages/company/KnowledgeBase';
import { LiveOrders } from './pages/company/LiveOrders';
import { ChatLogs } from './pages/company/ChatLogs';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Loading ChatPilot Platform...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

const CompanyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/superadmin" replace />;
  }
  return <>{children}</>;
};

const IndexRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/superadmin" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<IndexRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Super Admin Protected Routes */}
            <Route
              path="/superadmin"
              element={
                <ProtectedLayout>
                  <SuperAdminRoute>
                    <SuperAdminDashboard />
                  </SuperAdminRoute>
                </ProtectedLayout>
              }
            />
            <Route
              path="/superadmin/stats"
              element={
                <ProtectedLayout>
                  <SuperAdminRoute>
                    <SuperAdminDashboard />
                  </SuperAdminRoute>
                </ProtectedLayout>
              }
            />

            {/* Company Admin Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedLayout>
                  <CompanyRoute>
                    <CompanyDashboard />
                  </CompanyRoute>
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard/whatsapp"
              element={
                <ProtectedLayout>
                  <CompanyRoute>
                    <WhatsAppConnect />
                  </CompanyRoute>
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard/orders"
              element={
                <ProtectedLayout>
                  <CompanyRoute>
                    <LiveOrders />
                  </CompanyRoute>
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard/menu"
              element={
                <ProtectedLayout>
                  <CompanyRoute>
                    <MenuManager />
                  </CompanyRoute>
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard/knowledge"
              element={
                <ProtectedLayout>
                  <CompanyRoute>
                    <KnowledgeBase />
                  </CompanyRoute>
                </ProtectedLayout>
              }
            />
            <Route
              path="/dashboard/chats"
              element={
                <ProtectedLayout>
                  <CompanyRoute>
                    <ChatLogs />
                  </CompanyRoute>
                </ProtectedLayout>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
