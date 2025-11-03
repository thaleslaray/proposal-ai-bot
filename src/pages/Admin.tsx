import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { LoadingState } from '@/components/states/LoadingState';
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import AdminDocuments from './AdminDocuments';
import AdminAnalytics from './AdminAnalytics';
import AdminSettings from './AdminSettings';
import AdminEvents from './AdminEvents';
import LiveEventDashboard from './LiveEventDashboard';
import AdminEventControl from './AdminEventControl';
import AdminEventVotingConfig from './AdminEventVotingConfig';
import EventProjection from './EventProjection';

export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  if (loading) {
    return <LoadingState variant="fullscreen" message="Carregando painel admin..." />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex bg-muted">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 border-4 border-black bg-white shadow-brutal">
            <div className="flex h-16 items-center px-4 gap-4">
              <SidebarTrigger className="text-foreground hover:text-accent transition-brutal" />
              <AdminHeader />
            </div>
          </header>

          <main className="flex-1 container mx-auto px-4 py-6 space-y-6 bg-muted">
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/documents" element={<AdminDocuments />} />
              <Route path="/eventos" element={<AdminEvents />} />
              <Route path="/eventos/:slug/dashboard" element={<LiveEventDashboard />} />
              <Route path="/eventos/:slug/controle" element={<AdminEventControl />} />
              <Route path="/eventos/:slug/votacao-config" element={<AdminEventVotingConfig />} />
              <Route path="/eventos/:slug/projecao" element={<EventProjection />} />
              <Route path="/analytics" element={<AdminAnalytics />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
