import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, Trophy, TrendingUp, Zap } from 'lucide-react';
import { LoadingState } from '@/components/states/LoadingState';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WhatsAppAuth } from '@/components/WhatsAppAuth';
import { useAuth } from '@/contexts/AuthContext';
import { EventLeaderboard } from '@/components/events/EventLeaderboard';
import { VotingInterface } from '@/components/events/VotingInterface';
import { VotingResultsDashboard } from '@/components/events/VotingResultsDashboard';
import { toast } from 'sonner';
import { debugLog } from '@/utils/debugLogger';
import { getUTMParams, type UTMParams } from '@/utils/utmTracker';
import { logger } from '@/lib/logger';

interface OrganizerLogo {
  url: string;
  name: string;
}

interface EventData {
  name: string;
  description?: string;
  logo_url?: string;
  logo_size?: string; // Changed to string to match database type
  start_date: string | null;
  end_date: string | null;
  event_visibility?: string;
  organizers_logos?: OrganizerLogo[];
}

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [stats, setStats] = useState({ totalParticipants: 0, totalPRDs: 0 });
  const [userStats, setUserStats] = useState<{ prds_created: number; points: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [eventStatus, setEventStatus] = useState<'upcoming' | 'ongoing' | 'ended'>('ongoing');
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);

  // Capturar UTM params ao montar
  useEffect(() => {
    const params = getUTMParams();
    if (params) {
      setUtmParams(params);
      debugLog('📊 UTM params capturados no evento:', params);
    }
  }, []);

  useEffect(() => {
    if (slug) {
      fetchEvent();
    }
  }, [slug, user]);

  // Setup realtime updates for event stats
  useEffect(() => {
    if (!slug) return;

    const statsChannel = supabase
      .channel(`event-stats-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_participants',
          filter: `event_slug=eq.${slug}`,
        },
        () => {
          fetchEvent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
    };
  }, [slug]);

  // Countdown timer que atualiza a cada segundo
  useEffect(() => {
    if (!event) return;

    // Detectar evento permanente (datas NULL)
    const isPermanent = event.start_date === null && event.end_date === null;

    if (isPermanent) {
      setEventStatus('ongoing'); // Sempre ativo
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return; // Não atualizar timer
    }

    const updateTimer = () => {
      const now = new Date();
      const startDate = new Date(event.start_date!);
      const endDate = new Date(event.end_date!);

      // Evento ainda não começou
      if (now < startDate) {
        setEventStatus('upcoming');
        const timeToStart = Math.max(0, startDate.getTime() - now.getTime());

        const days = Math.floor(timeToStart / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeToStart % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeToStart % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeToStart % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
      // Evento em andamento
      else if (now >= startDate && now < endDate) {
        setEventStatus('ongoing');
        const timeLeftMs = Math.max(0, endDate.getTime() - now.getTime());

        const days = Math.floor(timeLeftMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeLeftMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
      // Evento encerrado
      else {
        setEventStatus('ended');
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateTimer(); // Atualizar imediatamente
    const interval = setInterval(updateTimer, 1000); // Atualizar a cada segundo

    return () => clearInterval(interval);
  }, [event]);

  // Rastrear aquisição + fechar modal após autenticação
  useEffect(() => {
    const trackAndFetch = async () => {
      if (user && !authLoading && showAuthDialog) {
        debugLog('✅ Usuário autenticado, fechando modal');

        // Rastrear aquisição se houver UTM params
        if (utmParams) {
          try {
            await supabase.functions.invoke('track-acquisition', {
              body: { user_id: user.id, utm_params: utmParams },
            });
            debugLog('✅ Aquisição rastreada no evento');
          } catch (error) {
            debugLog('⚠️ Erro ao rastrear aquisição:', error);
          }
        }

        setShowAuthDialog(false);
        fetchEvent();
      }
    };

    trackAndFetch();
  }, [user, authLoading, showAuthDialog, utmParams]);

  const fetchEvent = async () => {
    try {
      const { data: eventData, error } = await supabase
        .from('events')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      // Verificar visibilidade do evento
      if (!eventData) {
        setEvent(null);
        setLoading(false);
        return;
      }

      // Se evento está escondido, só mostrar para admin
      if (eventData.event_visibility === 'hidden' && !isAdmin) {
        setEvent(null);
        setLoading(false);
        return;
      }

      // Se tem data de despublicação programada, verificar
      if (eventData.event_visibility === 'scheduled_removal' && eventData.unpublish_date) {
        const now = new Date();
        const unpublishDate = new Date(eventData.unpublish_date);

        if (now > unpublishDate && !isAdmin) {
          setEvent(null);
          setLoading(false);
          return;
        }
      }

      setEvent(eventData as unknown as EventData);

      // Buscar stats
      const { count: participantCount } = await supabase
        .from('event_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_slug', slug);

      const { count: prdCount } = await supabase
        .from('event_actions')
        .select('*', { count: 'exact', head: true })
        .eq('event_slug', slug)
        .eq('action_type', 'create_prd');

      setStats({
        totalParticipants: participantCount || 0,
        totalPRDs: prdCount || 0,
      });

      // Verificar se usuário já é participante e buscar stats
      if (user) {
        const { data: participantData } = await supabase
          .from('event_participants')
          .select('prds_created, points')
          .eq('event_slug', slug)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsParticipant(!!participantData);
        setUserStats(participantData);
      }
    } catch (error) {
      logger.error('Erro ao buscar evento:', error);
      toast.error('Evento não encontrado');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async () => {
    if (!user) {
      setShowAuthDialog(true);
      return;
    }

    // Verificar se já é participante
    if (isParticipant) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('register-event-participant', {
        body: {
          event_slug: slug,
          user_id: user.id,
          acquisition_metadata: utmParams || null,
        },
      });

      if (error) throw error;

      toast.success('Você entrou no evento! 🎉');
      setIsParticipant(true);
      fetchEvent();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao entrar no evento');
    }
  };

  if (loading) {
    return <LoadingState variant="fullscreen" message="Carregando evento..." />;
  }

  if (!event) {
    return <Navigate to="/" replace />;
  }

  // Detectar evento permanente (sem datas)
  const isPermanentEvent = event.start_date === null && event.end_date === null;
  const isUrgent = timeLeft.hours < 1 && eventStatus === 'ongoing';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Chevron Pattern Background - CHAMPIONS STYLE */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 L30 0 L30 60 Z' fill='%23000'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Hero Section - CHAMPIONS STYLE */}
      <div className="relative bg-background py-12 px-4 overflow-hidden border-b-[4px] border-foreground">
        <div className="max-w-6xl mx-auto relative z-10">
          {/* Logo + Título Compacto */}
          <div className="text-center mb-6">
            {event.logo_url && (
              <div className="flex justify-center mb-4">
                <img
                  src={event.logo_url}
                  alt={`Logo ${event.name}`}
                  className="h-24 w-auto object-contain"
                />
              </div>
            )}

            <h1 className="text-[clamp(1.5rem,5vw,3.5rem)] font-bebas uppercase leading-none tracking-tight mb-3 text-foreground">
              {event.name}
            </h1>

            {event.description && (
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          {/* Seção de Realizadores - REMOVIDO DAQUI */}

          {/* Timer - APENAS para eventos com cronograma */}
          {!isPermanentEvent && (
            <div className="flex justify-center mb-12">
              <div
                className={`bg-background border-brutal-thick border-foreground px-12 py-10 shadow-brutal-lg shadow-accent hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-brutal-sm hover:shadow-accent transition-all duration-200 ${isUrgent ? 'timer-urgent' : ''}`}
                aria-live="polite"
                aria-label={
                  eventStatus === 'upcoming'
                    ? `Evento começa em: ${timeLeft.days} dias, ${timeLeft.hours} horas, ${timeLeft.minutes} minutos e ${timeLeft.seconds} segundos`
                    : eventStatus === 'ongoing'
                      ? `Tempo restante: ${timeLeft.hours} horas, ${timeLeft.minutes} minutos e ${timeLeft.seconds} segundos`
                      : 'Evento encerrado'
                }
              >
                {eventStatus === 'ended' ? (
                  <>
                    {event.event_visibility === 'public_ended' ? (
                      <>
                        <div className="text-4xl sm:text-6xl font-bebas uppercase text-foreground mb-2 leading-none">
                          Evento Encerrado
                        </div>
                        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          Confira o Ranking Final Abaixo 🏆
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-4xl sm:text-6xl font-bebas uppercase text-foreground mb-2 leading-none">
                          Evento Encerrado
                        </div>
                        <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          Obrigado pela participação! 🎉
                        </div>
                      </>
                    )}
                  </>
                ) : eventStatus === 'upcoming' ? (
                  <>
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                      Começa em
                    </div>
                    {timeLeft.days >= 1 ? (
                      <div className="text-6xl sm:text-8xl font-bebas text-foreground leading-none">
                        {timeLeft.days} {timeLeft.days === 1 ? 'dia' : 'dias'}
                      </div>
                    ) : (
                      <div className="text-6xl sm:text-8xl font-bebas tabular-nums text-foreground leading-none">
                        {String(timeLeft.hours).padStart(2, '0')}:
                        {String(timeLeft.minutes).padStart(2, '0')}:
                        {String(timeLeft.seconds).padStart(2, '0')}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                      Tempo Restante
                    </div>
                    <div className="text-6xl sm:text-8xl font-bebas tabular-nums text-foreground leading-none">
                      {String(timeLeft.hours).padStart(2, '0')}:
                      {String(timeLeft.minutes).padStart(2, '0')}:
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Stats Inline */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm sm:text-base text-muted-foreground font-semibold">
            <span>{stats.totalParticipants} Participantes</span>
            <span>•</span>
            <span>{stats.totalPRDs} PRDs Criados</span>
            {isParticipant && userStats && (
              <>
                <span>•</span>
                <span className="text-primary">{userStats.prds_created} Seus PRDs</span>
                <span>•</span>
                <span className="text-primary">{userStats.points} Seus Pontos</span>
              </>
            )}
          </div>

          {/* Seção de Realizadores - ACIMA DO CTA */}
          {event.organizers_logos && event.organizers_logos?.length > 0 && (
            <div className="mt-10 mb-6">
              <p className="text-center text-xs sm:text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Realização:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {event.organizers_logos?.slice(0, 3).map((org: OrganizerLogo, index: number) => {
                  const sizeClasses = {
                    small: 'w-20 h-20 sm:w-28 sm:h-28',
                    medium: 'w-28 h-28 sm:w-36 sm:h-36',
                    large: 'w-36 h-36 sm:w-44 sm:h-44',
                  };

                  const logoSize = event.logo_size || 'small';

                  return (
                    <div
                      key={index}
                      className={`flex items-center justify-center ${sizeClasses[logoSize as keyof typeof sizeClasses]}`}
                    >
                      <img
                        src={org.url}
                        alt={org.name}
                        className="max-w-full max-h-full object-contain opacity-80 hover:opacity-100 transition-opacity"
                        title={org.name}
                      />
                    </div>
                  );
                })}

                {event.organizers_logos?.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{event.organizers_logos?.length - 3} mais
                  </span>
                )}
              </div>
            </div>
          )}

          {/* CTA Section - Oculto quando evento encerrado */}
          {eventStatus !== 'ended' && (
            <div className="mt-6 text-center">
              <div className="max-w-md mx-auto">
                {!isParticipant ? (
                  <button
                    onClick={handleJoinEvent}
                    className="w-full bg-gray-900 text-white text-base sm:text-xl font-black uppercase py-4 px-8 
                             border-brutal border-black shadow-brutal-accent 
                             hover:shadow-brutal-sm hover:shadow-accent hover:translate-x-1 hover:translate-y-1 
                             transition-all duration-200 tracking-tight"
                  >
                    🚀 ENTRAR NO EVENTO AGORA!
                  </button>
                ) : (
                  <button
                    onClick={() => (window.location.href = '/')}
                    className="w-full bg-accent text-white text-base sm:text-xl font-black uppercase py-4 px-8 
                             border-brutal border-black shadow-brutal 
                             hover:shadow-brutal-sm hover:translate-x-1 hover:translate-y-1 
                             transition-all duration-200 tracking-tight"
                  >
                    ⚡ CRIAR PRD AGORA!
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Seção de Participantes - APENAS para eventos permanentes */}
          {isPermanentEvent && (
            <div className="mt-16 pt-12 border-t-[4px] border-foreground">
              <h2 className="text-4xl sm:text-6xl font-bebas text-center mb-10 text-foreground tracking-tight leading-none uppercase">
                Participantes
              </h2>
              
              <div className="flex justify-center">
                <div className="bg-background border-brutal-thick border-foreground px-12 py-10 shadow-brutal-lg shadow-accent hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-brutal-sm hover:shadow-accent transition-all duration-200 max-w-md w-full">
                  <div className="text-center space-y-4">
                    {/* Ícone Troféu Laranja */}
                    <div className="flex justify-center mb-4">
                      <svg 
                        className="w-16 h-16 text-accent" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M20 7h-2V5c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v3c0 2.21 1.79 4 4 4h.4c.5 1.6 1.6 2.9 3.1 3.6V22h5v-2.4c1.5-.7 2.6-2 3.1-3.6h.4c2.21 0 4-1.79 4-4V9c0-1.1-.9-2-2-2zM6 14c-1.1 0-2-.9-2-2v-2h2v2c0 .55.11 1.07.29 1.55-.1.15-.19.29-.29.45zm10 3c0 1.66-1.34 3-3 3s-3-1.34-3-3v-1.5h6V17zm4-5c0 1.1-.9 2-2 2-.1-.16-.19-.3-.29-.45.18-.48.29-1 .29-1.55V9h2v3z"/>
                      </svg>
                    </div>
                    
                    {/* Texto "INSCRIÇÕES ABERTAS" */}
                    <div className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Inscrições Abertas
                    </div>
                    
                    {/* Número de Participantes */}
                    <div className="text-7xl sm:text-9xl font-bebas text-accent leading-none">
                      {stats.totalParticipants}
                    </div>
                    
                    {/* Texto "pessoa inscrita" / "pessoas inscritas" */}
                    <div className="text-sm text-muted-foreground">
                      {stats.totalParticipants === 1 ? 'pessoa inscrita' : 'pessoas inscritas'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Componentes apenas para eventos com cronograma (não permanentes) */}
      {!isPermanentEvent && (
        <>
          {/* Voting Interface */}
          {eventStatus === 'ongoing' && (
            <div className="bg-muted/30 py-12 px-4">
              <div className="max-w-2xl mx-auto">
                <VotingInterface eventSlug={slug!} />
              </div>
            </div>
          )}

          {/* Leaderboard Section */}
          <div className="bg-background py-12 sm:py-16 px-4 pb-16">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl sm:text-6xl font-bebas text-center mb-10 text-foreground tracking-tight leading-none">
                {eventStatus === 'upcoming' && 'PARTICIPANTES'}
                {eventStatus === 'ongoing' && 'RANKING AO VIVO'}
                {eventStatus === 'ended' && 'PÓDIO FINAL'}
              </h2>

              <EventLeaderboard eventSlug={slug!} eventStatus={eventStatus} />
            </div>
          </div>

          {/* Voting Results */}
          {eventStatus === 'ongoing' && (
            <div className="bg-muted/30 py-12 px-4">
              <div className="max-w-6xl mx-auto">
                <VotingResultsDashboard eventSlug={slug!} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-2xl font-black text-center bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            ENTRE NO EVENTO
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Faça login para participar do hackathon
          </DialogDescription>
          <WhatsAppAuth
            onSuccess={() => {
              // O useEffect acima cuidará de fechar o modal
              debugLog('🎉 Login bem-sucedido, aguardando AuthContext...');
            }}
            utmParams={utmParams}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
