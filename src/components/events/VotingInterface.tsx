import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { VotingTimer } from './VotingTimer';
import { logger } from '@/lib/logger';

interface VotingInterfaceProps {
  eventSlug: string;
}

interface BroadcastState {
  current_state: 'idle' | 'presenting_team' | 'voting_open' | 'results_revealed';
  current_team_name: string | null;
  voting_closes_at: string | null;
}

interface Weights {
  weight_viability: number;
  weight_innovation: number;
  weight_pitch: number;
  weight_demo: number;
}

export function VotingInterface({ eventSlug }: VotingInterfaceProps) {
  const { user } = useAuth();
  const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);
  const [weights, setWeights] = useState<Weights | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scores, setScores] = useState({
    viability: 5,
    innovation: 5,
    pitch: 5,
    demo: 5,
  });

  // Fetch broadcast state and weights
  useEffect(() => {
    const fetchState = async () => {
      const { data: state } = await supabase
        .from('event_broadcast_state')
        .select('*')
        .eq('event_slug', eventSlug)
        .single();

      if (state) {
        setBroadcastState({
          current_state: state.current_state as BroadcastState['current_state'],
          current_team_name: state.current_team_name,
          voting_closes_at: state.voting_closes_at,
        });
      }

      const { data: w } = await supabase
        .from('event_voting_weights')
        .select('*')
        .eq('event_slug', eventSlug)
        .single();

      setWeights(w);
    };

    fetchState();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`voting-${eventSlug}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_broadcast_state',
          filter: `event_slug=eq.${eventSlug}`,
        },
        payload => {
          logger.log('Broadcast state changed:', payload);
          const newState = payload.new as BroadcastState;
          setBroadcastState({
            current_state: newState.current_state as BroadcastState['current_state'],
            current_team_name: newState.current_team_name,
            voting_closes_at: newState.voting_closes_at,
          });
          setHasVoted(false); // Reset voted state when team changes
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventSlug]);

  // Countdown timer
  useEffect(() => {
    if (!broadcastState?.voting_closes_at) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(broadcastState.voting_closes_at!).getTime();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));

      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [broadcastState?.voting_closes_at]);

  const handleSubmitVote = async () => {
    if (!user || !broadcastState?.current_team_name) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-team-vote', {
        body: {
          event_slug: eventSlug,
          team_name: broadcastState.current_team_name,
          scores,
        },
      });

      if (error) throw error;

      setHasVoted(true);
      toast.success('✅ Voto confirmado!');
    } catch (error: any) {
      logger.error('Error submitting vote:', error);
      toast.error(error?.message || 'Erro ao enviar voto');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!broadcastState) {
    return (
      <Card className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </Card>
    );
  }

  // IDLE state
  if (broadcastState.current_state === 'idle') {
    return (
      <Card className="p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Aguardando próxima apresentação...</p>
      </Card>
    );
  }

  // PRESENTING state
  if (broadcastState.current_state === 'presenting_team') {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-primary/10 to-primary/5">
        <div className="text-4xl mb-4">🎤</div>
        <h2 className="text-2xl font-bold mb-2">APRESENTANDO AGORA</h2>
        <p className="text-3xl font-bold text-primary mb-4">{broadcastState.current_team_name}</p>
        <p className="text-muted-foreground">Prepare-se para avaliar!</p>
      </Card>
    );
  }

  // RESULTS state
  if (broadcastState.current_state === 'results_revealed') {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-accent/10 to-accent/5">
        <div className="text-4xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold mb-2">RESULTADOS REVELADOS</h2>
        <p className="text-muted-foreground">Confira o placar abaixo</p>
      </Card>
    );
  }

  // VOTING state
  if (broadcastState.current_state === 'voting_open') {
    if (hasVoted) {
      return (
        <Card className="p-8 text-center bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-2xl font-bold mb-2">✅ VOTO CONFIRMADO!</h2>
          <p className="text-muted-foreground">Aguardando outros votos...</p>
        </Card>
      );
    }

    return (
      <Card className="p-6">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold mb-4">📊 AVALIE: {broadcastState.current_team_name}</h2>
          <VotingTimer
            votingClosesAt={broadcastState.voting_closes_at}
            onTimeUp={() => {
              const audio = new Audio('/sounds/buzzer.mp3');
              audio.play().catch(() => logger.log('Could not play buzzer'));
              toast.warning('⏰ TEMPO ESGOTADO!');
            }}
          />
        </div>

        <div className="space-y-6">
          {/* Viability */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-semibold">
                ⚖️ Viabilidade {weights && `(${Math.round(weights.weight_viability * 100)}%)`}
              </label>
              <span className="text-2xl font-bold text-primary">{scores.viability}</span>
            </div>
            <Slider
              value={[scores.viability]}
              onValueChange={v => setScores({ ...scores, viability: v[0] })}
              min={0}
              max={10}
              step={1}
              className="mb-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>10</span>
            </div>
          </div>

          {/* Innovation */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-semibold">
                💡 Inovação {weights && `(${Math.round(weights.weight_innovation * 100)}%)`}
              </label>
              <span className="text-2xl font-bold text-primary">{scores.innovation}</span>
            </div>
            <Slider
              value={[scores.innovation]}
              onValueChange={v => setScores({ ...scores, innovation: v[0] })}
              min={0}
              max={10}
              step={1}
              className="mb-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>10</span>
            </div>
          </div>

          {/* Pitch */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-semibold">
                🎤 Pitch {weights && `(${Math.round(weights.weight_pitch * 100)}%)`}
              </label>
              <span className="text-2xl font-bold text-primary">{scores.pitch}</span>
            </div>
            <Slider
              value={[scores.pitch]}
              onValueChange={v => setScores({ ...scores, pitch: v[0] })}
              min={0}
              max={10}
              step={1}
              className="mb-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>10</span>
            </div>
          </div>

          {/* Demo */}
          <div>
            <div className="flex justify-between mb-2">
              <label className="font-semibold">
                🖥️ Demo {weights && `(${Math.round(weights.weight_demo * 100)}%)`}
              </label>
              <span className="text-2xl font-bold text-primary">{scores.demo}</span>
            </div>
            <Slider
              value={[scores.demo]}
              onValueChange={v => setScores({ ...scores, demo: v[0] })}
              min={0}
              max={10}
              step={1}
              className="mb-1"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>10</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmitVote}
          disabled={isSubmitting || countdown === 0}
          className="w-full mt-6"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            '✅ CONFIRMAR VOTOS'
          )}
        </Button>
      </Card>
    );
  }

  return null;
}
