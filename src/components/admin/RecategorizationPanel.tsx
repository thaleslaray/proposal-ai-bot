import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RefreshCw, PlayCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

export function RecategorizationPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{
    processed: number;
    modified: number;
    failed: number;
    total: number;
  } | null>(null);

  const runRecategorization = async () => {
    setIsRunning(true);
    setProgress(0);
    setStats(null);

    try {
      const batchSize = 20;
      let offset = 0;
      let totalProcessed = 0;
      let totalModified = 0;
      let totalFailed = 0;
      let hasMore = true;

      while (hasMore) {
        toast.info(`Processando lote ${Math.floor(offset / batchSize) + 1}...`);

        const { data, error } = await supabase.functions.invoke('recategorize-all-prds', {
          body: {
            dryRun: false,
            limit: batchSize,
            offset,
          },
        });

        if (error) throw error;

        totalProcessed += data.processed || 0;
        totalModified += data.modified || 0;
        totalFailed += data.failed || 0;

        setStats({
          processed: totalProcessed,
          modified: totalModified,
          failed: totalFailed,
          total: data.total || 0,
        });

        if (data.total < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
          setProgress(Math.min(95, (offset / 100) * 100));
        }

        // Pequeno delay entre batches para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setProgress(100);
      toast.success(`✅ Recategorização concluída! ${totalModified} PRDs atualizados.`);
    } catch (error) {
      logger.error('Erro na recategorização:', error);
      toast.error('Erro ao executar recategorização');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Recategorização em Massa
        </CardTitle>
        <CardDescription>
          Re-categoriza todos os PRDs públicos usando IA para melhorar precisão e confiança
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRunning && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Processando... {progress.toFixed(0)}%
            </p>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Processados</p>
                <p className="text-lg font-semibold">{stats.processed}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Modificados</p>
                <p className="text-lg font-semibold">{stats.modified}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Falhas</p>
                <p className="text-lg font-semibold">{stats.failed}</p>
              </div>
            </div>
          </div>
        )}

        <Button onClick={runRecategorization} disabled={isRunning} className="w-full">
          <PlayCircle className="h-4 w-4 mr-2" />
          {isRunning ? 'Executando...' : 'Iniciar Recategorização'}
        </Button>
      </CardContent>
    </Card>
  );
}
