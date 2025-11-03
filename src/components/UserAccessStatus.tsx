import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap, User, Skull, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

export const UserAccessStatus = () => {
  const { user, isStudent, isLifetime, isAdmin, refreshRoles, currentEvent, eventLimit } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  if (!user) return null;
  
  // Determinar badge
  let badgeContent: string;
  let badgeVariant: 'default' | 'secondary' | 'destructive' | 'premium' = 'default';
  let icon: React.ReactNode;
  let description: string;
  let isEventMode = false;
  
  // Priorizar evento ativo com gerações ilimitadas
  if (currentEvent && eventLimit === -1) {
    icon = <Zap className="w-3 h-3" />;
    badgeVariant = 'default';
    badgeContent = 'EVENTO ATIVO';
    description = 'Gerações Ilimitadas! 🎉';
    isEventMode = true;
  } else if (isAdmin) {
    icon = <Crown className="w-3 h-3 text-yellow-400" />;
    badgeVariant = 'destructive';
    badgeContent = 'Admin';
    description = 'Acesso total';
  } else if (isLifetime) {
    icon = <Skull className="w-3 h-3 text-purple-400" />;
    badgeVariant = 'premium';
    badgeContent = 'Vitalício';
    description = 'Documentos ilimitados';
  } else if (isStudent) {
    icon = <Zap className="w-3 h-3 text-yellow-500" />;
    badgeVariant = 'secondary';
    badgeContent = 'Aluno';
    description = '2 Documentos por dia';
  } else {
    icon = <User className="w-3 h-3 text-gray-400" />;
    badgeVariant = 'secondary';
    badgeContent = 'Free';
    description = '1 Documento por dia';
  }
  
  const handleRefreshRoles = async () => {
    setIsRefreshing(true);
    try {
      await refreshRoles();
      toast.success('Roles atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar roles');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant={badgeVariant} 
        className={`flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 ${
          isEventMode ? 'bg-accent text-accent-foreground border-4 border-foreground shadow-brutal font-black uppercase tracking-wider' : ''
        }`}
      >
        {icon}
        {badgeContent}
      </Badge>
      <span className="text-[10px] sm:text-xs text-white/90 hidden sm:inline">
        {description}
      </span>
      {isAdmin && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefreshRoles}
          disabled={isRefreshing}
          className="h-6 w-6 p-0"
          title="Atualizar roles"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
};
