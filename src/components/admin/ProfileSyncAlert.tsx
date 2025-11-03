import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface ProfileSyncHealth {
  total_users: number;
  total_profiles: number;
  missing_profiles: number;
  sync_percentage: number;
}

export function ProfileSyncAlert() {
  const queryClient = useQueryClient();

  const { data: healthCheck, isLoading } = useQuery({
    queryKey: ['profile-sync-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('check_profile_sync');
      if (error) throw error;
      return data?.[0] as ProfileSyncHealth;
    },
    refetchInterval: 60000, // Verificar a cada 1 minuto
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-profiles');
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
      toast.success(
        `✅ ${data.health.missing_profiles === 0 ? 'Todos os perfis sincronizados!' : `${data.health.total_profiles} perfis sincronizados`}`
      );
      queryClient.invalidateQueries({ queryKey: ['profile-sync-health'] });
    },
    onError: error => {
      logger.error('Sync error:', error);
      toast.error('Erro ao sincronizar perfis');
    },
  });

  // Só mostrar se houver problema ou estiver carregando
  if (isLoading) {
    return null;
  }

  // Se não há perfis faltando, não mostrar nada
  if (!healthCheck || healthCheck.missing_profiles === 0) {
    return null;
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>⚠️ Perfis Desincronizados</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {healthCheck.missing_profiles} usuários sem perfil (
          {(100 - healthCheck.sync_percentage).toFixed(2)}%)
        </span>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          size="sm"
          variant="outline"
        >
          {syncMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            'Sincronizar Agora'
          )}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
