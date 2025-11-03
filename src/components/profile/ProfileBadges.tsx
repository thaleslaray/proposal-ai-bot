import { Badge } from '@/components/ui/badge';
import { Trophy, Heart, Repeat, TrendingUp } from 'lucide-react';

interface BadgeData {
  badge_type: string;
  earned_at: string;
  metadata?: Record<string, unknown>;
}

interface ProfileBadgesProps {
  badges: BadgeData[];
}

const badgeConfig = {
  top_creator: {
    icon: Trophy,
    label: 'Top Creator',
    color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    description: '10+ PRDs criados',
  },
  most_loved: {
    icon: Heart,
    label: 'Mais Amado',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    description: '50+ likes recebidos',
  },
  remix_master: {
    icon: Repeat,
    label: 'Mestre dos Remixes',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: '10+ remixes recebidos',
  },
  viral_star: {
    icon: TrendingUp,
    label: 'Estrela Viral',
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    description: '200+ engajamento total',
  },
};

export const ProfileBadges = ({ badges }: ProfileBadgesProps) => {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum badge conquistado ainda</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {badges.map(badge => {
        const config = badgeConfig[badge.badge_type as keyof typeof badgeConfig];
        if (!config) return null;

        const Icon = config.icon;

        return (
          <div
            key={badge.badge_type}
            className={`flex items-center gap-4 p-4 rounded-lg border ${config.color}`}
          >
            <Icon className="w-8 h-8" />
            <div>
              <div className="font-semibold">{config.label}</div>
              <div className="text-xs opacity-80">{config.description}</div>
              <div className="text-xs opacity-60 mt-1">
                Conquistado em {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
