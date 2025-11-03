import { QuickActions } from '@/components/admin/QuickActions';
import { AdminStats } from '@/components/admin/AdminStats';
import { ProfileSyncAlert } from '@/components/admin/ProfileSyncAlert';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingState } from '@/components/states/LoadingState';
import { LayoutDashboard } from 'lucide-react';
import { Suspense } from 'react';

export default function AdminDashboard() {
  return (
    <PageContainer maxWidth="full">
      <PageHeader
        title="Dashboard"
        description="Visão geral do sistema"
        icon={<LayoutDashboard className="h-8 w-8" />}
      />
      
      <ProfileSyncAlert />
      
      <Suspense fallback={<LoadingState variant="inline" message="Carregando estatísticas..." />}>
        <AdminStats />
      </Suspense>
      
      <QuickActions />
    </PageContainer>
  );
}
