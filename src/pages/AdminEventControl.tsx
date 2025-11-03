import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Mic,
  BarChart3,
  XCircle,
  Eye,
  Radio,
  Shuffle,
  ArrowLeft,
  Settings,
  Clock,
  Save,
  StopCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { VotingParticipantsList } from '@/components/events/VotingParticipantsList';
import { Switch } from '@/components/ui/switch';
import { exportToCSV, generateFilename, formatDateBR } from '@/utils/csvExport';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { logger } from '@/lib/logger';

interface BroadcastState {
  current_state: 'idle' | 'presenting_team' | 'voting_open' | 'results_revealed';
  current_team_name: string | null;
  voting_closes_at: string | null;
  pitch_closes_at: string | null;
  teams_presented: string[];
  random_mode_enabled: boolean;
  pitch_duration_seconds?: number;
  voting_duration_seconds?: number;
}

interface ControlLog {
  action: string;
  team_name: string | null;
  created_at: string;
}

export default function AdminEventControl() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAdmin, loading } = useAuth();
  const [teams, setTeams] = useState<string[]>([]);
  const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [randomMode, setRandomMode] = useState(false);
  const [actionLogs, setActionLogs] = useState<ControlLog[]>([]);
  const [pitchDuration, setPitchDuration] = useState(300); // 5min default
  const [votingDuration, setVotingDuration] = useState(120); // 2min default
  const [pitchMinutes, setPitchMinutes] = useState(5);
  const [votingMinutes, setVotingMinutes] = useState(2);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) {
      navigate('/');
    }
  }, [loading, isAdmin, navigate]);

  useEffect(() => {
    if (!slug) return;

    const fetchEventData = async () => {
      setIsLoading(true);

      // Fetch event for custom team names
      const { data: event } = await supabase
        .from('events')
        .select('team_names')
        .eq('slug', slug)
        .single();

      // Fetch event participants to get team count
      const { data: participants } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_slug', slug);

      if (participants) {
        const teamCount = Math.ceil(participants.length / 3);
        let teamNames: string[] = [];

        // Use custom names if available
        if (event?.team_names && Object.keys(event.team_names).length > 0) {
          teamNames = Object.values(event.team_names) as string[];
        } else {
          // Generate default team names
          teamNames = Array.from({ length: Math.max(teamCount, 6) }, (_, i) => `Time ${i + 1}`);
        }

        setTeams(teamNames);
      }

      // Fetch broadcast state
      const { data: state } = await supabase
        .from('event_broadcast_state')
        .select('*')
        .eq('event_slug', slug)
        .single();

      if (state) {
        setBroadcastState({
          current_state: state.current_state as BroadcastState['current_state'],
          current_team_name: state.current_team_name,
          voting_closes_at: state.voting_closes_at,
          pitch_closes_at: state.pitch_closes_at,
          teams_presented: state.teams_presented || [],
          random_mode_enabled: state.random_mode_enabled || false,
          pitch_duration_seconds: state.pitch_duration_seconds,
          voting_duration_seconds: state.voting_duration_seconds,
        });
        setRandomMode(state.random_mode_enabled || false);
        const pitchSecs = state.pitch_duration_seconds || 300;
        const votingSecs = state.voting_duration_seconds || 120;
        setPitchDuration(pitchSecs);
        setVotingDuration(votingSecs);
        setPitchMinutes(pitchSecs / 60);
        setVotingMinutes(votingSecs / 60);
      }

      // Fetch action logs
      const { data: logs } = await supabase
        .from('event_control_log')
        .select('action, team_name, created_at')
        .eq('event_slug', slug)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logs) {
        setActionLogs(logs);
      }

      setIsLoading(false);
    };

    fetchEventData();

    // Subscribe to broadcast state changes
    const channel = supabase
      .channel(`admin-control-${slug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_broadcast_state',
          filter: `event_slug=eq.${slug}`,
        },
        payload => {
          const newState = payload.new as BroadcastState;
          setBroadcastState({
            current_state: newState.current_state as BroadcastState['current_state'],
            current_team_name: newState.current_team_name,
            voting_closes_at: newState.voting_closes_at,
            pitch_closes_at: newState.pitch_closes_at,
            teams_presented: newState.teams_presented || [],
            random_mode_enabled: newState.random_mode_enabled || false,
            pitch_duration_seconds: newState.pitch_duration_seconds,
            voting_duration_seconds: newState.voting_duration_seconds,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_control_log',
          filter: `event_slug=eq.${slug}`,
        },
        payload => {
          const newLog = payload.new as ControlLog;
          setActionLogs(prev => [newLog, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  const executeAction = async (
    action:
      | 'start_presentation'
      | 'open_voting'
      | 'close_voting'
      | 'reveal_results'
      | 'end_presentation',
    teamName?: string
  ) => {
    if (!slug) return;

    setActionLoading(action);

    // ATUALIZAÇÃO OTIMISTA: Atualizar estado local imediatamente
    if (action === 'end_presentation' && broadcastState) {
      setBroadcastState({
        ...broadcastState,
        current_state: 'idle',
        current_team_name: null,
        pitch_closes_at: null,
      });
    }

    try {
      const { data, error } = await supabase.functions.invoke('control-event-broadcast', {
        body: {
          action,
          event_slug: slug,
          team_name: teamName,
          voting_duration_seconds: votingDuration,
          pitch_duration_seconds: pitchDuration,
          random_mode: randomMode,
        },
      });

      if (error) throw error;

      toast.success(data.message || 'Ação executada com sucesso');
    } catch (error: any) {
      logger.error('Error executing action:', error);
      toast.error(error?.message || 'Erro ao executar ação');

      // ROLLBACK: Reverter estado otimista em caso de erro
      if (action === 'end_presentation') {
        // Buscar estado real do servidor
        const { data: realState } = await supabase
          .from('event_broadcast_state')
          .select('*')
          .eq('event_slug', slug)
          .single();

        if (realState) {
          setBroadcastState({
            current_state: realState.current_state as BroadcastState['current_state'],
            current_team_name: realState.current_team_name,
            voting_closes_at: realState.voting_closes_at,
            pitch_closes_at: realState.pitch_closes_at,
            teams_presented: realState.teams_presented || [],
            random_mode_enabled: realState.random_mode_enabled || false,
            pitch_duration_seconds: realState.pitch_duration_seconds,
            voting_duration_seconds: realState.voting_duration_seconds,
          });
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  const exportVotingData = async () => {
    try {
      if (!slug) return;

      // Buscar dados de votação com informações do votante
      const { data: votes, error } = await supabase
        .from('event_team_votes')
        .select('*')
        .eq('event_slug', slug);

      if (error) throw error;

      // Buscar informações dos votantes separadamente
      const voterIds = votes?.map(v => v.voter_user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, email')
        .in('id', voterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]));

      const exportData =
        votes?.map(vote => {
          const voter = profileMap.get(vote.voter_user_id);
          return {
            Time: vote.team_name,
            Votante: voter?.name || voter?.username || 'N/A',
            Email: voter?.email || 'N/A',
            Viabilidade: vote.score_viability,
            Inovação: vote.score_innovation,
            Pitch: vote.score_pitch,
            Demo: vote.score_demo,
            'Nota Final': vote.weighted_score?.toFixed(2) || 'N/A',
            'Data/Hora': formatDateBR(vote.created_at),
          };
        }) || [];

      const filename = generateFilename(`votacao_${slug}`);
      exportToCSV(exportData, filename);

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      logger.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  const exportParticipantsData = async () => {
    try {
      if (!slug) return;

      const { data: participants, error } = await supabase
        .from('event_participants_voting_status')
        .select('*')
        .eq('event_slug', slug);

      if (error) throw error;

      const exportData =
        participants?.map(p => ({
          Nome: p.name || 'N/A',
          Username: p.username || 'N/A',
          Email: p.email || 'N/A',
          Votou: p.has_voted ? 'Sim' : 'Não',
          'Time Votado': p.voting_for_team || 'N/A',
          Nota: p.weighted_score?.toFixed(2) || 'N/A',
          'Data Voto': p.voted_at ? formatDateBR(p.voted_at) : 'N/A',
          'Data Registro': formatDateBR(p.registered_at),
        })) || [];

      const filename = generateFilename(`participantes_${slug}`);
      exportToCSV(exportData, filename);

      toast.success('Lista exportada com sucesso!');
    } catch (error) {
      logger.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar lista');
    }
  };

  const saveTimeSettings = async () => {
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from('event_broadcast_state')
        .update({
          pitch_duration_seconds: pitchDuration,
          voting_duration_seconds: votingDuration,
        })
        .eq('event_slug', slug);

      if (error) throw error;
      toast.success('⏱️ Durações atualizadas!');
    } catch (error) {
      logger.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const getStateLabel = () => {
    if (!broadcastState) return 'IDLE';
    switch (broadcastState.current_state) {
      case 'presenting_team':
        return `🎤 ${broadcastState.current_team_name} APRESENTANDO`;
      case 'voting_open':
        return `📊 VOTAÇÃO ABERTA - ${broadcastState.current_team_name}`;
      case 'results_revealed':
        return '🏆 RESULTADOS REVELADOS';
      default:
        return '⏸️ IDLE';
    }
  };

  const getStateColor = () => {
    if (!broadcastState) return 'bg-muted';
    switch (broadcastState.current_state) {
      case 'presenting_team':
        return 'bg-blue-500/20 border-blue-500/50';
      case 'voting_open':
        return 'bg-green-500/20 border-green-500/50 animate-pulse';
      case 'results_revealed':
        return 'bg-yellow-500/20 border-yellow-500/50';
      default:
        return 'bg-muted';
    }
  };

  const isTeamPresented = (teamName: string) => {
    return broadcastState?.teams_presented?.includes(teamName) || false;
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin/eventos/${slug}/dashboard`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/evento/${slug}/projecao`} target="_blank">
              <Eye className="w-4 h-4 mr-2" />
              Abrir Tela de Projeção
            </Link>
          </Button>
        </div>

        {/* STATUS HERO BAR */}
        <div className="border-brutal-4 bg-gradient-to-r from-primary/10 to-accent/10 p-6 shadow-brutal mb-6">
          <div className="flex items-center justify-between">
            {/* Lado Esquerdo: Estado + Time */}
            <div className="flex items-center gap-4">
              {/* Ícone animado baseado no estado */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                <div className="relative bg-primary text-primary-foreground rounded-full p-3">
                  {broadcastState?.current_state === 'presenting_team' && (
                    <Mic className="w-8 h-8" />
                  )}
                  {broadcastState?.current_state === 'voting_open' && (
                    <BarChart3 className="w-8 h-8" />
                  )}
                  {broadcastState?.current_state === 'results_revealed' && (
                    <Eye className="w-8 h-8" />
                  )}
                  {broadcastState?.current_state === 'idle' && (
                    <Radio className="w-8 h-8 opacity-50" />
                  )}
                </div>
              </div>

              {/* Label do Estado */}
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Estado Atual
                </span>
                <p className="text-3xl font-black tracking-tight">
                  {broadcastState?.current_state === 'idle' && '⏸️ AGUARDANDO'}
                  {broadcastState?.current_state === 'presenting_team' &&
                    `🎤 ${broadcastState.current_team_name || 'Time'} APRESENTANDO`}
                  {broadcastState?.current_state === 'voting_open' &&
                    `📊 VOTAÇÃO: ${broadcastState.current_team_name || 'Time'}`}
                  {broadcastState?.current_state === 'results_revealed' &&
                    '👁️ RESULTADOS REVELADOS'}
                </p>
              </div>

              {/* Badge LIVE */}
              {broadcastState?.current_state !== 'idle' && (
                <Badge className="border-brutal bg-red-500 text-white animate-pulse px-4 py-2 text-base">
                  🔴 LIVE
                </Badge>
              )}
            </div>

            {/* Lado Direito: Participação */}
            <div className="flex items-center gap-6">
              {/* Contador Grande */}
              <div className="text-right">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Participação
                </span>
                <span className="text-4xl font-black">
                  {/* Will be calculated dynamically */}
                  <span className="text-2xl text-muted-foreground">--/--</span>
                </span>
              </div>

              {/* Barra de Progresso Vertical */}
              <div className="flex flex-col items-center gap-2">
                <div className="h-20 w-6 bg-secondary border-brutal relative overflow-hidden">
                  <div
                    className="absolute bottom-0 w-full transition-all duration-500 bg-primary"
                    style={{ height: '0%' }}
                  />
                </div>
                <span className="text-2xl font-black">--%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">
          {/* Coluna Esquerda - Controles */}
          <div className="space-y-6">
            {/* Configurações de Tempo */}
            <Card className="border-brutal-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6" />
                <h2 className="text-2xl font-black uppercase">⏱️ Durações</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Duração do Pitch */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Tempo de Pitch (minutos)</label>
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    step="0.5"
                    value={pitchMinutes}
                    onChange={e => {
                      const minutes = Number(e.target.value);
                      setPitchMinutes(minutes);
                      setPitchDuration(Math.round(minutes * 60));
                    }}
                    className="border-brutal"
                  />
                  <p className="text-xs text-muted-foreground mt-1">= {pitchDuration} segundos</p>
                </div>

                {/* Duração da Votação */}
                <div>
                  <label className="text-sm font-bold mb-2 block">Tempo de Votação (minutos)</label>
                  <Input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={votingMinutes}
                    onChange={e => {
                      const minutes = Number(e.target.value);
                      setVotingMinutes(minutes);
                      setVotingDuration(Math.round(minutes * 60));
                    }}
                    className="border-brutal"
                  />
                  <p className="text-xs text-muted-foreground mt-1">= {votingDuration} segundos</p>
                </div>
              </div>

              <Button
                onClick={saveTimeSettings}
                className="w-full mt-4 border-brutal gap-2"
                disabled={isSavingSettings}
              >
                {isSavingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="font-black">SALVAR CONFIGURAÇÕES</span>
              </Button>
            </Card>

            {/* Modo Aleatório Compacto */}
            <div className="flex items-center gap-3 p-3 border-brutal bg-muted/50 rounded-lg">
              <Shuffle className="w-5 h-5" />
              <span className="font-bold">Modo Aleatório</span>
              <Switch checked={randomMode} onCheckedChange={setRandomMode} className="ml-auto" />

              {randomMode && (
                <Button
                  onClick={() => executeAction('open_voting')}
                  disabled={
                    actionLoading !== null || broadcastState?.current_state === 'voting_open'
                  }
                  size="sm"
                  className="border-brutal gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  <span className="font-black">SORTEAR</span>
                </Button>
              )}
            </div>

            {/* Team Controls */}
            {!randomMode && (
              <div className="space-y-3">
                <h2 className="text-2xl font-black mb-4 uppercase tracking-tight">
                  ⚡ Controle de Times
                </h2>
                {teams.map(teamName => {
                  const isActive = broadcastState?.current_team_name === teamName;
                  const isPresented = isTeamPresented(teamName);
                  const isVotingOpen = broadcastState?.current_state === 'voting_open';

                  return (
                    <div
                      key={teamName}
                      className={`
                        border-brutal-4 p-4 transition-brutal
                        ${isActive ? 'bg-primary/10 border-primary shadow-brutal-lg' : 'bg-card hover:shadow-brutal'}
                        ${isPresented ? 'opacity-60' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        {/* Indicador Visual */}
                        <div className="flex items-center justify-center w-12 h-12 border-brutal-4 rounded-lg bg-background">
                          {isPresented && <span className="text-2xl">✅</span>}
                          {isActive && !isPresented && (
                            <Mic className="w-6 h-6 text-primary animate-pulse" />
                          )}
                          {!isActive && !isPresented && (
                            <span className="text-2xl opacity-30">⬜</span>
                          )}
                        </div>

                        {/* Nome do Time */}
                        <div className="flex-1">
                          <span className="text-xl font-black">{teamName}</span>
                          {isActive && (
                            <p className="text-sm text-muted-foreground font-semibold">
                              🔴 ATIVO AGORA
                            </p>
                          )}
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex gap-2">
                          {!isActive && (
                            <>
                              <Button
                                onClick={() => executeAction('start_presentation', teamName)}
                                disabled={actionLoading !== null}
                                variant="outline"
                                size="lg"
                                className="border-brutal-4 hover:shadow-brutal gap-2"
                              >
                                <Mic className="w-5 h-5" />
                                <span className="font-black">PITCH</span>
                              </Button>

                              <Button
                                onClick={() => executeAction('open_voting', teamName)}
                                disabled={actionLoading !== null || isVotingOpen}
                                size="lg"
                                className="border-brutal-4 shadow-brutal hover:shadow-brutal-lg gap-2 min-w-[140px]"
                              >
                                <BarChart3 className="w-5 h-5" />
                                <span className="font-black">VOTAR 2min</span>
                              </Button>
                            </>
                          )}

                          {isActive && broadcastState?.current_state === 'presenting_team' && (
                            <>
                              <Button
                                onClick={() => executeAction('end_presentation', teamName)}
                                disabled={actionLoading !== null}
                                variant="outline"
                                size="lg"
                                className="border-brutal-4 hover:shadow-brutal gap-2"
                              >
                                <StopCircle className="w-5 h-5" />
                                <span className="font-black">ENCERRAR</span>
                              </Button>
                              <Button
                                onClick={() => executeAction('open_voting', teamName)}
                                disabled={actionLoading !== null}
                                size="lg"
                                className="border-brutal-4 shadow-brutal hover:shadow-brutal-lg gap-2 min-w-[140px]"
                              >
                                <BarChart3 className="w-5 h-5" />
                                <span className="font-black">VOTAR AGORA</span>
                              </Button>
                            </>
                          )}

                          {isActive && broadcastState?.current_state === 'voting_open' && (
                            <>
                              <Button
                                onClick={() => executeAction('close_voting')}
                                disabled={actionLoading !== null}
                                variant="destructive"
                                size="lg"
                                className="border-brutal-4 shadow-brutal hover:shadow-brutal-lg gap-2"
                              >
                                <XCircle className="w-5 h-5" />
                                <span className="font-black">FECHAR</span>
                              </Button>

                              <Button
                                onClick={() => executeAction('reveal_results')}
                                disabled={actionLoading !== null}
                                variant="default"
                                size="lg"
                                className="border-brutal-4 shadow-brutal hover:shadow-brutal-lg gap-2"
                              >
                                <Eye className="w-5 h-5" />
                                <span className="font-black">REVELAR</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Global Controls */}
            <div className="border-brutal-4 bg-card p-6 shadow-brutal space-y-3">
              <h2 className="text-2xl font-black mb-4 uppercase tracking-tight flex items-center gap-2">
                <Settings className="w-6 h-6" />
                🎛️ Controles Globais
              </h2>

              <Button
                onClick={() => executeAction('close_voting')}
                disabled={actionLoading !== null || broadcastState?.current_state !== 'voting_open'}
                variant="destructive"
                size="lg"
                className="w-full border-brutal-4 shadow-brutal-lg hover:shadow-brutal-xl font-black text-lg h-16"
              >
                {actionLoading === 'close_voting' ? (
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-6 h-6 mr-2" />
                    ⏹️ FECHAR VOTAÇÃO AGORA
                  </>
                )}
              </Button>

              <Button
                onClick={() => executeAction('reveal_results')}
                disabled={actionLoading !== null}
                variant="default"
                size="lg"
                className="w-full border-brutal-4 shadow-brutal-lg hover:shadow-brutal-xl font-black text-lg h-16"
              >
                {actionLoading === 'reveal_results' ? (
                  <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                ) : (
                  <>
                    <Eye className="w-6 h-6 mr-2" />
                    👁️ REVELAR RESULTADOS FINAIS
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Coluna Direita */}
          <div className="space-y-6">
            {/* Voting Participants List - Full Version */}
            <VotingParticipantsList
              eventSlug={slug || ''}
              currentTeamName={broadcastState?.current_team_name || null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
