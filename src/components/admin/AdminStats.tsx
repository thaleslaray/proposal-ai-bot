import { useState } from 'react';
import { Users, FileText, TrendingUp, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatsModal } from './StatsModal';

interface Stats {
  totalUsers: number;
  docsToday: number;
  docsThisWeek: number;
  docsTotal: number;
  orphanUsers: number;
  missingRoles: number;
}

export const AdminStats = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'docs-today' | 'active-users' | 'docs-recent' | null>(
    null
  );
  const [modalTitle, setModalTitle] = useState('');

  // OTIMIZAÇÃO: React Query com cache de 5 minutos
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Buscar total de usuários de auth.users (fonte de verdade - 84 usuários)
      const { data: usersCount } = await supabase.rpc('get_auth_users_count');
      const totalUsers = usersCount || 0;

      // Tentar buscar do cache (super rápido!)
      const { data: cached, error: cacheError } = await supabase
        .from('admin_stats_cache')
        .select('*')
        .eq('id', 1)
        .single();

      if (!cacheError && cached) {
        // Verificar se cache não está muito velho (> 5 min)
        const cacheAge = Date.now() - new Date(cached.last_updated).getTime();
        if (cacheAge < 5 * 60 * 1000) {
          return {
            totalUsers: totalUsers,
            docsToday: cached.docs_today,
            docsThisWeek: cached.docs_week,
            docsTotal: cached.docs_total,
          };
        }
      }

      // Fallback: buscar manualmente
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: docsToday } = await supabase
        .from('document_history')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: docsThisWeek } = await supabase
        .from('document_history')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString());

      const { count: docsTotal } = await supabase
        .from('document_history')
        .select('*', { count: 'exact', head: true });

      return {
        totalUsers: totalUsers,
        docsToday: docsToday || 0,
        docsThisWeek: docsThisWeek || 0,
        docsTotal: docsTotal || 0,
      };
    },
    staleTime: 3 * 60 * 1000, // 3 minutos - navegação instantânea
    gcTime: 10 * 60 * 1000, // 10 minutos em memória
    refetchOnWindowFocus: false,
  });

  const handleCardClick = (type: 'docs-today' | 'docs-recent', title: string) => {
    setModalType(type);
    setModalTitle(title);
    setModalOpen(true);
  };

  const statCards = [
    {
      title: 'Total de Usuários',
      value: stats?.totalUsers || 0,
      icon: Users,
      clickable: false,
    },
    {
      title: 'Documentos Hoje',
      value: stats?.docsToday || 0,
      icon: FileText,
      clickable: true,
      onClick: () => handleCardClick('docs-today', 'Documentos Criados Hoje'),
    },
    {
      title: 'Documentos Esta Semana',
      value: stats?.docsThisWeek || 0,
      icon: Calendar,
      clickable: false,
    },
    {
      title: 'Documentos Totais',
      value: stats?.docsTotal || 0,
      icon: TrendingUp,
      clickable: false,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="bg-white border-4 border-black shadow-brutal">
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-[#e5e5e5] rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className={`bg-white border-4 border-black shadow-brutal hover:shadow-brutal-hover transition-brutal animate-fade-in-fast animate-stagger-${index + 1} ${
                  stat.clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
                }`}
                onClick={stat.clickable ? stat.onClick : undefined}
              >
                <CardContent className="p-3 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs md:text-sm text-[#666666] uppercase tracking-wide font-bold mb-0.5 md:mb-1">
                        {stat.title}
                      </p>
                      <p className="text-xl md:text-2xl lg:text-3xl font-black text-[#0a0a0a]">
                        {stat.value}
                      </p>
                    </div>
                    <Icon className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-[#FF6B35]" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {modalOpen && modalType && (
        <StatsModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          type={modalType}
          title={modalTitle}
        />
      )}
    </>
  );
};
