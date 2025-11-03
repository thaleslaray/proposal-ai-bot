import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface LeaderboardEntry {
  user_id: string;
  prds_created: number;
  points: number;
  profiles: {
    name: string;
    avatar_url: string | null;
    username: string | null;
  };
}

interface EventLeaderboardProps {
  eventSlug: string;
  eventStatus: 'upcoming' | 'ongoing' | 'ended';
}

export const EventLeaderboard = ({ eventSlug, eventStatus }: EventLeaderboardProps) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchLeaderboard = useCallback(async () => {
    try {
      // Buscar total de inscritos
      const { count } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_slug', eventSlug);

      setTotalParticipants(count || 0);

      // Buscar ranking (limitar por status)
      const limit = eventStatus === 'ended' ? 3 : 10;

      const { data, error } = await supabase
        .from('event_participants')
        .select(
          `
        user_id,
          prds_created,
          points,
          profiles!inner(name, avatar_url, username)
        `
        )
        .eq('event_slug', eventSlug)
        .order('points', { ascending: false })
        .order('prds_created', { ascending: false })
        .order('registered_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      setLeaderboard((data || []) as LeaderboardEntry[]);
    } catch (error) {
      logger.error('Erro ao buscar leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [eventSlug, eventStatus]);

  useEffect(() => {
    fetchLeaderboard();

    // Setup realtime subscription
    const channel = supabase
      .channel(`event-leaderboard-${eventSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_slug=eq.${eventSlug}`,
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug, fetchLeaderboard]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </Card>
    );
  }

  // UPCOMING: Mostrar apenas inscritos
  if (eventStatus === 'upcoming') {
    return (
      <Card className="p-12 text-center border-[6px] border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.2)]">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-[#FF6B35]" />
        <h3 className="text-3xl font-bebas uppercase mb-2">Inscrições Abertas</h3>
        <div className="text-6xl font-bebas text-[#FF6B35] my-4">{totalParticipants}</div>
        <p className="text-muted-foreground">
          {totalParticipants === 0
            ? 'Seja o primeiro a se inscrever!'
            : totalParticipants === 1
              ? 'pessoa inscrita'
              : 'pessoas inscritas'}
        </p>
      </Card>
    );
  }

  // ENDED: Mostrar apenas TOP 3
  if (eventStatus === 'ended') {
    if (leaderboard.length === 0) {
      return (
        <Card className="p-12 text-center border-[6px] border-foreground">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-bold mb-2">Nenhum participante</h3>
          <p className="text-muted-foreground">Este evento não teve participações.</p>
        </Card>
      );
    }

    // Mostrar pódio final (TOP 3)
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bebas uppercase text-[#FF6B35] mb-2">🏆 PÓDIO FINAL</h3>
          <p className="text-sm text-muted-foreground">Os grandes vencedores deste evento!</p>
        </div>

        {/* Pódio */}
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2º Lugar */}
          {leaderboard[1] && (
            <Card className="w-28 sm:w-32 p-3 sm:p-4 text-center bg-muted border-[6px] border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.3)]">
              <div className="text-3xl sm:text-4xl mb-2">🥈</div>
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 border-4 border-foreground">
                <AvatarImage src={leaderboard[1].profiles.avatar_url || undefined} />
                <AvatarFallback className="font-black">
                  {leaderboard[1].profiles.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs font-bold truncate">{leaderboard[1].profiles.name}</div>
              <div className="text-xl sm:text-2xl font-black text-[#FF6B35] mt-2">
                {leaderboard[1].points}
              </div>
              <div className="text-xs text-muted-foreground uppercase">pts</div>
            </Card>
          )}

          {/* 1º Lugar */}
          <Card className="w-36 sm:w-40 p-4 sm:p-6 text-center bg-[#FF6B35]/10 border-[8px] border-[#0a0a0a] shadow-[12px_12px_0_0_#FF6B35] relative -top-8">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#0a0a0a] text-white px-4 py-2 border-[4px] border-[#0a0a0a] text-xs sm:text-sm font-black uppercase">
              👑 CAMPEÃO
            </div>
            <div className="text-4xl sm:text-5xl mb-2">🥇</div>
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 border-[6px] border-[#0a0a0a] ring-4 ring-[#FF6B35]">
              <AvatarImage src={leaderboard[0].profiles.avatar_url || undefined} />
              <AvatarFallback className="font-black text-lg">
                {leaderboard[0].profiles.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="font-black truncate text-sm sm:text-base">
              {leaderboard[0].profiles.name}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#FF6B35] mt-2">
              {leaderboard[0].points}
            </div>
            <div className="text-xs font-bold uppercase">pontos</div>
          </Card>

          {/* 3º Lugar */}
          {leaderboard[2] && (
            <Card className="w-28 sm:w-32 p-3 sm:p-4 text-center bg-muted border-[6px] border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.3)]">
              <div className="text-3xl sm:text-4xl mb-2">🥉</div>
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 border-4 border-foreground">
                <AvatarImage src={leaderboard[2].profiles.avatar_url || undefined} />
                <AvatarFallback className="font-black">
                  {leaderboard[2].profiles.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="text-xs font-bold truncate">{leaderboard[2].profiles.name}</div>
              <div className="text-xl sm:text-2xl font-black text-[#FF6B35] mt-2">
                {leaderboard[2].points}
              </div>
              <div className="text-xs text-muted-foreground uppercase">pts</div>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ONGOING: Mostrar ranking completo
  if (leaderboard.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-bold mb-2">Nenhum participante ainda</h3>
        <p className="text-muted-foreground">Seja o primeiro a criar um PRD!</p>
      </Card>
    );
  }

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pódio CHAMPIONS STYLE - Bordas Pesadas */}
      {leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-8">
          {/* 2º Lugar - MENOR */}
          <Card className="w-28 sm:w-32 p-3 sm:p-4 text-center bg-muted border-[6px] border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.3)]">
            <div className="text-3xl sm:text-4xl mb-2">🥈</div>
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 border-4 border-foreground">
              <AvatarImage src={leaderboard[1].profiles.avatar_url || undefined} />
              <AvatarFallback className="font-black">
                {leaderboard[1].profiles.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs font-bold truncate">{leaderboard[1].profiles.name}</div>
            <div className="text-xl sm:text-2xl font-black text-[#FF6B35] mt-2">
              {leaderboard[1].points}
            </div>
            <div className="text-xs text-muted-foreground uppercase">pts</div>
          </Card>

          {/* 1º Lugar - MAIOR (máximo destaque) */}
          <Card className="w-36 sm:w-40 p-4 sm:p-6 text-center bg-[#FF6B35]/10 border-[8px] border-[#0a0a0a] shadow-[12px_12px_0_0_#FF6B35] relative -top-8">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#0a0a0a] text-white px-4 py-2 border-[4px] border-[#0a0a0a] text-xs sm:text-sm font-black uppercase">
              👑 LÍDER
            </div>
            <div className="text-4xl sm:text-5xl mb-2">🥇</div>
            <Avatar className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-2 border-[6px] border-[#0a0a0a] ring-4 ring-[#FF6B35]">
              <AvatarImage src={leaderboard[0].profiles.avatar_url || undefined} />
              <AvatarFallback className="font-black text-lg">
                {leaderboard[0].profiles.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="font-black truncate text-sm sm:text-base">
              {leaderboard[0].profiles.name}
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#FF6B35] mt-2">
              {leaderboard[0].points}
            </div>
            <div className="text-xs font-bold uppercase">pontos</div>
          </Card>

          {/* 3º Lugar - MENOR */}
          <Card className="w-28 sm:w-32 p-3 sm:p-4 text-center bg-muted border-[6px] border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.3)]">
            <div className="text-3xl sm:text-4xl mb-2">🥉</div>
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 border-4 border-foreground">
              <AvatarImage src={leaderboard[2].profiles.avatar_url || undefined} />
              <AvatarFallback className="font-black">
                {leaderboard[2].profiles.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-xs font-bold truncate">{leaderboard[2].profiles.name}</div>
            <div className="text-xl sm:text-2xl font-black text-[#FF6B35] mt-2">
              {leaderboard[2].points}
            </div>
            <div className="text-xs text-muted-foreground uppercase">pts</div>
          </Card>
        </div>
      )}

      {/* Lista CHAMPIONS STYLE - Hover Impactante */}
      <Card
        className="divide-y border-[6px] border-foreground shadow-[8px_8px_0_0_rgba(0,0,0,0.2)] bg-card"
        role="list"
        aria-label="Ranking do evento"
      >
        {leaderboard.map((entry, index) => {
          const actualPosition = index + 1;
          const pointsFromLeader = leaderboard[0].points - entry.points;
          const isCurrentUser = entry.user_id === user?.id;

          return (
            <div
              key={entry.user_id}
              role="listitem"
              tabIndex={0}
              className={`p-4 flex items-center gap-4 hover:bg-[#FF6B35]/10 hover:border-l-[8px] hover:border-l-[#FF6B35] transition-all duration-200 ${
                index < 3 ? 'bg-accent/5' : ''
              } ${isCurrentUser ? 'bg-[#FF6B35]/20 border-l-[8px] border-l-[#FF6B35]' : ''}`}
            >
              {/* Posição */}
              <div className="text-xl sm:text-2xl font-black w-8 sm:w-12 text-center">
                {getMedalIcon(index) || `#${actualPosition}`}
              </div>

              {/* Avatar + Nome */}
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-foreground">
                <AvatarImage src={entry.profiles.avatar_url || undefined} />
                <AvatarFallback className="font-black">{entry.profiles.name[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="font-bold truncate flex items-center gap-2">
                  {entry.profiles.name}
                  {isCurrentUser && (
                    <Badge variant="secondary" className="text-xs">
                      VOCÊ
                    </Badge>
                  )}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3 h-3" />
                  {entry.prds_created} PRDs
                  {actualPosition > 1 && (
                    <span className="text-xs opacity-70">• {pointsFromLeader} pts do líder</span>
                  )}
                </div>
              </div>

              {/* Pontos */}
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-black">{entry.points}</div>
                <div className="text-xs text-muted-foreground">pontos</div>
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
};
