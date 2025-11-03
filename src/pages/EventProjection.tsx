import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { VotingTimer, getProgressColorClass } from '@/components/events/VotingTimer';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { Loader2, Radio, Mic, Trophy } from 'lucide-react';
import { logger } from '@/lib/logger';

interface BroadcastState {
  current_state: 'idle' | 'presenting_team' | 'voting_open' | 'results_revealed';
  current_team_name: string | null;
  voting_closes_at: string | null;
  pitch_closes_at: string | null;
}

export default function EventProjection() {
  const { slug } = useParams();
  const [broadcastState, setBroadcastState] = useState<BroadcastState | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDebugMode] = useState(
    () => new URLSearchParams(window.location.search).get('debug') === 'true'
  );
  const [votingCountdown, setVotingCountdown] = useState<number>(120);
  const [votingTotalSeconds, setVotingTotalSeconds] = useState<number>(120);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  // Callback estável para receber atualizações do timer
  const handleCountdownUpdate = useCallback((countdown: number, total: number) => {
    setVotingCountdown(countdown);
    setVotingTotalSeconds(total);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(err => {
        toast.error('Não foi possível entrar em tela cheia');
        logger.error(err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Recalcula progressPercentage reativamente
  useEffect(() => {
    if (votingTotalSeconds > 0) {
      const percentage = Math.max(
        0,
        Math.min(100, ((votingTotalSeconds - votingCountdown) / votingTotalSeconds) * 100)
      );
      setProgressPercentage(percentage);
    } else {
      setProgressPercentage(0);
    }
  }, [votingCountdown, votingTotalSeconds]);

  useEffect(() => {
    if (!slug) return;

    // Generate QR Code with larger size
    const eventUrl = `${window.location.origin}/evento/${slug}`;
    QRCode.toDataURL(eventUrl, { width: 350 }).then(setQrCodeUrl);

    const fetchState = async () => {
      const { data: state, error } = await supabase
        .from('event_broadcast_state')
        .select('*')
        .eq('event_slug', slug)
        .maybeSingle();

      if (error) {
        logger.error('Erro ao buscar estado:', error);
        toast.error('Erro ao conectar ao evento');
        return;
      }

      if (state) {
        setBroadcastState({
          current_state: state.current_state as BroadcastState['current_state'],
          current_team_name: state.current_team_name,
          voting_closes_at: state.voting_closes_at,
          pitch_closes_at: state.pitch_closes_at,
        });
      } else {
        const { data: newState, error: createError } = await supabase
          .from('event_broadcast_state')
          .insert({
            event_slug: slug,
            current_state: 'idle',
            current_team_name: null,
            voting_closes_at: null,
            teams_presented: [],
            random_mode_enabled: false,
          })
          .select()
          .single();

        if (createError) {
          logger.error('Erro ao criar estado:', createError);
          toast.error('Erro ao inicializar evento');
          return;
        }

        if (newState) {
          setBroadcastState({
            current_state: newState.current_state as BroadcastState['current_state'],
            current_team_name: newState.current_team_name,
            voting_closes_at: newState.voting_closes_at,
            pitch_closes_at: newState.pitch_closes_at,
          });
          toast.success('Evento inicializado com sucesso');
        }
      }
    };

    fetchState();

    const channel = supabase
      .channel(`projection-${slug}`)
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
            current_state: newState.current_state,
            current_team_name: newState.current_team_name,
            voting_closes_at: newState.voting_closes_at,
            pitch_closes_at: newState.pitch_closes_at,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  if (!broadcastState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--te-gray-light))]">
        <div className="text-center bg-white rounded-lg shadow-sm p-12">
          <Loader2 className="w-16 h-16 animate-spin text-black mx-auto mb-4" />
          <p className="text-black text-2xl font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  const DebugPanel = () =>
    isDebugMode ? (
      <div className="fixed bottom-4 left-4 bg-black border-brutal-6 text-white p-4 text-xs max-w-md z-50">
        <div className="font-black mb-2">DEBUG MODE</div>
        <pre className="overflow-auto max-h-64">{JSON.stringify(broadcastState, null, 2)}</pre>
      </div>
    ) : null;

  // IDLE STATE
  if (broadcastState.current_state === 'idle') {
    return (
      <div className="min-h-screen bg-[hsl(var(--te-gray-light))] flex flex-col items-center justify-center p-8 relative">
        <button
          onClick={toggleFullscreen}
          className="fixed top-6 right-6 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#333] transition-colors z-50"
        >
          {isFullscreen ? '⛶ SAIR' : '⛶ TELA CHEIA'}
        </button>
        <DebugPanel />

        <div className="text-center animate-fade-subtle">
          <div className="text-center mb-20">
            <h1 className="text-[140px] font-brutalist-hero text-black mb-12 flex items-center justify-center gap-8">
              <span className="text-[120px]">📻</span>
              AGUARDANDO INÍCIO
            </h1>
          </div>

          {/* QR Code para votar */}
          {qrCodeUrl && (
            <div className="flex flex-col items-center justify-center">
              <div className="p-8 bg-white border-4 border-black mb-8">
                <img src={qrCodeUrl} alt="QR Code" className="w-[280px] h-[280px]" />
              </div>

              <div className="bg-black px-16 py-6">
                <p className="text-4xl font-brutalist-medium text-white">VOTE AGORA</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PRESENTING TEAM STATE
  if (broadcastState.current_state === 'presenting_team') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 relative">
        <button
          onClick={toggleFullscreen}
          className="fixed top-6 right-6 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#333] transition-colors z-50"
        >
          {isFullscreen ? '⛶ SAIR' : '⛶ TELA CHEIA'}
        </button>
        <DebugPanel />

        <div className="text-center animate-fade-subtle w-full max-w-6xl">
          <div className="w-full bg-white border-b-4 border-black py-10 mb-16">
            <div className="flex items-center justify-center gap-8">
              {/* Chevrons esquerdos */}
              <div className="flex">
                {[...Array(8)].map((_, i) => (
                  <svg
                    key={i}
                    width="40"
                    height="60"
                    viewBox="0 0 40 60"
                    className="text-[hsl(var(--te-gray-dark))]"
                  >
                    <path d="M0 0 L40 30 L0 60" fill="currentColor" />
                  </svg>
                ))}
              </div>

              {/* Texto central */}
              <h1 className="text-6xl font-brutalist-large text-[hsl(var(--te-orange))] flex items-center gap-6">
                <span className="text-5xl">🎤</span>
                APRESENTAÇÃO
              </h1>

              {/* Chevrons direitos */}
              <div className="flex">
                {[...Array(8)].map((_, i) => (
                  <svg
                    key={i}
                    width="40"
                    height="60"
                    viewBox="0 0 40 60"
                    className="text-[hsl(var(--te-gray-dark))]"
                  >
                    <path d="M40 0 L0 30 L40 60" fill="currentColor" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Nome do Time - HERO LEVEL */}
          <div className="flex justify-center mb-20">
            <div className="bg-[hsl(var(--te-orange))] border-[8px] border-black px-20 py-12">
              <h2 className="text-[240px] font-brutalist-hero text-black leading-none">
                {broadcastState.current_team_name}
              </h2>
            </div>
          </div>

          {/* Timer do Pitch */}
          {broadcastState.pitch_closes_at && (
            <>
              {/* Timer - CRITICAL LEVEL */}
              <div className="text-center mb-16">
                <div className="text-[180px] font-mono font-black tracking-tight text-black leading-none">
                  <VotingTimer votingClosesAt={broadcastState.pitch_closes_at} />
                </div>
              </div>

              {/* Barra de Progresso - IMPORTANT LEVEL */}
              <div className="w-full max-w-3xl mx-auto">
                <Progress
                  value={(() => {
                    const now = new Date().getTime();
                    const end = new Date(broadcastState.pitch_closes_at).getTime();
                    const start = end - 300000; // 5 min padrão
                    const elapsed = now - start;
                    const total = end - start;
                    return Math.min(100, Math.max(0, (elapsed / total) * 100));
                  })()}
                  className="h-12 border-4 border-black"
                />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // VOTING OPEN STATE
  if (broadcastState.current_state === 'voting_open') {
    return (
      <div className="min-h-screen bg-[hsl(var(--te-gray-light))] flex flex-col items-center justify-center p-8 relative">
        <button
          onClick={toggleFullscreen}
          className="fixed top-6 right-6 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#333] transition-colors z-50"
        >
          {isFullscreen ? '⛶ SAIR' : '⛶ TELA CHEIA'}
        </button>
        <DebugPanel />

        <div className="text-center animate-fade-subtle w-full max-w-6xl">
          <div className="w-full bg-white border-b-4 border-black py-10 mb-16">
            <div className="flex items-center justify-center gap-8">
              {/* Chevrons esquerdos */}
              <div className="flex">
                {[...Array(8)].map((_, i) => (
                  <svg
                    key={i}
                    width="40"
                    height="60"
                    viewBox="0 0 40 60"
                    className="text-[hsl(var(--te-gray-dark))]"
                  >
                    <path d="M0 0 L40 30 L0 60" fill="currentColor" />
                  </svg>
                ))}
              </div>

              {/* Texto central */}
              <h1 className="text-6xl font-brutalist-large text-[hsl(var(--te-orange))]">
                VOTAÇÃO ABERTA
              </h1>

              {/* Chevrons direitos */}
              <div className="flex">
                {[...Array(8)].map((_, i) => (
                  <svg
                    key={i}
                    width="40"
                    height="60"
                    viewBox="0 0 40 60"
                    className="text-[hsl(var(--te-gray-dark))]"
                  >
                    <path d="M40 0 L0 30 L40 60" fill="currentColor" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Nome do Time - HERO LEVEL */}
          <div className="flex justify-center mb-20">
            <div className="bg-[hsl(var(--te-orange))] border-[8px] border-black px-20 py-12">
              <h2 className="text-[240px] font-brutalist-hero text-black leading-none">
                {broadcastState.current_team_name}
              </h2>
            </div>
          </div>

          {/* Timer - CRITICAL LEVEL */}
          <div className="text-center mb-16">
            <div className="text-[180px] font-mono font-black tracking-tight text-black leading-none">
              <VotingTimer
                votingClosesAt={broadcastState.voting_closes_at}
                onCountdownUpdate={handleCountdownUpdate}
              />
            </div>
          </div>

          {/* Barra de Progresso - IMPORTANT LEVEL */}
          <div className="w-full max-w-3xl mx-auto mb-20">
            <div className="h-12 bg-[hsl(var(--te-gray-medium))] overflow-hidden relative border-4 border-black">
              <div
                className={`absolute left-0 top-0 h-full transition-all duration-1000 ease-linear ${getProgressColorClass(votingCountdown)} ${votingCountdown <= 10 ? 'animate-pulse' : ''}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <motion.div
              className="text-center mt-6"
              animate={{ scale: votingCountdown <= 10 ? [1, 1.1, 1] : 1 }}
              transition={{
                duration: 0.5,
                repeat: votingCountdown <= 10 ? Infinity : 0,
                ease: 'easeInOut',
              }}
            >
              <span className="text-5xl font-brutalist-large text-black">
                {Math.round(progressPercentage)}%
              </span>
            </motion.div>
          </div>

          {/* QR Code para votar - SECONDARY LEVEL */}
          {qrCodeUrl && (
            <div className="flex flex-col items-center justify-center mt-20">
              <div className="p-8 bg-white border-4 border-black mb-8">
                <img src={qrCodeUrl} alt="QR Code" className="w-[280px] h-[280px]" />
              </div>

              <div className="bg-black px-16 py-6">
                <p className="text-4xl font-brutalist-medium text-white">VOTE AGORA</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RESULTS REVEALED STATE
  if (broadcastState.current_state === 'results_revealed') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 relative">
        <button
          onClick={toggleFullscreen}
          className="fixed top-6 right-6 bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#333] transition-colors z-50"
        >
          {isFullscreen ? '⛶ SAIR' : '⛶ TELA CHEIA'}
        </button>
        <DebugPanel />

        <div className="text-center animate-fade-subtle">
          <div className="w-full bg-white border-b-4 border-black py-10 mb-16">
            <div className="flex items-center justify-center gap-8">
              {/* Chevrons esquerdos */}
              <div className="flex">
                {[...Array(8)].map((_, i) => (
                  <svg
                    key={i}
                    width="40"
                    height="60"
                    viewBox="0 0 40 60"
                    className="text-[hsl(var(--te-gray-dark))]"
                  >
                    <path d="M0 0 L40 30 L0 60" fill="currentColor" />
                  </svg>
                ))}
              </div>

              {/* Texto central */}
              <h1 className="text-6xl font-brutalist-large text-[hsl(var(--te-orange))] flex items-center gap-6">
                <span className="text-5xl">🏆</span>
                RESULTADOS FINAIS
              </h1>

              {/* Chevrons direitos */}
              <div className="flex">
                {[...Array(8)].map((_, i) => (
                  <svg
                    key={i}
                    width="40"
                    height="60"
                    viewBox="0 0 40 60"
                    className="text-[hsl(var(--te-gray-dark))]"
                  >
                    <path d="M40 0 L0 30 L40 60" fill="currentColor" />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          {/* Mensagem de Parabéns */}
          <div className="text-center">
            <p className="text-[140px] font-brutalist-hero text-black leading-tight">
              🏆
              <br />
              PARABÉNS A TODOS
              <br />
              OS PARTICIPANTES!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
