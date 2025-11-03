import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Crown, RefreshCw, Tags } from 'lucide-react';
import { debugLog } from '@/utils/debugLogger';
import { logger } from '@/lib/logger';

export const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);

  if (!isAdmin) return null;

  const promoteUser = async () => {
    if (!phone) {
      toast.error('Digite um número de telefone');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-role', {
        body: {
          target_phone: phone,
          new_role: 'student',
        },
      });

      if (error) throw error;

      toast.success('✅ Usuário promovido para aluno!');
      setPhone('');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao promover usuário';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const migratePRDMetadata = async (forceAll = false) => {
    setMigrating(true);
    const message = forceAll
      ? '⚡ Forçando re-geração de TODOS os PRDs...'
      : '🔄 Iniciando migração de metadados...';
    toast.loading(message);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-prd-titles', {
        body: { force_remigrate: forceAll },
      });

      if (error) throw error;

      debugLog('📊 Resultado da migração:', data);
      toast.dismiss();
      toast.success(
        `✅ Migração concluída! ${data.updated}/${data.total} PRDs atualizados (${data.success_rate})`
      );

      if (data.failed > 0) {
        toast.warning(`⚠️ ${data.failed} PRDs falharam`);
      }
    } catch (error: unknown) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Erro na migração';
      toast.error(errorMessage);
      logger.error('❌ Erro na migração:', error);
    } finally {
      setMigrating(false);
    }
  };

  const recategorizeAllPRDs = async (dryRun = false) => {
    setRecategorizing(true);
    const message = dryRun
      ? '🔍 Simulando re-categorização...'
      : '🏷️ Re-categorizando PRDs públicos...';
    toast.loading(message);

    try {
      const { data, error } = await supabase.functions.invoke('recategorize-all-prds', {
        body: { dryRun },
      });

      if (error) throw error;

      debugLog('📊 Resultado da re-categorização:', data);
      toast.dismiss();

      if (dryRun) {
        toast.info(`🔍 Simulação: ${data.modified}/${data.total} PRDs seriam modificados`, {
          description: Object.entries(data.changes || {})
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n'),
        });
      } else {
        toast.success(`✅ ${data.modified}/${data.total} PRDs re-categorizados!`, {
          description: `${data.summary.unchanged} inalterados, ${data.summary.failed} erros`,
        });
      }
    } catch (error: unknown) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Erro na re-categorização';
      toast.error(errorMessage);
      logger.error('❌ Erro na re-categorização:', error);
    } finally {
      setRecategorizing(false);
    }
  };

  return (
    <Card className="border-brutal shadow-brutal">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-yellow-500" />
          Painel Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-bold">Promover para Aluno</label>
          <div className="flex gap-2 mt-2">
            <Input
              type="tel"
              placeholder="5511987654321"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
            <Button onClick={promoteUser} disabled={loading}>
              Promover
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <label className="text-sm font-bold">Migração de Metadados</label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Atualiza título + descrição dos PRDs usando IA
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => migratePRDMetadata(false)}
              disabled={migrating}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />
              Migrar Novos
            </Button>
            <Button
              onClick={() => migratePRDMetadata(true)}
              disabled={migrating}
              variant="default"
              className="flex-1"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${migrating ? 'animate-spin' : ''}`} />⚡ Re-gerar
              TODOS
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <label className="text-sm font-bold">Re-categorização de PRDs</label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Re-classifica categorias de TODOS os PRDs públicos usando prompt melhorado
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => recategorizeAllPRDs(true)}
              disabled={recategorizing}
              variant="outline"
              className="flex-1"
            >
              <Tags className={`w-4 h-4 mr-2 ${recategorizing ? 'animate-spin' : ''}`} />
              🔍 Simular
            </Button>
            <Button
              onClick={() => recategorizeAllPRDs(false)}
              disabled={recategorizing}
              variant="default"
              className="flex-1"
            >
              <Tags className={`w-4 h-4 mr-2 ${recategorizing ? 'animate-spin' : ''}`} />✅ Aplicar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
