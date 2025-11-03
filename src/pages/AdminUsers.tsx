import { useState, useEffect } from 'react';
import { UserManagementTable } from '@/components/admin/UserManagementTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, GraduationCap, Crown } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/states/LoadingState';
import { logger } from '@/lib/logger';

interface RoleStats {
  free: number;
  student: number;
  lifetime: number;
  admin: number;
  total: number;
}

export default function AdminUsers() {
  const [stats, setStats] = useState<RoleStats>({
    free: 0,
    student: 0,
    lifetime: 0,
    admin: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { data: roleData } = await supabase.from('user_roles').select('role');

      const roleCounts = {
        free: 0,
        student: 0,
        lifetime: 0,
        admin: 0,
        total: totalUsers || 0,
      };

      roleData?.forEach(({ role }) => {
        if (role in roleCounts) {
          roleCounts[role as keyof Omit<RoleStats, 'total'>]++;
        }
      });

      roleCounts.free =
        (totalUsers || 0) - (roleCounts.student + roleCounts.lifetime + roleCounts.admin);

      setStats(roleCounts);
    } catch (error) {
      logger.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState variant="fullscreen" message="Carregando usuários..." />;
  }

  const roleCards = [
    {
      role: 'free',
      title: 'Usuários Free',
      icon: <Users className="h-5 w-5" />,
      count: stats.free,
    },
    {
      role: 'student',
      title: 'Alunos',
      icon: <GraduationCap className="h-5 w-5" />,
      count: stats.student,
    },
    {
      role: 'lifetime',
      title: 'Vitalício',
      icon: <Crown className="h-5 w-5" />,
      count: stats.lifetime,
    },
    {
      role: 'admin',
      title: 'Admins',
      icon: <Users className="h-5 w-5" />,
      count: stats.admin,
    },
  ];

  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="Gerenciar Usuários"
        description="Gerencie roles, permissões e status dos usuários"
        icon={<Users className="h-8 w-8" />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roleCards.map(card => (
          <Card
            key={card.role}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedRole(card.role === selectedRole ? null : card.role)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.role === selectedRole ? 'Filtrando...' : 'Clique para filtrar'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <UserManagementTable initialRoleFilter={selectedRole} />
    </PageContainer>
  );
}
