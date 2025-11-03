import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserAccessStatus } from './UserAccessStatus';
import { UserProfileButton } from './UserProfileButton';
import { AuthIcons } from './AuthIcons';
import { useIsMobile } from '@/hooks/use-mobile';
import { useState } from 'react';

interface TopBarProps {
  onAuthRequired?: () => void;
}

export const TopBar = ({ onAuthRequired }: TopBarProps) => {
  const location = useLocation();
  const { user, isAdmin, signOut, currentEvent } = useAuth();
  const isMobile = useIsMobile();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  
  // Não renderizar no admin
  if (location.pathname.startsWith('/admin')) return null;
  
  const isHome = location.pathname === '/';
  const isGallery = location.pathname === '/galeria';

  const handleLogin = () => {
    if (onAuthRequired) {
      onAuthRequired();
    } else {
      // Dispatch evento para abrir dialog de auth na página Index
      window.dispatchEvent(new CustomEvent('openAuthDialog'));
    }
  };

  const handleAdminClick = () => {
    window.location.href = '/admin';
  };

  const handleEventsClick = () => {
    if (isAdmin) {
      window.location.href = '/admin/eventos';
    } else if (currentEvent?.event_slug) {
      window.location.href = `/evento/${currentEvent.event_slug}`;
    }
  };
  
  return (
    <div className="fixed top-0 left-0 right-0 h-10 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center px-4 sm:px-5 md:px-6">
      <div className="w-full max-w-5xl flex items-center justify-between relative">
        {/* Zona Esquerda: Botões de Navegação */}
        <div className="flex items-center gap-2 min-w-0">
          {!isGallery && (
            <Link 
              to="/galeria"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-accent text-accent-foreground font-black text-[10px] sm:text-xs uppercase tracking-wide border-brutal hover:translate-x-0.5 hover:translate-y-0.5 transition-brutal whitespace-nowrap"
            >
              Galeria
            </Link>
          )}
          
          {isGallery && (
            <Link 
              to="/"
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-accent text-accent-foreground font-black text-[10px] sm:text-xs uppercase tracking-wide border-brutal hover:translate-x-0.5 hover:translate-y-0.5 transition-brutal whitespace-nowrap"
            >
              Criar PRD
            </Link>
          )}
        </div>
        
        {/* Zona Central: Badge do Plano */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          {user && <UserAccessStatus />}
        </div>
        
        {/* Zona Direita: Avatar + Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && !isMobile && (
            <span className="text-[10px] sm:text-xs text-white/90 font-medium truncate max-w-[80px] sm:max-w-[150px]">
              {user.user_metadata?.name?.split(' ')[0] || 'Usuário'}
            </span>
          )}
          {user && <UserProfileButton userId={user.id} userName={user.user_metadata?.name} />}
          <AuthIcons 
            isAuthenticated={!!user}
            isAdmin={isAdmin}
            isInEvent={!!currentEvent}
            onLogin={handleLogin}
            onLogout={signOut}
            onAdminClick={handleAdminClick}
            onEventsClick={handleEventsClick}
          />
        </div>
      </div>
    </div>
  );
};
