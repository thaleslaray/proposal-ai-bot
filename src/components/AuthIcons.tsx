import { Button } from '@/components/ui/button';
import { Shield, LogIn, LogOut, Trophy } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AuthIconsProps {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isInEvent: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onAdminClick: () => void;
  onEventsClick: () => void;
}

export const AuthIcons = ({ 
  isAuthenticated, 
  isAdmin, 
  isInEvent,
  onLogin, 
  onLogout,
  onAdminClick,
  onEventsClick
}: AuthIconsProps) => {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5">
        {isAuthenticated ? (
          <>
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onAdminClick}
                    className="h-6 w-6 hover:bg-accent/10 touch-manipulation"
                  >
                    <Shield className="h-3 w-3 text-accent" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Painel Admin</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {(isAdmin || isInEvent) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onEventsClick}
                    className="h-6 w-6 hover:bg-accent/10 touch-manipulation"
                  >
                    <Trophy className="h-3 w-3 text-accent" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{isAdmin ? 'Gerenciar Eventos' : 'Meu Evento'}</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onLogout}
        className="h-6 w-6 hover:bg-accent/10 touch-manipulation"
      >
        <LogOut className="h-3 w-3 text-accent" />
      </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        onClick={onLogin}
        className="h-6 w-6 hover:bg-accent/10 touch-manipulation"
      >
        <LogIn className="h-3 w-3 text-accent" />
      </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <p>Entrar</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
