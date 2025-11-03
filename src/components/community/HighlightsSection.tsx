import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, RefreshCw, Star } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserRoleBadge } from '@/components/UserRoleBadge';

interface HighlightPRD {
  id: string;
  idea_preview: string;
  likes_count?: number;
  remixes_count?: number;
  user_name?: string;
  user_id?: string;
  avatar_url?: string;
}

interface HighlightsSectionProps {
  highlights: {
    mostLiked: HighlightPRD | null;
    mostRemixed: HighlightPRD | null;
    featured: HighlightPRD | null;
  };
  onView: (prd: HighlightPRD) => void;
}

export const HighlightsSection = ({ highlights, onView }: HighlightsSectionProps) => {
  const { mostLiked, mostRemixed, featured } = highlights;

  if (!mostLiked && !mostRemixed && !featured) return null;

  const cards = [
    {
      data: mostLiked,
      badge: { text: '❤️ Mais Curtido', color: 'bg-accent text-accent-foreground' },
      gradient: 'from-accent/5 to-accent/10',
      icon: Trophy,
      iconColor: 'text-accent',
      subtitle: mostLiked ? `${mostLiked.likes_count} likes` : 'Em breve',
    },
    {
      data: mostRemixed,
      badge: { text: '🔄 Mais Remixado', color: 'bg-primary text-primary-foreground' },
      gradient: 'from-primary/5 to-primary/10',
      icon: RefreshCw,
      iconColor: 'text-primary',
      subtitle: mostRemixed ? `${mostRemixed.remixes_count} remixes` : 'Em breve',
    },
    {
      data: featured,
      badge: { text: '✨ Escolha do Editor', color: 'bg-gray-400 text-gray-900' },
      gradient: 'from-gray-400/5 to-gray-400/10',
      icon: Star,
      iconColor: 'text-gray-400',
      subtitle: featured ? 'Selecionado pela equipe' : 'Em breve',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-2xl sm:text-3xl font-black uppercase mb-4 sm:mb-6 text-center">
        ⭐ Destaques da Semana
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {cards.map((card, index) => (
          <Card
            key={index}
            className={`relative overflow-hidden border-2 border-border p-4 sm:p-6 bg-gradient-to-br ${card.gradient}`}
          >
            <card.icon
              className={`absolute top-2 right-2 sm:top-4 sm:right-4 h-8 w-8 sm:h-12 sm:w-12 ${card.iconColor} opacity-10 sm:opacity-20`}
            />
            <Badge
              className={`mb-3 sm:mb-4 text-xs sm:text-sm ${card.badge.color} hover:opacity-90`}
            >
              {card.badge.text}
            </Badge>

            {card.data ? (
              <>
                <h3 className="font-bold text-base sm:text-lg mb-2 line-clamp-1 sm:line-clamp-2">
                  {card.data.idea_preview}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">{card.subtitle}</p>

                {/* Autor */}
                {card.data.user_name && (
                  <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-border/50">
                    <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                      <AvatarImage src={card.data.avatar_url} />
                      <AvatarFallback className="text-[10px] sm:text-xs">
                        {card.data.user_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs sm:text-sm font-medium truncate">
                      {card.data.user_name}
                    </span>
                    <UserRoleBadge userId={card.data.user_id} size="sm" />
                  </div>
                )}

                <Button
                  onClick={() => onView(card.data)}
                  variant="default"
                  className="w-full text-sm bg-primary hover:bg-accent"
                  size="sm"
                >
                  Ver PRD
                </Button>
              </>
            ) : (
              <>
                <h3 className="font-bold text-base sm:text-lg mb-2 text-muted-foreground">
                  Nenhum destaque ainda
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  {card.subtitle}
                </p>
                <Button variant="outline" className="w-full text-sm" size="sm" disabled>
                  Aguardando PRDs
                </Button>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
