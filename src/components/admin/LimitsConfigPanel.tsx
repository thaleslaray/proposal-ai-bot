import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

interface LimitConfig {
  role: string;
  daily_limit: number;
}

const roleLabels: Record<string, string> = {
  free: '🆓 Free',
  student: '🎓 Aluno',
  lifetime: '⚡ Vitalício',
  admin: '👑 Admin',
};

export const LimitsConfigPanel = () => {
  const [limits, setLimits] = useState<LimitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchLimits();
  }, []);

  const fetchLimits = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prd_limits_config')
      .select('role, daily_limit')
      .order('role');

    if (!error && data) {
      setLimits(data);
    } else if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar limites',
        variant: 'destructive',
      });
      logger.error(error);
    }
    setLoading(false);
  };

  const updateLimit = async (role: string, newLimit: number) => {
    setSaving(role);
    const { error } = await supabase
      .from('prd_limits_config')
      .update({
        daily_limit: newLimit,
        updated_at: new Date().toISOString(),
      })
      .eq('role', role as 'admin' | 'free' | 'lifetime' | 'student');

    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar limite',
        variant: 'destructive',
      });
      logger.error(error);
    } else {
      toast({
        title: 'Sucesso',
        description: 'Limite atualizado com sucesso!',
      });
      await fetchLimits();
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <Card className="border-brutal shadow-brutal">
        <CardHeader>
          <CardTitle>⚙️ Configuração de Limites de PRD</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-brutal shadow-brutal">
      <CardHeader>
        <CardTitle>⚙️ Configuração de Limites de PRD</CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Controle quantos PRDs cada tipo de usuário pode gerar por dia
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {limits.map(({ role, daily_limit }) => (
          <div
            key={role}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-brutal bg-muted/30 rounded"
          >
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm sm:text-base">{roleLabels[role] || role}</span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Input
                type="number"
                min={-1}
                value={daily_limit}
                onChange={e => {
                  const newValue = parseInt(e.target.value) || 0;
                  setLimits(prev =>
                    prev.map(l => (l.role === role ? { ...l, daily_limit: newValue } : l))
                  );
                }}
                className="w-20 border-brutal text-center"
                disabled={saving === role}
              />

              <span className="text-xs text-muted-foreground w-20 shrink-0">
                {daily_limit === -1 ? '∞ Ilimitado' : `${daily_limit}/dia`}
              </span>

              <Button
                onClick={() => updateLimit(role, daily_limit)}
                size="sm"
                className="border-brutal shrink-0"
                disabled={saving === role}
              >
                {saving === role ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Use <code className="bg-muted px-1 py-0.5 rounded">-1</code>{' '}
            para acesso ilimitado
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
