import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trophy, ChevronDown, ChevronUp, Eye, Heart, Shuffle, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDisplayName, cn } from '@/lib/utils';
import { UserRoleBadge } from '@/components/UserRoleBadge';
import { logger } from '@/lib/logger';

interface Leader {
  user_id: string;
  engagement_score: number;
  name: string;
  username?: string;
  avatar_url?: string;
  total_views?: number;
  total_likes?: number;
  total_remixes?: number;
  total_prds?: number;
}

export const Leaderboard = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchLeaders();
  }, []);

  const fetchLeaders = async () => {
    try {
      const { data } = await supabase
        .from('monthly_leaderboard')
        .select('*')
        .order('engagement_score', { ascending: false })
        .limit(10);

      if (data) {
        const enriched = await Promise.all(
          data.map(async leader => {
            const { data: profile } = await supabase
              .from('public_profiles')
              .select('name, username, avatar_url')
              .eq('id', leader.user_id)
              .maybeSingle();

            return {
              ...leader,
              name: normalizeDisplayName(profile?.name || profile?.username || 'Anônimo'),
              username: profile?.username,
              avatar_url: profile?.avatar_url,
            };
          })
        );

        setLeaders(enriched);
      }
    } catch (error) {
      logger.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (isLoading) return null;
  if (leaders.length === 0) return null;

  const displayedLeadersDesktop = isExpanded ? leaders : leaders.slice(0, 3);
  const displayedLeadersMobile = isExpanded ? leaders : leaders.slice(0, 3);

  const getAvatarBorder = (rank: number) => {
    if (rank === 1) return 'border-brutal border-accent';
    if (rank === 2) return 'border-brutal border-primary';
    if (rank === 3) return 'border-brutal border-gray-400';
    return '';
  };

  const getPedestalHeight = (rank: number) => {
    if (rank === 1) return 'h-20 lg:h-24';
    if (rank === 2) return 'h-16 lg:h-20';
    if (rank === 3) return 'h-12 lg:h-16';
    return 'h-0';
  };

  const getPedestalColor = (rank: number) => {
    if (rank === 1) return 'bg-accent text-accent-foreground';
    if (rank === 2) return 'bg-primary text-primary-foreground';
    if (rank === 3) return 'bg-gray-400 text-gray-900';
    return '';
  };

  const PodiumCard = ({ leader, rank }: { leader: Leader; rank: number }) => {
    const leaderLink = leader.username ? `/u/${leader.username}` : '#';
    const isFirst = rank === 1;

    const profileCard = (
      <div className="flex flex-col items-center gap-2">
        {/* Coroa decorativa (apenas 1º lugar) */}
        {isFirst && (
          <div className="mb-2 animate-bounce-slow">
            <span className="text-4xl drop-shadow-lg">👑</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="relative z-10 bg-card border-brutal shadow-brutal rounded-xl p-4 w-full">
          {/* Avatar compacto */}
          <div className="flex justify-center mb-2">
            <Avatar className={`${isFirst ? 'h-16 w-16' : 'h-14 w-14'} ${getAvatarBorder(rank)}`}>
              {leader.avatar_url && <AvatarImage src={leader.avatar_url} alt={leader.name} />}
              <AvatarFallback className="text-xs font-bold">
                {leader.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Nome compacto */}
          <h3
            className={`text-center font-black ${isFirst ? 'text-base' : 'text-sm'} mb-2 truncate`}
          >
            {leader.name}
          </h3>

          {/* Role Badge */}
          <div className="flex justify-center mb-2">
            <UserRoleBadge userId={leader.user_id} size="sm" />
          </div>

          {/* Pontuação destaque compacta */}
          <div className="text-center mb-3">
            <Badge className="text-sm px-2.5 py-0.5 font-black bg-primary text-primary-foreground">
              {leader.engagement_score} pts
            </Badge>
          </div>

          {/* Stats inline compactas */}
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span className="font-bold">{(leader as any).prds_created}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              <span className="font-bold">{leader.total_likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shuffle className="h-3.5 w-3.5" />
              <span className="font-bold">{leader.total_remixes}</span>
            </div>
          </div>
        </div>

        {/* Pedestal */}
        <div
          className={`w-full ${getPedestalHeight(rank)} ${getPedestalColor(rank)} border-brutal shadow-brutal rounded-lg flex items-center justify-center`}
        >
          <div className="text-center">
            <div className="text-2xl lg:text-3xl font-black text-white drop-shadow-lg">#{rank}</div>
            <div className="text-[10px] font-bold text-white uppercase tracking-wider">
              {rank === 1 ? 'Campeão' : rank === 2 ? 'Vice' : 'Terceiro'}
            </div>
          </div>
        </div>
      </div>
    );

    return leader.username ? (
      <Link to={leaderLink} className="block group">
        {profileCard}
      </Link>
    ) : (
      <div>{profileCard}</div>
    );
  };

  const RankCard = ({
    leader,
    rank,
    isCentered = false,
  }: {
    leader: Leader;
    rank: number;
    isCentered?: boolean;
  }) => {
    const leaderLink = leader.username ? `/u/${leader.username}` : '#';

    const content = (
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-lg bg-card border-brutal shadow-brutal',
          isCentered && 'lg:justify-center'
        )}
      >
        {/* Rank + Avatar */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-2xl font-black text-muted-foreground w-8 text-center">#{rank}</div>
          <Avatar className="h-14 w-14">
            {leader.avatar_url && <AvatarImage src={leader.avatar_url} alt={leader.name} />}
            <AvatarFallback className="text-sm font-bold">
              {leader.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-bold text-base truncate">{leader.name}</h4>
            <UserRoleBadge userId={leader.user_id} size="sm" />
          </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              <span>{(leader as any).prds_created} PRDs</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              <span>{leader.total_likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Shuffle className="h-3 w-3" />
              <span>{leader.total_remixes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              <span>{leader.total_views}</span>
            </div>
          </div>
        </div>

        {/* Pontuação */}
        <Badge className="flex-shrink-0 font-bold bg-primary text-primary-foreground">
          {leader.engagement_score} pts
        </Badge>
      </div>
    );

    return leader.username ? (
      <Link to={leaderLink} className="block group">
        {content}
      </Link>
    ) : (
      <div>{content}</div>
    );
  };

  return (
    <Card className="border-2 border-border p-6 pb-10 lg:p-8 lg:pb-12 mb-8">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-yellow-500" />
        <div>
          <h2 className="text-2xl font-black uppercase">🏆 Top Criadores</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ranking baseado em todo o histórico da plataforma
          </p>
        </div>
      </div>

      {/* DESKTOP/TABLET: Pódio + Grid */}
      <div className="hidden lg:block">
        {/* Pódio Top 3 */}
        {leaders.length >= 3 && (
          <>
            <div className="grid grid-cols-3 gap-4 lg:gap-6 mb-6 items-end">
              {/* 2º Lugar (esquerda) */}
              <PodiumCard leader={leaders[1]} rank={2} />

              {/* 1º Lugar (centro) */}
              <PodiumCard leader={leaders[0]} rank={1} />

              {/* 3º Lugar (direita) */}
              <PodiumCard leader={leaders[2]} rank={3} />
            </div>

            {leaders.length > 3 && <Separator className="my-6" />}
          </>
        )}

        {/* Posições 4+ em Grid */}
        {displayedLeadersDesktop.length > 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedLeadersDesktop.slice(3).map((leader, idx) => {
              const rank = idx + 4;
              const isTenth = rank === 10;
              const isLastItem = idx === displayedLeadersDesktop.slice(3).length - 1;

              return (
                <div key={leader.user_id} className={cn(isTenth && isLastItem && 'lg:col-span-2')}>
                  <RankCard leader={leader} rank={rank} isCentered={isTenth && isLastItem} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MOBILE: Lista simples */}
      <div className="lg:hidden space-y-3">
        {displayedLeadersMobile.map((leader, index) => {
          const leaderLink = leader.username ? `/u/${leader.username}` : '#';
          const CardContent = (
            <div className="flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-card border-brutal shadow-brutal">
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-xl font-bold">{getMedalEmoji(index + 1)}</div>

                <Avatar className="h-10 w-10">
                  {leader.avatar_url && <AvatarImage src={leader.avatar_url} alt={leader.name} />}
                  <AvatarFallback className="text-xs">
                    {leader.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <p className="font-bold text-sm truncate">{leader.name}</p>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge className="text-xs font-bold bg-primary text-primary-foreground">
                    {leader.engagement_score} pts
                  </Badge>

                  <UserRoleBadge userId={leader.user_id} size="sm" />

                  <span>•</span>

                  <span className="whitespace-nowrap font-medium">{(leader as any).prds_created} PRDs</span>
                </div>
              </div>
            </div>
          );

          return leader.username ? (
            <Link key={leader.user_id} to={leaderLink}>
              {CardContent}
            </Link>
          ) : (
            <div key={leader.user_id}>{CardContent}</div>
          );
        })}
      </div>

      {leaders.length > 3 && (
        <Button
          variant="outline"
          size="lg"
          className="w-full mt-6 border-brutal shadow-brutal font-extrabold uppercase lg:hidden !py-4 flex items-center justify-center"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Mostrar Top 3
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Ver Top 10 Completo
            </>
          )}
        </Button>
      )}

      {leaders.length > 3 && (
        <Button
          variant="outline"
          size="lg"
          className="w-full mt-6 border-brutal shadow-brutal font-extrabold uppercase hidden lg:flex lg:items-center lg:justify-center !py-4"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Mostrar Menos
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Ver Top 10 Completo
            </>
          )}
        </Button>
      )}
    </Card>
  );
};
