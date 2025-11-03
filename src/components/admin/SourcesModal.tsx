import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, Users, FileText, Target } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { logger } from '@/lib/logger';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeframe?: '24h' | '7d' | '30d' | 'all';
}

interface SourceMetrics {
  source: string;
  total_visits: number;
  unique_users: number;
  users_with_prd: number;
  total_prds: number;
  conversion_rate: number;
}

export function SourcesModal({ isOpen, onClose, timeframe = '24h' }: SourcesModalProps) {
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<SourceMetrics[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadSources();
    }
  }, [isOpen, timeframe]);

  const loadSources = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (timeframe) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = new Date(0);
          break;
      }

      // Buscar todas as aquisições no período
      const { data: acquisitions } = await supabase
        .from('user_acquisition')
        .select('user_id, utm_source, created_at')
        .gte('created_at', startDate.toISOString());

      // Buscar PRDs criados pelos usuários
      const { data: prds } = await supabase
        .from('document_history')
        .select('user_id, id')
        .gte('created_at', startDate.toISOString());

      // Processar dados
      const sourceMap = new Map<string, SourceMetrics>();

      acquisitions?.forEach(acq => {
        const source = acq.utm_source || 'Direto';

        if (!sourceMap.has(source)) {
          sourceMap.set(source, {
            source,
            total_visits: 0,
            unique_users: 0,
            users_with_prd: 0,
            total_prds: 0,
            conversion_rate: 0,
          });
        }

        const metrics = sourceMap.get(source)!;
        metrics.total_visits++;
      });

      // Contar usuários únicos por fonte
      const usersBySource = new Map<string, Set<string>>();
      acquisitions?.forEach(acq => {
        const source = acq.utm_source || 'Direto';
        if (!usersBySource.has(source)) {
          usersBySource.set(source, new Set());
        }
        usersBySource.get(source)!.add(acq.user_id);
      });

      usersBySource.forEach((users, source) => {
        const metrics = sourceMap.get(source)!;
        metrics.unique_users = users.size;
      });

      // Contar PRDs por fonte
      const prdsByUser = new Map<string, number>();
      prds?.forEach(prd => {
        prdsByUser.set(prd.user_id, (prdsByUser.get(prd.user_id) || 0) + 1);
      });

      acquisitions?.forEach(acq => {
        const source = acq.utm_source || 'Direto';
        const metrics = sourceMap.get(source)!;

        const userPrdCount = prdsByUser.get(acq.user_id) || 0;
        if (userPrdCount > 0) {
          metrics.users_with_prd++;
          metrics.total_prds += userPrdCount;
        }
      });

      // Calcular taxa de conversão
      sourceMap.forEach(metrics => {
        metrics.conversion_rate =
          metrics.unique_users > 0 ? (metrics.users_with_prd / metrics.unique_users) * 100 : 0;
      });

      // Ordenar por total de visitas (decrescente)
      const sortedSources = Array.from(sourceMap.values()).sort(
        (a, b) => b.total_visits - a.total_visits
      );

      setSources(sortedSources);
    } catch (error) {
      logger.error('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case '24h':
        return 'Últimas 24 horas';
      case '7d':
        return 'Últimos 7 dias';
      case '30d':
        return 'Últimos 30 dias';
      case 'all':
        return 'Todos os tempos';
      default:
        return '';
    }
  };

  const getSourceColor = (source: string) => {
    const colors: { [key: string]: string } = {
      instagram: 'bg-gradient-to-r from-purple-500 to-pink-500',
      facebook: 'bg-blue-600',
      twitter: 'bg-sky-500',
      linkedin: 'bg-blue-700',
      google: 'bg-red-500',
      youtube: 'bg-red-600',
      whatsapp: 'bg-green-500',
      Direto: 'bg-gray-600',
    };
    return colors[source] || 'bg-gray-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black">
            <TrendingUp className="h-6 w-6 text-primary" />
            Fontes de Aquisição - {getTimeframeLabel()}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-muted/50 p-4 rounded-lg border-brutal">
                  <p className="text-xs text-muted-foreground font-semibold">Total de Fontes</p>
                  <p className="text-2xl font-black">{sources.length}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border-brutal">
                  <p className="text-xs text-muted-foreground font-semibold">Total de Visitas</p>
                  <p className="text-2xl font-black">
                    {sources.reduce((sum, s) => sum + s.total_visits, 0)}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border-brutal">
                  <p className="text-xs text-muted-foreground font-semibold">Usuários Únicos</p>
                  <p className="text-2xl font-black">
                    {sources.reduce((sum, s) => sum + s.unique_users, 0)}
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border-brutal">
                  <p className="text-xs text-muted-foreground font-semibold">Conversão Média</p>
                  <p className="text-2xl font-black">
                    {sources.length > 0
                      ? (
                          sources.reduce((sum, s) => sum + s.conversion_rate, 0) / sources.length
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>

              {/* Sources Table */}
              {sources.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma fonte de aquisição encontrada neste período
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="font-black">
                      <TableHead className="font-black">Fonte</TableHead>
                      <TableHead className="text-center font-black">Visitas</TableHead>
                      <TableHead className="text-center font-black">Usuários</TableHead>
                      <TableHead className="text-center font-black">Com PRD</TableHead>
                      <TableHead className="text-center font-black">Total PRDs</TableHead>
                      <TableHead className="text-center font-black">Conversão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map(source => (
                      <TableRow key={source.source} className="hover:bg-muted/50">
                        <TableCell className="font-semibold">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getSourceColor(source.source)}`}
                            />
                            {source.source}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {source.total_visits}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            <Users className="h-3 w-3 mr-1" />
                            {source.unique_users}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            <Target className="h-3 w-3 mr-1" />
                            {source.users_with_prd}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default" className="font-mono">
                            <FileText className="h-3 w-3 mr-1" />
                            {source.total_prds}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              source.conversion_rate > 50
                                ? 'default'
                                : source.conversion_rate > 25
                                  ? 'secondary'
                                  : 'outline'
                            }
                            className="font-mono font-bold"
                          >
                            {source.conversion_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
