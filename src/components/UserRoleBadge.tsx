import { Badge } from '@/components/ui/badge';
import { Crown, Zap, User, Skull } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCachedRole, setCachedRole } from '@/lib/roleCache';
import { logger } from '@/lib/logger';

interface UserRoleBadgeProps {
  userId: string;
  size?: 'sm' | 'md';
  showDescription?: boolean;
}

export const UserRoleBadge = ({
  userId,
  size = 'sm',
  showDescription = false,
}: UserRoleBadgeProps) => {
  const [role, setRole] = useState<'free' | 'student' | 'lifetime' | 'admin' | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = useCallback(async () => {
    // Tentar buscar do cache primeiro
    const cached = getCachedRole(userId);
    if (cached) {
      setRole(cached as 'free' | 'student' | 'lifetime' | 'admin');
      setIsLoading(false);
      return;
    }

    try {
      // Checar roles em ordem de prioridade
      const [adminCheck, lifetimeCheck, studentCheck] = await Promise.all([
        supabase.rpc('has_role', { _user_id: userId, _role: 'admin' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'lifetime' }),
        supabase.rpc('has_role', { _user_id: userId, _role: 'student' }),
      ]);

      let userRole: 'free' | 'student' | 'lifetime' | 'admin' = 'free';

      if (adminCheck.data === true) {
        userRole = 'admin';
      } else if (lifetimeCheck.data === true) {
        userRole = 'lifetime';
      } else if (studentCheck.data === true) {
        userRole = 'student';
      }

      setRole(userRole);
      setCachedRole(userId, userRole);
    } catch (error) {
      logger.error('Error fetching user role:', error);
      setRole('free'); // Fallback para free
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  if (isLoading || !role) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        <div
          className={`${size === 'sm' ? 'w-12 h-3' : 'w-16 h-4'} bg-muted-foreground/20 rounded`}
        />
      </Badge>
    );
  }

  // Configuração de cada role
  const roleConfig = {
    admin: {
      icon: <Crown className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
      label: 'Admin',
      variant: 'destructive' as const,
      description: 'Acesso total',
    },
    lifetime: {
      icon: <Skull className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
      label: 'Vitalício',
      variant: 'premium' as const,
      description: 'Documentos ilimitados',
    },
    student: {
      icon: <Zap className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
      label: 'Aluno',
      variant: 'secondary' as const,
      description: '2 Documentos/dia',
    },
    free: {
      icon: <User className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />,
      label: 'Free',
      variant: 'secondary' as const,
      description: '1 Documento/dia',
    },
  };

  const config = roleConfig[role];

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={config.variant}
        className={`flex items-center gap-1 ${
          size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
        }`}
      >
        {config.icon}
        {config.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-muted-foreground">{config.description}</span>
      )}
    </div>
  );
};
