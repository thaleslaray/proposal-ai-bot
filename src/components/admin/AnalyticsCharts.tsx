import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { logger } from '@/lib/logger';

interface TimelineData {
  day: string;
  documentos: number;
}

interface RoleData {
  name: string;
  value: number;
}

interface TopUserData {
  name: string;
  documentos: number;
}

export const AnalyticsCharts = () => {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [roleData, setRoleData] = useState<RoleData[]>([]);
  const [topUsersData, setTopUsersData] = useState<TopUserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // OTIMIZAÇÃO: Timeline data com LIMIT
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: docs } = await supabase
        .from('document_history')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100); // LIMIT para não buscar milhares de docs

      // Group by day
      const grouped = docs?.reduce(
        (acc: Record<string, number>, doc) => {
          const day = new Date(doc.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          });
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const timeline = Object.entries(grouped || {}).map(([day, count]) => ({
        day,
        documentos: count,
      }));
      setTimelineData(timeline);

      // Role distribution
      const { data: roles } = await supabase.from('user_roles').select('role');

      const roleCounts = roles?.reduce(
        (acc: Record<string, number>, { role }) => {
          acc[role] = (acc[role] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const roleDistribution = Object.entries(roleCounts || {}).map(([role, count]) => ({
        name: role,
        value: count,
      }));
      setRoleData(roleDistribution);

      // OTIMIZAÇÃO: Top users com JOIN (sem N+1 queries)
      const { data: allDocs } = await supabase
        .from('document_history')
        .select('user_id, profiles!inner(name)')
        .limit(200); // LIMIT para não buscar todos os docs

      const userCounts = allDocs?.reduce(
        (
          acc: Record<string, { name: string; count: number }>,
          doc: { user_id: string; profiles?: { name?: string } }
        ) => {
          const userId = doc.user_id;
          const name = doc.profiles?.name || 'Sem nome';
          if (!acc[userId]) {
            acc[userId] = { name, count: 0 };
          }
          acc[userId].count++;
          return acc;
        },
        {} as Record<string, { name: string; count: number }>
      );

      const topUsers = Object.values(userCounts || {})
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(u => ({
          name: u.name,
          documentos: u.count,
        }));

      setTopUsersData(topUsers);
    } catch (error) {
      logger.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#667eea', '#22c55e', '#eab308', '#ef4444', '#3b82f6'];

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-[#1a1a1a] border-[#2a2a2a]">
            <CardContent className="p-6">
              <div className="h-64 animate-pulse bg-[#2a2a2a] rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Timeline Chart */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a] lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-white text-sm md:text-base">
            Documentos por Dia (Últimos 30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="day" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
              <YAxis stroke="#a0a0a0" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="documentos"
                stroke="#667eea"
                strokeWidth={2}
                dot={{ fill: '#667eea' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Role Distribution */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-white text-sm md:text-base">Distribuição por Role</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={roleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {roleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card className="bg-[#1a1a1a] border-[#2a2a2a] lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-white text-sm md:text-base">
            Top 5 Usuários Mais Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topUsersData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis type="number" stroke="#a0a0a0" tick={{ fontSize: 10 }} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#a0a0a0"
                width={100}
                tick={{ fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #2a2a2a',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="documentos" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
