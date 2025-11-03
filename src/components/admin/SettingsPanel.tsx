import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { setDebugMode, isDebugEnabled } from '@/utils/debugLogger';
import { UserPlus, Sliders, Database, Terminal, Tags, Shield } from 'lucide-react';
import { logger } from '@/lib/logger';

interface LimitConfig {
  role: string;
  daily_limit: number;
}

const ROLE_LABELS: Record<string, string> = {
  free: 'Usuários Free',
  student: 'Estudantes',
  event_participant: 'Participantes de Evento',
  lifetime: 'Lifetime Members',
  admin: 'Administradores',
};

interface RecategorizationReport {
  modified: number;
  total: number;
  processed?: number;
  changes?: Record<string, unknown>;
  summary?: {
    unchanged: number;
    failed: number;
  };
}

export function SettingsPanel() {
  const [phone, setPhone] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [limits, setLimits] = useState<LimitConfig[]>([]);
  const [debugMode, setDebugModeState] = useState(isDebugEnabled());
  const [batchSize, setBatchSize] = useState(20);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [recatReport, setRecatReport] = useState<RecategorizationReport | null>(null);
  const [permissions, setPermissions] = useState<
    Record<
      string,
      {
        can_toggle_visibility: boolean;
        can_delete: boolean;
      }
    >
  >({});

  useEffect(() => {
    fetchLimits();
    fetchPermissions();
  }, []);

  const fetchLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('prd_limits_config')
        .select('role, daily_limit')
        .order('role');

      if (error) throw error;
      setLimits(data || []);
    } catch (error) {
      logger.error('Error fetching limits:', error);
    }
  };

  const updateLimit = async (role: string, newLimit: number) => {
    try {
      const { error } = await supabase
        .from('prd_limits_config')
        .update({ daily_limit: newLimit })
        .eq('role', role as 'admin' | 'free' | 'lifetime' | 'student' | 'event_participant');

      if (error) throw error;
      toast.success('Limite atualizado!');
      fetchLimits();
    } catch (error: unknown) {
      toast.error('Erro ao atualizar limite');
    }
  };

  const handlePromote = async () => {
    if (!phone.trim()) {
      toast.error('Digite um número de telefone');
      return;
    }

    setPromoting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-role', {
        body: { phone, role: 'student' },
      });

      if (error) throw error;
      toast.success(data.message || 'Usuário promovido!');
      setPhone('');
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao promover usuário');
    } finally {
      setPromoting(false);
    }
  };

  const handleMigrate = async (regenerateAll: boolean) => {
    setMigrating(true);
    try {
      const { data, error } = await supabase.functions.invoke('migrate-prd-titles', {
        body: { regenerate_all: regenerateAll },
      });

      if (error) throw error;
      toast.success(data.message || 'Migração concluída!');
    } catch (error: any) {
      toast.error(error?.message || 'Erro na migração');
    } finally {
      setMigrating(false);
    }
  };

  const handleRecategorize = async (dryRun: boolean) => {
    setRecategorizing(true);
    const message = dryRun
      ? `🔍 Simulando lote ${currentOffset / batchSize + 1} (${batchSize} PRDs)...`
      : `🏷️ Processando lote ${currentOffset / batchSize + 1} (${batchSize} PRDs)...`;
    toast.loading(message);

    try {
      const { data, error } = await supabase.functions.invoke('recategorize-all-prds', {
        body: { dryRun, limit: batchSize, offset: currentOffset },
      });

      if (error) throw error;

      toast.dismiss();
      setRecatReport(data);

      if (dryRun) {
        const changesText = Object.entries(data.changes || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        toast.info(`🔍 Lote processado: ${data.modified}/${data.total} PRDs mudariam`, {
          description: changesText || 'Nenhuma mudança necessária',
        });
      } else {
        toast.success(`✅ Lote concluído: ${data.modified}/${data.total} PRDs re-categorizados!`, {
          description: `${data.summary.unchanged} inalterados, ${data.summary.failed} erros`,
        });
      }

      // Auto-avançar offset se ainda houver PRDs para processar
      if (data.total === batchSize) {
        setCurrentOffset(prev => prev + batchSize);
      }
    } catch (error: unknown) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Erro na re-categorização';
      toast.error(errorMessage);
    } finally {
      setRecategorizing(false);
    }
  };

  const handleToggleDebug = () => {
    const newState = !debugMode;
    setDebugMode(newState);
    setDebugModeState(newState);
    toast.success(
      newState ? '🔍 Logs de debug ATIVADOS no console' : '🚫 Logs de debug DESATIVADOS'
    );
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('prd_permissions_config')
        .select('role, can_toggle_visibility, can_delete');

      if (error) throw error;

      const permMap: Record<string, { can_toggle_visibility: boolean; can_delete: boolean }> = {};
      data?.forEach(p => {
        permMap[p.role] = {
          can_toggle_visibility: p.can_toggle_visibility,
          can_delete: p.can_delete,
        };
      });
      setPermissions(permMap);
    } catch (error) {
      logger.error('Error fetching permissions:', error);
    }
  };

  const updatePermission = async (
    role: string,
    field: 'can_toggle_visibility' | 'can_delete',
    value: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('prd_permissions_config')
        .update({ [field]: value })
        .eq('role', role as 'admin' | 'free' | 'lifetime' | 'student' | 'event_participant');

      if (error) throw error;

      toast.success(`Permissão atualizada para ${ROLE_LABELS[role]}`);
      fetchPermissions();
    } catch (error: unknown) {
      toast.error('Erro ao atualizar permissão');
    }
  };

  return (
    <Card className="border-brutal shadow-brutal">
      <CardHeader>
        <CardTitle className="font-black uppercase text-xl">Configurações</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {/* User Promotions */}
          <AccordionItem value="promotions">
            <AccordionTrigger className="font-bold">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Promoções de Usuário
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Promover usuário para role "student" via telefone
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Telefone (ex: 5511999999999)"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    disabled={promoting}
                  />
                  <Button onClick={handlePromote} disabled={promoting} variant="brutal">
                    {promoting ? 'Promovendo...' : 'Promover'}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* PRD Limits */}
          <AccordionItem value="limits">
            <AccordionTrigger className="font-bold">
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5" />
                Limites de PRD por Role
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                {limits.map(limit => (
                  <div key={limit.role} className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-sm">
                      {ROLE_LABELS[limit.role] || limit.role}
                    </span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={limit.daily_limit}
                        onChange={e => {
                          const newLimit = parseInt(e.target.value);
                          setLimits(prev =>
                            prev.map(l =>
                              l.role === limit.role ? { ...l, daily_limit: newLimit } : l
                            )
                          );
                        }}
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() => updateLimit(limit.role, limit.daily_limit)}
                        variant="brutal"
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Permissões de PRD por Role */}
          <AccordionItem value="prd-permissions">
            <AccordionTrigger className="font-bold">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Permissões de PRD por Role
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Configure quem pode tornar PRDs privados e deletá-los
                </p>

                {['free', 'student', 'event_participant', 'lifetime', 'admin'].map(role => (
                  <Card key={role} className="p-4 border-brutal">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm">{ROLE_LABELS[role]}</span>
                    </div>

                    <div className="space-y-3">
                      {/* Toggle Visibilidade */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm cursor-pointer">
                          Pode tornar PRD privado
                        </Label>
                        <Switch
                          variant="permission"
                          checked={permissions[role]?.can_toggle_visibility || false}
                          onCheckedChange={checked =>
                            updatePermission(role, 'can_toggle_visibility', checked)
                          }
                        />
                      </div>

                      {/* Deletar */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs sm:text-sm cursor-pointer">
                          Pode deletar PRDs
                        </Label>
                        <Switch
                          variant="permission"
                          checked={permissions[role]?.can_delete || false}
                          onCheckedChange={checked => updatePermission(role, 'can_delete', checked)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Metadata Migration */}
          <AccordionItem value="migration">
            <AccordionTrigger className="font-bold">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Migração de Metadados
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Extrair títulos e categorias de PRDs existentes
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleMigrate(false)}
                    disabled={migrating}
                    variant="brutal"
                  >
                    {migrating ? 'Migrando...' : 'Migrar Novos'}
                  </Button>
                  <Button
                    onClick={() => handleMigrate(true)}
                    disabled={migrating}
                    variant="outline"
                  >
                    {migrating ? 'Migrando...' : 'Regerar Todos'}
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Recategorization */}
          <AccordionItem value="recategorize">
            <AccordionTrigger className="font-bold">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Re-categorização de PRDs (em lotes)
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Re-classifica PRDs públicos em lotes. Total estimado: ~88 PRDs
                </p>

                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <label className="text-xs font-semibold mb-1 block">Tamanho do lote</label>
                    <Input
                      type="number"
                      min="5"
                      max="50"
                      value={batchSize}
                      onChange={e => setBatchSize(parseInt(e.target.value) || 20)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold mb-1 block">Lote atual</label>
                    <Input
                      type="number"
                      min="0"
                      step={batchSize}
                      value={currentOffset}
                      onChange={e => setCurrentOffset(parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>
                </div>

                {recatReport && (
                  <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                    <div className="font-bold">📊 Último resultado:</div>
                    <div>
                      Total: {recatReport.total} | Processados: {recatReport.processed} |
                      Modificados: {recatReport.modified}
                    </div>
                    {Object.keys(recatReport.changes).length > 0 && (
                      <div className="text-muted-foreground">
                        Mudanças:{' '}
                        {Object.entries(recatReport.changes)
                          .map(([k, v]) => `${k} (${v})`)
                          .join(', ')}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRecategorize(true)}
                    disabled={recategorizing}
                    variant="outline"
                    size="sm"
                  >
                    <Tags className={`w-4 h-4 mr-2 ${recategorizing ? 'animate-spin' : ''}`} />
                    🔍 Simular lote
                  </Button>
                  <Button
                    onClick={() => handleRecategorize(false)}
                    disabled={recategorizing}
                    variant="brutal"
                    size="sm"
                  >
                    <Tags className={`w-4 h-4 mr-2 ${recategorizing ? 'animate-spin' : ''}`} />✅
                    Aplicar lote
                  </Button>
                  <Button
                    onClick={() => setCurrentOffset(0)}
                    disabled={recategorizing}
                    variant="ghost"
                    size="sm"
                  >
                    🔄 Resetar
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Debug Console */}
          <AccordionItem value="debug">
            <AccordionTrigger className="font-bold">
              <div className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Console Logs
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold text-base">Debug Mode</p>
                    <p className="text-sm text-muted-foreground">
                      {debugMode
                        ? '🟢 Logs detalhados ATIVOS no console do navegador'
                        : '🔴 Apenas erros críticos são exibidos'}
                    </p>
                  </div>
                  <Switch checked={debugMode} onCheckedChange={handleToggleDebug} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
