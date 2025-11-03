import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { useAuth } from '@/contexts/AuthContext';
import { debugLog, debugError } from '@/utils/debugLogger';

interface RealtimeVoiceInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscriptComplete: (transcript: string) => void;
}

interface RealtimeEvent {
  type: string;
  error?: { message?: string };
  transcript?: string;
  delta?: string;
  arguments?: string;
}

interface StructuredSummary {
  o_que?: string;
  para_quem?: string;
  por_que?: string;
  como?: string;
  design?: string;
}

export const RealtimeVoiceInterface = ({
  open,
  onOpenChange,
  onTranscriptComplete,
}: RealtimeVoiceInterfaceProps) => {
  const { user, isStudent, isAdmin } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [structuredSummary, setStructuredSummary] = useState<StructuredSummary | null>(null);
  const [functionCallArgs, setFunctionCallArgs] = useState('');
  const [conversationState, setConversationState] = useState<
    'idle' | 'listening' | 'thinking' | 'speaking'
  >('idle');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const chatRef = useRef<RealtimeChat | null>(null);

  const handleMessage = (event: RealtimeEvent) => {
    debugLog('📨 Event:', event.type);

    // Log específico para eventos importantes
    if (event.type === 'error') {
      debugError('🚨 Error event:', event);
      toast.error(`Erro: ${event.error?.message || 'Desconhecido'}`);
    }

    if (event.type === 'input_audio_buffer.speech_started') {
      debugLog('🎤 User started speaking');
      setConversationState('listening');
    }

    if (event.type === 'input_audio_buffer.speech_stopped') {
      debugLog('🛑 User stopped speaking');
      setConversationState('thinking');
    }

    if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
      setConversationState('speaking');
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
      setConversationState('idle');
    } else if (event.type === 'conversation.item.input_audio_transcription.completed') {
      const userText = event.transcript;
      debugLog('📝 User disse:', userText);
      setTranscript(prev => prev + '\n\n👤 Você: ' + userText);
      // Incrementar contador de perguntas respondidas
      setQuestionsAnswered(prev => Math.min(prev + 1, 5));
    } else if (event.type === 'response.audio_transcript.delta') {
      const aiText = event.delta;
      debugLog('🤖 IA respondeu:', aiText);
      // Adicionar resposta da IA ao transcript
      setTranscript(prev => {
        // Verificar se já existe uma linha de IA em andamento
        const lines = prev.split('\n');
        const lastLine = lines[lines.length - 1];
        if (lastLine.startsWith('🤖 IA: ')) {
          // Continuar a mesma linha
          lines[lines.length - 1] = lastLine + aiText;
          return lines.join('\n');
        } else {
          // Nova linha da IA
          return prev + '\n\n🤖 IA: ' + aiText;
        }
      });
    } else if (event.type === 'response.function_call_arguments.delta') {
      debugLog('🔧 IA está preenchendo função:', event.delta);
      setFunctionCallArgs(prev => prev + event.delta);
    } else if (event.type === 'response.function_call_arguments.done') {
      try {
        const args = JSON.parse(event.arguments);
        debugLog('✅ Resumo estruturado recebido:', args);
        debugLog('📋 O QUE:', args.o_que);
        debugLog('👥 PARA QUEM:', args.para_quem);
        debugLog('❓ POR QUE:', args.por_que);
        debugLog('⚙️ COMO:', args.como);
        debugLog('🎨 DESIGN:', args.design);
        setStructuredSummary(args);
        setQuestionsAnswered(5); // Todas as informações coletadas
        toast.success('✅ Resumo estruturado capturado!');
      } catch (e) {
        debugError('❌ Erro ao parsear argumentos da função:', e);
      }
    }
  };

  const startConversation = async () => {
    // Verificar autenticação
    if (!user) {
      toast.error('Você precisa estar logado para acessar o modo secreto');
      onOpenChange(false);
      return;
    }

    // Verificar role
    if (!isStudent && !isAdmin) {
      toast.error('🎓 Modo secreto exclusivo para alunos!', {
        description: 'Conheça nosso curso de I.A e desbloqueie este recurso.',
        duration: 5000,
      });
      onOpenChange(false);

      // Redirecionar para página do curso
      setTimeout(() => {
        window.open('https://escoladeautomacao.com.br/', '_blank');
      }, 2000);
      return;
    }

    try {
      setIsLoading(true);
      toast.info('Conectando com IA...');

      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();

      setIsConnected(true);
      setIsLoading(false);

      toast.success('🎙️ Microfone conectado! A IA vai começar a conversa...');
    } catch (error) {
      debugError('Error starting conversation:', error);
      setIsLoading(false);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro ao iniciar conversa. Verifique as permissões do microfone.'
      );
    }
  };

  const endConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);

    // Se temos resumo estruturado, formatar e usar
    if (structuredSummary) {
      const formatted = `**O Que:** ${structuredSummary.o_que}
**Para Quem:** ${structuredSummary.para_quem}
**Por Que:** ${structuredSummary.por_que}
**Como:** ${structuredSummary.como}
**Design:** ${structuredSummary.design}`;

      onTranscriptComplete(formatted);
      toast.success('✅ Resumo capturado com sucesso!');
    }
    // Fallback: se não tiver resumo estruturado, usa a transcrição completa
    else if (transcript.trim()) {
      onTranscriptComplete(transcript);
      toast.success('✅ Conversa finalizada! Ideia capturada.');
    }

    onOpenChange(false);

    // Reset após fechar
    setTimeout(() => {
      setTranscript('');
      setStructuredSummary(null);
      setFunctionCallArgs('');
      setQuestionsAnswered(0);
    }, 300);
  };

  const cancelConversation = () => {
    chatRef.current?.disconnect();
    setIsConnected(false);
    setIsSpeaking(false);
    setTranscript('');
    onOpenChange(false);
    toast.info('Conversa cancelada');
  };

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] border-brutal shadow-brutal z-50">
        <DialogHeader>
          <DialogTitle className="text-4xl font-display uppercase tracking-wider">
            🎮 Modo Secreto Ativado
          </DialogTitle>
          <DialogDescription className="text-lg opacity-70 mt-2">
            Converse naturalmente sobre sua ideia...
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 mt-4">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6">
              <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center">
                <Mic className="w-12 h-12 text-accent" />
              </div>
              <Button
                onClick={startConversation}
                disabled={isLoading}
                size="lg"
                variant="hero"
                className="text-2xl h-16 px-12"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    CONECTANDO...
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6" />
                    INICIAR CONVERSA
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-4 py-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isSpeaking ? 'bg-accent animate-pulse scale-110' : 'bg-accent/30'
                  }`}
                >
                  <Mic className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {conversationState === 'listening' && '🎤 Ouvindo você...'}
                    {conversationState === 'speaking' && '🔊 IA está falando...'}
                    {conversationState === 'thinking' && '🤔 IA está pensando...'}
                    {conversationState === 'idle' && '👂 Pode falar...'}
                  </p>
                  <p className="text-sm opacity-60 mt-2">
                    {questionsAnswered === 5
                      ? '✅ 5/5 - Todas as informações coletadas!'
                      : `⏳ ${questionsAnswered}/5 perguntas respondidas`}
                  </p>
                </div>
              </div>

              {structuredSummary && (
                <div className="p-4 bg-green-500/10 border-2 border-green-500 rounded-lg mb-4">
                  <p className="text-green-500 font-bold">✅ Resumo estruturado capturado!</p>
                </div>
              )}

              <div className="border-brutal bg-card p-6 max-h-[40vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-3 uppercase">Transcrição:</h3>
                {transcript ? (
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{transcript}</p>
                ) : (
                  <p className="text-base opacity-50 italic">A transcrição aparecerá aqui...</p>
                )}
              </div>

              <div className="flex gap-4 justify-end">
                <Button
                  onClick={cancelConversation}
                  variant="outline"
                  size="lg"
                  className="text-lg h-14"
                >
                  <MicOff className="h-5 w-5" />
                  CANCELAR
                </Button>
                <Button onClick={endConversation} variant="hero" size="lg" className="text-lg h-14">
                  ✅ ENCERRAR E USAR NO PRD
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
