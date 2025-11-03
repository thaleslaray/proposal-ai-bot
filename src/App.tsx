import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";
import { debugLog } from "@/utils/debugLogger";
import Index from "./pages/Index";
import Admin from "./pages/Admin";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Privacy from "./pages/Privacy";
import PrivacySettings from "./pages/PrivacySettings";
import NotFound from "./pages/NotFound";
import EventPage from "./pages/EventPage";
import EventProjection from "./pages/EventProjection";
import AdminEvents from "./pages/AdminEvents";
import LiveEventDashboard from "./pages/LiveEventDashboard";

const queryClient = new QueryClient();

// Componentes de rota protegida FORA do App para ter acesso ao AuthContext
const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  
  debugLog('🔐 ProtectedAdminRoute CHECK:', {
    isAdmin,
    loading,
    timestamp: new Date().toISOString()
  });
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }
  
  if (!isAdmin) {
    debugLog('❌ Acesso negado - redirecionando');
    return <Navigate to="/" replace />;
  }
  
  debugLog('✅ Acesso concedido ao admin');
  return <>{children}</>;
};

const ProtectedProfileRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/" replace />;
};

const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Index />} />
        <Route path="/galeria" element={<Community />} />
        <Route path="/u/:username" element={<Profile />} />
        <Route path="/privacidade" element={<Privacy />} />
        <Route
          path="/editar-perfil"
          element={
            <ProtectedProfileRoute>
              <EditProfile />
            </ProtectedProfileRoute>
          }
        />
        <Route
          path="/configuracoes/privacidade"
          element={
            <ProtectedProfileRoute>
              <PrivacySettings />
            </ProtectedProfileRoute>
          }
        />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedAdminRoute>
                  <Admin />
                </ProtectedAdminRoute>
              } 
            />
            <Route path="/evento/:slug" element={<EventPage />} />
            <Route path="/evento/:slug/projecao" element={<EventProjection />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
};

export default App;
