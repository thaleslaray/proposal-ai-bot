import { Card } from '@/components/ui/card';
import { FileText, Heart, Repeat, Eye } from 'lucide-react';

interface ProfileStatsProps {
  prdsCreated: number;
  totalLikes: number;
  totalRemixes: number;
  totalViews: number;
}

export const ProfileStats = ({
  prdsCreated,
  totalLikes,
  totalRemixes,
  totalViews,
}: ProfileStatsProps) => {
  const stats = [
    { icon: FileText, label: 'PRDs Criados', value: prdsCreated, color: 'text-primary' },
    { icon: Heart, label: 'Likes Recebidos', value: totalLikes, color: 'text-red-500' },
    { icon: Repeat, label: 'Remixes', value: totalRemixes, color: 'text-blue-500' },
    { icon: Eye, label: 'Visualizações', value: totalViews, color: 'text-green-500' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <Card key={label} className="p-4 text-center hover:shadow-lg transition-shadow">
          <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
          <div className="text-2xl font-bold mb-1">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </Card>
      ))}
    </div>
  );
};
