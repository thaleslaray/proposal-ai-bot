import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Target, Wrench } from 'lucide-react';
import { UTMGenerator } from './UTMGenerator';
import { UserProfileButton } from '../UserProfileButton';
import { logger } from '@/lib/logger';

// Interfaces
interface CostStats {
  today: number;
  week: number;
  month: number;
  total: number;
}

interface UserCost {
  user_id: string;
  name: string;
  total_cost: number;
  total_tokens: number;
  prds_count: number;
}

interface ConversionFunnelData {
  totalRegistrations: number;
  firstPRDCount: number;
  engagedUsers: number;
  firstPRDRate: number;
  engagementRate: number;
}

interface SourcePerformance {
  source: string;
  total_users: number;
  first_prd_users: number;
  first_prd_rate: number;
  avg_prds_per_user: number;
  public_prd_users: number;
  public_rate: number;
  engagement_score: number;
}

export function ConsolidatedAnalytics() {
  const [loading, setLoading] = useState(true);
  const [costStats, setCostStats] = useState<CostStats>({ today: 0, week: 0, month: 0, total: 0 });
  const [topUsers, setTopUsers] = useState<UserCost[]>([]);
  const [funnelData, setFunnelData] = useState<ConversionFunnelData>({
    totalRegistrations: 0,
    firstPRDCount: 0,
    engagedUsers: 0,
    firstPRDRate: 0,
    engagementRate: 0,
  });
  const [sourcePerformance, setSourcePerformance] = useState<SourcePerformance[]>([]);
  const [dateRange] = useState<number>(30);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCostData(), loadAcquisitionData()]);
    } catch (error) {
      logger.error('Erro ao carregar analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCostData = async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);

      const [todayData, weekData, monthData, totalData, topUsersData] = await Promise.all([
        supabase.from('api_usage').select('cost_usd').gte('created_at', today.toISOString()),
        supabase.from('api_usage').select('cost_usd').gte('created_at', weekAgo.toISOString()),
        supabase.from('api_usage').select('cost_usd').gte('created_at', monthAgo.toISOString()),
        supabase.from('api_usage').select('cost_usd'),
        supabase.rpc('get_top_users_by_cost', { limit_count: 5 }),
      ]);

      setCostStats({
        today: todayData.data?.reduce((sum, r) => sum + (r.cost_usd || 0), 0) || 0,
        week: weekData.data?.reduce((sum, r) => sum + (r.cost_usd || 0), 0) || 0,
        month: monthData.data?.reduce((sum, r) => sum + (r.cost_usd || 0), 0) || 0,
        total: totalData.data?.reduce((sum, r) => sum + (r.cost_usd || 0), 0) || 0,
      });

      if (!topUsersData.data || topUsersData.data.length === 0) {
        setTopUsers([]);
        return;
      }

      const userIds = topUsersData.data.map(u => u.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      // Buscar contagem de PRDs por usuário
      const { data: prdCounts } = await supabase
        .from('document_history')
        .select('user_id')
        .in('user_id', userIds);

      const prdCountMap = new Map<string, number>();
      prdCounts?.forEach(record => {
        const current = prdCountMap.get(record.user_id) || 0;
        prdCountMap.set(record.user_id, current + 1);
      });

      setTopUsers(
        topUsersData.data.map(u => ({
          user_id: u.user_id,
          name: profileMap.get(u.user_id) || 'Usuário sem perfil',
          total_cost: Number(u.total_cost),
          total_tokens: Number(u.total_tokens),
          prds_count: prdCountMap.get(u.user_id) || 0,
        }))
      );
    } catch (error) {
      logger.error('Erro ao carregar custos:', error);
    }
  };

  const loadAcquisitionData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const [funnelResult, performanceResult] = await Promise.all([
        supabase.rpc('get_funnel_stats'),
        supabase.rpc('get_source_performance', {
          start_date: startDate.toISOString(),
          days: dateRange,
        }),
      ]);

      if (funnelResult.data && funnelResult.data.length > 0) {
        const stats = funnelResult.data[0];
        setFunnelData({
          totalRegistrations: Number(stats.total_users),
          firstPRDCount: Number(stats.users_with_first_prd),
          firstPRDRate:
            stats.total_users > 0
              ? (Number(stats.users_with_first_prd) / Number(stats.total_users)) * 100
              : 0,
          engagedUsers: Number(stats.engaged_users),
          engagementRate:
            stats.users_with_first_prd > 0
              ? (Number(stats.engaged_users) / Number(stats.users_with_first_prd)) * 100
              : 0,
        });
      }

      if (performanceResult.data) {
        setSourcePerformance(performanceResult.data.slice(0, 10));
      }
    } catch (error) {
      logger.error('Erro ao carregar aquisição:', error);
    }
  };

  const formatCost = (value: number) => `$${value.toFixed(4)}`;
  const formatTokens = (value: number) => value.toLocaleString();

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-2">Custos, ferramentas e aquisição</p>
      </div>

      <Accordion
        type="multiple"
        defaultValue={['costs', 'acquisition', 'tools']}
        className="w-full"
      >
        {/* 💰 Custos */}
        <AccordionItem value="costs">
          <AccordionTrigger className="text-xl font-semibold">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Custos de API
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Hoje</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCost(costStats.today)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Última Semana</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCost(costStats.week)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Último Mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCost(costStats.month)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCost(costStats.total)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Usuários que Consomem</CardTitle>
                  <CardDescription>Identificar uso excessivo</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>PRDs Gerados</TableHead>
                        <TableHead>Custo Total</TableHead>
                        <TableHead>Tokens Usados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topUsers.map((user, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <UserProfileButton userId={user.user_id} userName={user.name} />
                              <span>{user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.prds_count}</TableCell>
                          <TableCell>{formatCost(user.total_cost)}</TableCell>
                          <TableCell>{formatTokens(user.total_tokens)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 📈 Aquisição */}
        <AccordionItem value="acquisition">
          <AccordionTrigger className="text-xl font-semibold">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Aquisição & Funil
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taxa de Ativação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {funnelData.firstPRDRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {funnelData.firstPRDCount} de {funnelData.totalRegistrations} usuários criaram
                      seu primeiro PRD
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Taxa de Engajamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-primary">
                      {funnelData.engagementRate.toFixed(1)}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {funnelData.engagedUsers} usuários criaram 3+ PRDs
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Detalhada por Origem</CardTitle>
                  <CardDescription>Top 10 fontes por engajamento</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Origem</TableHead>
                        <TableHead>Usuários</TableHead>
                        <TableHead>1º PRD</TableHead>
                        <TableHead>Taxa PRD</TableHead>
                        <TableHead>PRDs/User</TableHead>
                        <TableHead>Públicos</TableHead>
                        <TableHead>Taxa Pública</TableHead>
                        <TableHead>Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sourcePerformance.map((src, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{src.source}</TableCell>
                          <TableCell>{src.total_users}</TableCell>
                          <TableCell>{src.first_prd_users}</TableCell>
                          <TableCell>{src.first_prd_rate}%</TableCell>
                          <TableCell>{src.avg_prds_per_user}</TableCell>
                          <TableCell>{src.public_prd_users}</TableCell>
                          <TableCell>{src.public_rate}%</TableCell>
                          <TableCell className="font-bold">{src.engagement_score}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 🛠️ Ferramentas */}
        <AccordionItem value="tools">
          <AccordionTrigger className="text-xl font-semibold">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Ferramentas
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <UTMGenerator />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
