import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, Calendar, Trophy, Maximize } from 'lucide-react';
import { EventLeaderboard } from '@/components/events/EventLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logger } from '@/lib/logger';

interface EventData {
  name: string;
  start_date: string;
  end_date: string;
}

interface StatsData {
  totalParticipants: number;
  totalPRDs: number;
  prdsLastHour: number;
}

interface RecentPRD {
  id: string;
  [key: string]: unknown;
}

export default function LiveEventDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { isAdmin } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentPRDs, setRecentPRDs] = useState<RecentPRD[]>([]);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'ongoing' | 'ended'>('upcoming');

  useEffect(() => {
    if (isAdmin && slug) {
      fetchData();
      const interval = setInterval(fetchData, 5000); // Atualizar a cada 5s
      return () => clearInterval(interval);
    }
  }, [isAdmin, slug]);

  // Countdown timer que atualiza a cada segundo
  useEffect(() => {
    if (!event) return;

    const updateTimer = () => {
      const now = new Date();
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      // DEBUG - Remover depois
      logger.log('🔍 DEBUG Event Status:', {
        now: now.toISOString(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        nowTimestamp: now.getTime(),
        startTimestamp: startDate.getTime(),
        endTimestamp: endDate.getTime(),
        isBeforeStart: now < startDate,
        isAfterStart: now >= startDate,
        isBeforeEnd: now < endDate,
      });

      // Determinar status do evento
      if (now < startDate) {
        logger.log('✅ Status: UPCOMING');
        setEventStatus('upcoming');
      } else if (now >= startDate && now < endDate) {
        logger.log('✅ Status: ONGOING');
        setEventStatus('ongoing');
      } else {
        logger.log('✅ Status: ENDED');
        setEventStatus('ended');
      }

      const timeLeftMs = Math.max(0, endDate.getTime() - now.getTime());

      const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer(); // Atualizar imediatamente
    const interval = setInterval(updateTimer, 1000); // Atualizar a cada segundo

    return () => clearInterval(interval);
  }, [event]);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-event-stats', {
        body: { event_slug: slug },
      });

      if (error) throw error;

      setEvent(data.event);
      setStats(data.stats);
      setRecentPRDs(data.recentPRDs || []);
    } catch (error) {
      logger.error('Erro ao buscar stats:', error);
    }
  };

  const togglePresentationMode = () => {
    if (!isPresentationMode) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsPresentationMode(!isPresentationMode);
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (!event || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isPresentationMode ? 'p-8' : 'p-6'}`}>
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black mb-2 text-primary">{event.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="font-bold text-lg">
                  {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s restantes
                </span>
              </div>
            </div>
          </div>
          <Button onClick={togglePresentationMode} variant="brutal" className="border-brutal">
            <Maximize className="w-4 h-4 mr-2" />
            {isPresentationMode ? 'Sair' : 'Modo Apresentação'}
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-brutal shadow-brutal bg-blue-50 hover:shadow-brutal-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 border-4 border-black">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-4xl font-black text-blue-600">{stats.totalParticipants}</div>
                <div className="text-sm font-bold uppercase text-gray-700">Participantes</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-brutal shadow-brutal bg-green-50 hover:shadow-brutal-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500 border-4 border-black">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-4xl font-black text-green-600">{stats.totalPRDs}</div>
                <div className="text-sm font-bold uppercase text-gray-700">PRDs Criados</div>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-brutal shadow-brutal bg-purple-50 hover:shadow-brutal-lg transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500 border-4 border-black">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <div>
                <div className="text-4xl font-black text-purple-600">{stats.prdsLastHour}</div>
                <div className="text-sm font-bold uppercase text-gray-700">Última Hora</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Leaderboard */}
          <div>
            {/* Título condicional baseado no status */}
            <div className="mb-4 text-center">
              {eventStatus === 'upcoming' && (
                <h2 className="text-3xl sm:text-4xl font-black uppercase text-primary mb-4">
                  🏆 Inscrições Abertas
                </h2>
              )}
              {eventStatus === 'ongoing' && (
                <h2 className="text-3xl sm:text-4xl font-black uppercase text-primary mb-4">
                  🏆 Ranking ao Vivo
                </h2>
              )}
              {eventStatus === 'ended' && (
                <h2 className="text-3xl sm:text-4xl font-black uppercase text-primary mb-4">
                  🏆 Pódio Final
                </h2>
              )}
            </div>

            <EventLeaderboard eventSlug={slug!} eventStatus={eventStatus} />
          </div>

          {/* Feed de Atividades */}
          <div>
            <Card className="p-6 border-brutal shadow-brutal bg-orange-50">
              <h3 className="text-2xl font-black mb-4 text-orange-600">🔥 Atividade ao Vivo</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {recentPRDs.length === 0 ? (
                  <p className="text-center font-bold text-gray-600 py-8">
                    Aguardando primeira atividade...
                  </p>
                ) : (
                  recentPRDs.map(action => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 bg-white border-4 border-black hover:shadow-brutal transition-shadow animate-in slide-in-from-top-2 fade-in duration-300"
                    >
                      <Avatar className="w-10 h-10 border-2 border-primary/20">
                        <AvatarImage src={(action.profiles as any)?.avatar_url || undefined} />
                        <AvatarFallback>{((action.profiles as any)?.name || 'U')[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{(action.profiles as any)?.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {(action.document_history as any)?.idea_preview ||
                            (action.document_history as any)?.description ||
                            'Criou um PRD'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(action.created_at as any).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-green-500">
                        +{(action.points_earned as any) || 0} pts
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
