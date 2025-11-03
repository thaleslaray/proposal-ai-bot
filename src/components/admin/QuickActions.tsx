import { useEffect, useState } from 'react';
import { PRDDocument } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PRDDocument } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { PRDDocument } from '@/types';
import { Badge } from '@/components/ui/badge';
import { PRDDocument } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { PRDDocument } from '@/types';
import { toast } from 'sonner';
import { PRDDocument } from '@/types';
import {
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  UserPlus,
  Activity,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PRDDocument } from '@/types';
import { ptBR } from 'date-fns/locale';
import { PRDDocument } from '@/types';
import { StatsModal } from './StatsModal';
import { PRDDocument } from '@/types';
import { SourcesModal } from './SourcesModal';
import { PRDDocument } from '@/types';
import { Link } from 'react-router-dom';
import { PRDDocument } from '@/types';
import { PRDPreviewModal } from '@/components/community/PRDPreviewModal';
import { PRDDocument } from '@/types';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PRDDocument } from '@/types';
import { logger } from '@/lib/logger';
import { PRDDocument } from '@/types';

interface RecentDoc {
  id: string;
  user_id: string;
  user_name: string;
  username: string | null;
  preview: string;
  created_at: string;
}

export function QuickActions() {
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);
  const [hotmartErrors, setHotmartErrors] = useState(0);
  const [newUsersToday, setNewUsersToday] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [topSource, setTopSource] = useState<{ source: string; count: number } | null>(null);
  const [conversionRate, setConversionRate] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'active-users' | 'new-users' | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<PRDDocument | null>(null);
  const [docsOpen, setDocsOpen] = useState(true);
  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  useEffect(() => {
    loadQuickData();
  }, []);

  const loadQuickData = async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const yesterday24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Parallel queries
      const [
        docsResponse,
        hotmartResponse,
        activeUsersResponse,
        newUsersResponse,
        topSourceResponse,
        conversionResponse,
      ] = await Promise.all([
        // Recent docs
        supabase.functions.invoke('get-document-history', {
          body: { limit: 4, offset: 0 },
        }),

        // Hotmart errors (24h)
        supabase
          .from('hotmart_validation_cache')
          .select('*', { count: 'exact', head: true })
          .not('error_message', 'is', null)
          .gte('last_check', yesterday24h),

        // Active users (24h)
        supabase.rpc('get_active_users_24h'),

        // New users today
        supabase.rpc('get_auth_users_count'),

        // Top source (24h)
        supabase.from('user_acquisition').select('utm_source').gte('created_at', yesterday24h),

        // Conversion rate (users with at least 1 PRD)
        Promise.all([
          supabase.rpc('get_auth_users_count'),
          supabase.from('document_history').select('user_id', { count: 'exact', head: false }),
        ]),
      ]);

      // Process recent docs
      if (docsResponse.data?.documents) {
        interface DocumentData {
          id: string;
          user_id: string;
          user_name?: string;
          username?: string | null;
          idea_preview?: string;
          content_preview?: string;
          created_at: string;
        }
        setRecentDocs(
          docsResponse.data.documents.map((d: DocumentData) => ({
            id: d.id,
            user_id: d.user_id,
            user_name: d.user_name || 'Anônimo',
            username: d.username || null,
            preview:
              (d.idea_preview || d.content_preview || 'Documento sem título').substring(0, 60) +
              '...',
            created_at: d.created_at,
          }))
        );
      }

      // Process hotmart errors
      setHotmartErrors(hotmartResponse.count || 0);

      // Process active users
      setActiveUsers(activeUsersResponse.data || 0);

      // Process new users today (need to count only today's signups)
      const { count: todaySignups } = await supabase
        .from('user_acquisition')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString());
      setNewUsersToday(todaySignups || 0);

      // Process top source
      if (topSourceResponse.data && topSourceResponse.data.length > 0) {
        const sourceCounts = topSourceResponse.data.reduce(
          (acc: Record<string, number>, row: { utm_source?: string }) => {
            const source = row.utm_source || 'Direto';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        const topEntry = Object.entries(sourceCounts).sort(
          ([, a], [, b]) => (b as number) - (a as number)
        )[0];

        if (topEntry) {
          setTopSource({ source: topEntry[0] as string, count: topEntry[1] as number });
        }
      }

      // Process conversion rate
      const [totalUsersResponse, usersWithPRDResponse] = conversionResponse;
      const totalUsers = totalUsersResponse.data || 0;
      const uniqueUsers = new Set(
        usersWithPRDResponse.data?.map((d: { user_id: string }) => d.user_id)
      ).size;
      const rate = totalUsers > 0 ? (uniqueUsers / totalUsers) * 100 : 0;
      setConversionRate(rate);
    } catch (error) {
      logger.error('Error loading quick data:', error);
    }
  };

  const handleCardClick = (type: 'active-users' | 'new-users', title: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalOpen(true);
  };

  const handleDocClick = async (docId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_history')
        .select('*')
        .eq('id', docId)
        .single();

      if (error) throw error;
      setSelectedDoc(data);
    } catch (error) {
      logger.error('Error loading document:', error);
      toast.error('Erro ao carregar documento');
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Hotmart Error Banner - Condicional */}
        {hotmartErrors > 0 && (
          <Alert className="border-destructive bg-destructive/10 border-brutal shadow-brutal">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertTitle className="text-destructive font-black">
              ⚠️ Erros de Validação Hotmart
            </AlertTitle>
            <AlertDescription className="text-destructive/80">
              {hotmartErrors} erro(s) de validação nas últimas 24h.{' '}
              <Link to="/admin/users" className="underline font-semibold hover:text-destructive">
                Ver detalhes
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Overview - 4 Cards Fixos */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Novos Usuários Hoje */}
          <Card
            className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => handleCardClick('new-users', 'Novos Usuários Hoje')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-semibold">Novos Usuários Hoje</p>
                  <p className="text-2xl font-black">{newUsersToday}</p>
                </div>
                <UserPlus className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Usuários Ativos */}
          <Card
            className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => handleCardClick('active-users', 'Usuários Ativos (24h)')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-semibold">Usuários Ativos</p>
                  <p className="text-2xl font-black">{activeUsers}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Top Fonte (24h) */}
          <Card
            className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setSourcesModalOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-semibold">Top Fonte (24h)</p>
                  {topSource ? (
                    <>
                      <p className="text-xl font-black truncate">{topSource.source}</p>
                      <p className="text-xs text-muted-foreground">{topSource.count} acessos</p>
                    </>
                  ) : (
                    <p className="text-2xl font-black">-</p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Taxa de Conversão */}
          <Card className="bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground font-semibold">Taxa de Conversão</p>
                  <p className="text-2xl font-black">{conversionRate.toFixed(1)}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Documents - Full Width Collapsible */}
        <Collapsible open={docsOpen} onOpenChange={setDocsOpen}>
          <Card className="border-brutal shadow-brutal">
            <CardHeader>
              <CollapsibleTrigger className="w-full">
                <CardTitle className="flex items-center justify-between font-black text-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Últimos Documentos
                  </div>
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${docsOpen ? 'rotate-180' : ''}`}
                  />
                </CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-3">
                  {recentDocs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum documento recente</p>
                  ) : (
                    recentDocs.map(doc => (
                      <div
                        key={doc.id}
                        className="flex items-start justify-between border-l-4 border-primary pl-3 py-2 gap-2"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <Link
                            to={doc.username ? `/u/${doc.username}` : '#'}
                            className={`text-sm font-semibold truncate transition-colors block ${
                              doc.username
                                ? 'hover:text-primary hover:underline'
                                : 'text-muted-foreground cursor-not-allowed'
                            }`}
                            onClick={e => !doc.username && e.preventDefault()}
                          >
                            {doc.user_name}
                          </Link>

                          <button
                            onClick={() => handleDocClick(doc.id)}
                            className="text-xs text-muted-foreground truncate hover:text-primary hover:underline transition-colors text-left w-full"
                          >
                            {doc.preview}
                          </button>
                        </div>

                        <Badge variant="outline" className="ml-2 shrink-0">
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {modalOpen && modalType && (
        <StatsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          type={modalType}
          title={modalTitle}
        />
      )}

      {sourcesModalOpen && (
        <SourcesModal
          isOpen={sourcesModalOpen}
          onClose={() => setSourcesModalOpen(false)}
          timeframe="24h"
        />
      )}

      {selectedDoc && (
        <PRDPreviewModal
          prd={selectedDoc}
          open={true}
          onClose={() => setSelectedDoc(null)}
          canViewPremium={true}
          isAdmin={true}
        />
      )}
    </>
  );
}
