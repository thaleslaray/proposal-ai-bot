import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { VoiceRecorder } from './VoiceRecorder';
import { PRDResult } from './PRDResult';
import { RealtimeVoiceInterface } from './RealtimeVoiceInterface';
import { AdminPanel } from './AdminPanel';
import { HowItWorks } from './HowItWorks';
import { UsageCounter } from './UsageCounter';
import { UpgradeModal } from './UpgradeModal';
import { TopBar } from './TopBar';
import { useCheatCode } from '@/hooks/useCheatCode';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { adminLog, adminWarn } from '@/utils/adminLog';
import { trackEvent } from '@/lib/analytics';
import { MyDocuments } from './MyDocuments';
import { debugLog, debugWarn } from '@/utils/debugLogger';
import { logger } from '@/lib/logger';

/**
 * Props do componente PRDGenerator
 */
interface PRDGeneratorProps {
  /** Callback chamado quando autenticação é necessária */
  onAuthRequired?: () => void;
}

export const PRDGenerator = ({ onAuthRequired }: PRDGeneratorProps = {}) => {
  const { user, session, isStudent, isLifetime, isAdmin, currentEvent, eventLimit } = useAuth();
  const [idea, setIdea] = useState('');
  const [prdResult, setPrdResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showRealtimeModal, setShowRealtimeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('CRIANDO SEU DOCUMENTO...');
  const [placeholder, setPlaceholder] = useState('');
  const [remixOriginalId, setRemixOriginalId] = useState<string | null>(null);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [totalPRDs, setTotalPRDs] = useState<number>(0);
  const [hasCreatedPRD, setHasCreatedPRD] = useState<boolean>(false);
  const { activated } = useCheatCode();

  const COOLDOWN_MS = 2000; // 2 segundos entre gerações (rate limiting client-side)

  const placeholderExamples = [
    'Exemplo: Quero criar uma plataforma de automação de WhatsApp para agências de marketing gerenciarem múltiplos clientes, com chatbots inteligentes, disparos em massa e relatórios de conversão...',
    'Exemplo: Quero criar um dashboard para gestores de tráfego acompanharem ROI em tempo real de campanhas no Meta Ads e Google Ads, com alertas automáticos quando o CPA ultrapassar metas...',
    'Exemplo: Quero criar uma plataforma para produtores digitais gerenciarem lançamentos, com funil de vendas automático, integração com Hotmart e sistema de afiliados com comissões personalizadas...',
    'Exemplo: Quero criar um app para social media gerenciar conteúdo de Instagram de vários clientes, com agendamento inteligente, gerador de legendas com IA e análise de engajamento...',
  ];

  const loadingMessages = [
    'CRIANDO SEU DOCUMENTO...',
    'ANALISANDO SUA IDEIA...',
    'ESTRUTURANDO O PROJETO...',
    'DEFININDO FUNCIONALIDADES...',
    'PLANEJANDO A ARQUITETURA...',
    'ORGANIZANDO OS DETALHES...',
    'FINALIZANDO O DOCUMENTO...',
  ];

  const handleTranscriptComplete = (transcript: string) => {
    setIdea(transcript);
  };

  const handleVoiceTranscript = (transcript: string) => {
    setIdea(prev => (prev ? prev + ' ' + transcript : transcript));
  };

  const calculateTimeUntilReset = (lastUsageTime: string): string => {
    const lastUsage = new Date(lastUsageTime);
    const resetTime = new Date(lastUsage.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}min`;
  };

  const generatePRD = useCallback(async () => {
    debugLog('🚀 [GENERATE PRD] Iniciando geração...', {
      hasIdea: !!idea,
      hasUser: !!user,
      remixOriginalId,
      isRemix: !!remixOriginalId,
    });

    // Rate limiting client-side (UX)
    const now = Date.now();
    const timeSinceLastGen = now - lastGenerationTime;

    if (timeSinceLastGen < COOLDOWN_MS) {
      toast.error(
        `⏱️ Aguarde ${Math.ceil((COOLDOWN_MS - timeSinceLastGen) / 1000)}s antes de gerar novamente`
      );
      return;
    }

    if (!user) {
      toast.info('📱 Entre com seu WhatsApp para continuar');
      onAuthRequired?.();
      return;
    }

    setLastGenerationTime(now);

    const trimmedIdea = idea.trim();

    if (trimmedIdea.length < 10) {
      toast.error('Conte um pouco mais sobre sua ideia (mínimo 10 caracteres)');
      return;
    }

    if (trimmedIdea.length > 10000) {
      toast.error('Sua ideia está muito detalhada! Tente resumir um pouco.');
      return;
    }

    setIsGenerating(true);
    setPrdResult('');

    try {
      // Verificar se está em evento ativo (override de limite)
      let userLimit = 1;

      if (currentEvent && eventLimit !== null) {
        userLimit = eventLimit;
        debugLog('🎉 Usando limite do evento:', userLimit);
      } else {
        // Buscar limite do usuário normalmente
        const { data: limitData, error: limitError } = await supabase.rpc('get_prd_limit', {
          _user_id: user.id,
        });

        if (limitError) {
          logger.error('❌ Erro ao verificar limite:', limitError);
          toast.error('Erro ao verificar limite. Tente novamente.');
          setIsGenerating(false);
          return;
        }

        userLimit = limitData || 2;
      }

      // Buscar uso atual do usuário
      const { data: usageData, error: usageError } = await supabase
        .from('prd_usage_tracking')
        .select('usage_count, usage_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (usageError) {
        logger.error('❌ Erro ao verificar uso:', usageError);
      }

      const currentCount = usageData?.usage_count || 0;
      const lastUsageTime = usageData?.usage_date;

      debugLog('📊 Uso atual:', {
        currentCount,
        userLimit,
        lastUsageTime,
        isUnlimited: userLimit === -1,
      });

      // Verificar se atingiu o limite (ignorar se userLimit === -1 = ilimitado)
      if (userLimit !== -1 && currentCount >= userLimit) {
        debugWarn('⚠️ Limite atingido! Mostrando modal de upgrade.');

        setShowUpgradeModal(true);
        trackEvent('upgrade_modal_opened', { reason: 'limit_check_before_api' });

        const timeUntilReset = lastUsageTime ? calculateTimeUntilReset(lastUsageTime) : 'em breve';

        toast.error('⏱️ Limite Diário Atingido', {
          description: `Você já usou ${currentCount}/${userLimit} documentos hoje.\n⏰ Próximo documento disponível em: ${timeUntilReset}`,
          duration: 10000,
          action: {
            label: 'Ver Planos',
            onClick: () => window.open('https://escoladeautomacao.com.br/planos', '_blank'),
          },
        });

        setIsGenerating(false);
        return;
      }

      debugLog('✅ Limite OK! Continuando com categorização...');
      setLoadingMessage('🤖 Analisando sua ideia...');

      // 1️⃣ CATEGORIZAR IDEIA (novo - rápido e barato com GPT-5-nano)
      debugLog('📂 Categorizando ideia...');
      const { data: categoryData, error: categoryError } = await supabase.functions.invoke(
        'categorize-idea',
        {
          body: { idea: trimmedIdea },
        }
      );

      if (categoryError) {
        debugWarn('⚠️ Erro na categorização, usando fallback:', categoryError);
      }

      const category = categoryData?.category || 'other';
      const categoryMetadata = {
        confidence: categoryData?.confidence || 0.5,
        reasoning: categoryData?.reasoning || '',
        suggested_tags: categoryData?.suggested_tags || [],
        classified_at: categoryData?.classified_at || new Date().toISOString(),
        fallback: categoryData?.fallback || false,
      };

      debugLog(
        '✅ Categoria detectada:',
        category,
        `(${(categoryMetadata.confidence * 100).toFixed(0)}% confiança)`
      );

      setLoadingMessage(loadingMessages[0]);

      // 2️⃣ GERAR PRD (agora com categoria pré-classificada)
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-prd`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify({
            idea: trimmedIdea,
            category, // NOVO
            category_metadata: categoryMetadata, // NOVO
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 429) {
          setShowUpgradeModal(true);
          trackEvent('upgrade_modal_opened', { reason: 'rate_limit' });

          const timeUntilReset = errorData.lastUsageTime
            ? calculateTimeUntilReset(errorData.lastUsageTime)
            : 'em breve';

          toast.error('⏱️ Limite Diário Atingido', {
            description: `${errorData.error || 'Você atingiu seu limite diário.'}\n⏰ Próximo documento disponível em: ${timeUntilReset}`,
            duration: 10000,
            action: {
              label: 'Ver Planos',
              onClick: () => window.open('https://escoladeautomacao.com.br/planos', '_blank'),
            },
          });
          setIsGenerating(false);
          return;
        } else {
          throw new Error(errorData.error || 'Erro ao gerar PRD');
        }
      }

      const data = await response.json();
      const generatedText = data?.generatedText;

      if (!generatedText) {
        throw new Error('Resposta vazia do servidor');
      }

      setPrdResult(generatedText);
      setHasCreatedPRD(true); // Marcar que usuário criou um PRD
      toast.success('✨ Documento criado! Veja o resultado abaixo.');

      // Se for remix, salvar relação
      if (remixOriginalId) {
        debugLog('🎯 [REMIX DETECTED] Registrando remix:', remixOriginalId);
      } else {
        debugLog('ℹ️ [NO REMIX] Gerando PRD normal (não é remix)');
      }

      if (remixOriginalId) {
        debugLog('🎯 [REMIX DETECTED] Registrando remix:', remixOriginalId);
        try {
          // Buscar documento recém-criado usando maybeSingle para evitar exceção
          const { data: docs, error: fetchError } = await supabase
            .from('document_history')
            .select('id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (fetchError) {
            throw new Error(`Erro ao buscar documento: ${fetchError.message}`);
          }

          if (!docs?.id) {
            throw new Error('Documento recém-criado não encontrado');
          }

          // CRÍTICO: AGUARDAR insert na tabela prd_remixes
          const { error: insertError } = await supabase.from('prd_remixes').insert({
            original_id: remixOriginalId,
            remix_id: docs.id,
            user_id: user.id,
          });

          if (insertError) {
            throw new Error(`Erro ao inserir remix: ${insertError.message}`);
          }

          // CRÍTICO: AGUARDAR incremento do contador
          const { error: rpcError } = await supabase.rpc('increment_remixes', {
            doc_id: remixOriginalId,
          });

          if (rpcError) {
            throw new Error(`Erro ao incrementar contador: ${rpcError.message}`);
          }

          // Sucesso real
          toast.success('🎉 Remix registrado com sucesso!');
          debugLog('✅ Remix cadastrado:', { original: remixOriginalId, remix: docs.id });

          // Limpar variáveis
          localStorage.removeItem('remix_original_id');
          setRemixOriginalId(null);
        } catch (error: unknown) {
          logger.error('❌ Erro ao registrar remix:', error);
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          toast.error(`Erro ao registrar remix: ${errorMessage}`);
        }
      }

      // Analytics tracking
      trackEvent('prd_generated', {
        idea_length: trimmedIdea.length,
        user_role: isStudent ? 'student' : isAdmin ? 'admin' : 'free',
        is_remix: !!remixOriginalId,
      });

      // Validar e enviar email com logs detalhados
      const userEmail = user?.email;
      const isValidEmail = userEmail && !userEmail.includes('@temp.internal');

      adminLog(isAdmin, '📧 Verificando envio de email:', {
        hasUser: !!user,
        email: userEmail,
        isValid: isValidEmail,
        userName: user?.user_metadata?.name,
      });

      if (!isValidEmail) {
        adminWarn(isAdmin, '⚠️ Email inválido ou temporário, não enviando documento');
        toast.info('💡 Cadastre um email válido para receber documentos automaticamente');
        return;
      }

      // Enviar email com timeout e logs detalhados
      adminLog(isAdmin, '🚀 Iniciando envio de email para:', userEmail);

      const emailPromise = supabase.functions.invoke('send-document-email', {
        body: {
          document: generatedText,
          userEmail: userEmail,
          userName: user.user_metadata?.name || 'Usuário',
        },
      });

      // Timeout de 10 segundos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout ao enviar email')), 10000)
      );

      Promise.race([emailPromise, timeoutPromise])
        .then((result: unknown) => {
          const { data, error } = result as { data?: unknown; error?: { message?: string } };
          if (error) {
            logger.error('❌ Erro ao enviar email:', error, {
              source: 'send_document_email',
              userEmail,
            });
            toast.error('Erro ao enviar email: ' + (error.message || 'Desconhecido'));
          } else {
            adminLog(isAdmin, '✅ Email enviado com sucesso!', data);
            toast.success('📧 Documento enviado para ' + userEmail);
          }
        })
        .catch((error: unknown) => {
          logger.error('❌ Timeout ao enviar email:', error, {
            source: 'send_document_email_timeout',
            userEmail,
          });
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          toast.error('Não foi possível enviar o email: ' + errorMessage);
        });
    } catch (error: unknown) {
      logger.error('❌ Erro ao gerar PRD:', error, {
        source: 'generate_prd',
        ideaLength: trimmedIdea.length,
      });
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Ops! Algo deu errado. Tente novamente em alguns segundos.';
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [
    idea,
    user,
    session,
    remixOriginalId,
    isStudent,
    isAdmin,
    onAuthRequired,
    lastGenerationTime,
  ]);

  // Verificar se há remix ao carregar
  useEffect(() => {
    const remixIdea = localStorage.getItem('remix_idea');
    const remixOriginalId = localStorage.getItem('remix_original_id');

    debugLog('🔍 [REMIX LOAD] localStorage:', { remixIdea: !!remixIdea, remixOriginalId });

    if (remixIdea) {
      setIdea(remixIdea);
      toast.info('🔄 Remix carregado! Edite a ideia e gere seu PRD.');

      localStorage.removeItem('remix_idea');

      if (remixOriginalId) {
        setRemixOriginalId(remixOriginalId);
        debugLog('✅ [REMIX LOAD] remixOriginalId setado:', remixOriginalId);
      } else {
        debugWarn('⚠️ [REMIX LOAD] remixOriginalId não encontrado no localStorage');
      }
    }
  }, []);

  // Restaurar ideia salva após login
  useEffect(() => {
    const savedIdea = localStorage.getItem('prd_idea_temp');

    if (savedIdea && !idea) {
      setIdea(savedIdea);
      localStorage.removeItem('prd_idea_temp');
      toast.info('💡 Sua ideia foi restaurada!');
    }
  }, [user, idea]);

  // Gerar automaticamente após login se tinha pedido
  useEffect(() => {
    const autoGenerate = localStorage.getItem('prd_auto_generate');

    if (autoGenerate === 'true' && user && idea.trim()) {
      localStorage.removeItem('prd_auto_generate');
      setTimeout(() => {
        generatePRD();
      }, 800);
    }
  }, [user, idea, generatePRD]);

  useEffect(() => {
    if (activated) {
      toast.success('🎮 Código Secreto Desbloqueado! Modo de Voz Ativado!');
      setShowRealtimeModal(true);
    }
  }, [activated]);

  useEffect(() => {
    if (isGenerating) {
      let messageIndex = 0;
      setLoadingMessage(loadingMessages[0]);

      const interval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[messageIndex]);
      }, 3500);

      return () => clearInterval(interval);
    } else {
      setLoadingMessage('CRIANDO SEU DOCUMENTO...');
    }
  }, [isGenerating]);

  // Randomiza o placeholder quando o componente monta
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * placeholderExamples.length);
    setPlaceholder(placeholderExamples[randomIndex]);
  }, []);

  // Buscar total de PRDs públicos para o card de galeria
  useEffect(() => {
    const fetchTotalPRDs = async () => {
      const { count, error } = await supabase
        .from('document_history')
        .select('*', { count: 'exact', head: true })
        .eq('is_public', true);

      if (!error && count !== null) {
        setTotalPRDs(count);
      }
    };

    fetchTotalPRDs();
  }, []);

  // Verificar se usuário já criou algum PRD (para ocultar HowItWorks)
  useEffect(() => {
    const checkUserDocuments = async () => {
      if (!user) {
        setHasCreatedPRD(false);
        return;
      }

      try {
        const { count, error } = await supabase
          .from('document_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (error) {
          logger.error('Erro ao verificar documentos do usuário:', error);
          return;
        }

        setHasCreatedPRD((count ?? 0) > 0);
      } catch (error) {
        logger.error('Erro ao verificar documentos:', error);
      }
    };

    checkUserDocuments();
  }, [user]);

  return (
    <>
      {/* TopBar Unificada */}
      <TopBar onAuthRequired={onAuthRequired} />
      <div className="min-h-screen bg-background flex flex-col items-center px-4 safe-area-padding pt-10">
        <div className="flex-1 flex flex-col items-center w-full gap-6 sm:gap-8 md:gap-10 pb-6 sm:pb-8">
          <header className="w-full max-w-5xl text-center pt-6 sm:pt-8 md:pt-10 pb-0">
            {/* Logo Principal */}
            <div className="block">
              <img
                src="/logoea.png"
                alt="Logo Escola de Automação"
                className="h-24 sm:h-32 md:h-40 mx-auto mb-8 sm:mb-12 md:mb-16"
              />
            </div>

            <h1 className="text-lg sm:text-3xl md:text-5xl uppercase tracking-widest font-black mt-4 sm:mt-6 px-2">
              Crie seu App com IA em Minutos
            </h1>
          </header>

          {/* 1. Formulário em destaque */}
          <div className="w-full max-w-5xl flex flex-col gap-3 sm:gap-4">
            <div className="border-brutal bg-card p-4 sm:p-6 md:p-8 shadow-brutal">
              <label
                htmlFor="idea-input"
                className="block text-lg sm:text-xl md:text-2xl mb-2 sm:mb-3 uppercase tracking-wide"
              >
                Conte sua ideia
              </label>
              <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                Quanto mais detalhes, melhor será o documento final
              </p>

              {/* Card Teaser da Galeria */}
              <div className="mb-2 sm:mb-4 md:mb-6 p-2 sm:p-4 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 border-2 sm:border-4 border-accent rounded-lg">
                <div className="flex items-center justify-between gap-1.5 sm:gap-3">
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide mb-0.5 sm:mb-1 flex items-center gap-2">
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-accent" />
                      Sem ideias? Inspire-se!
                    </h3>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                      {totalPRDs > 0 ? (
                        <>
                          <span className="font-bold text-accent">
                            {totalPRDs.toLocaleString('pt-BR')}
                          </span>{' '}
                          PRDs públicos esperando por você na galeria
                        </>
                      ) : (
                        'Centenas de PRDs públicos esperando por você na galeria'
                      )}
                    </p>
                  </div>
                  <Link to="/galeria" className="flex-shrink-0">
                    <Button
                      variant="brutal"
                      size="sm"
                      className="text-[10px] sm:text-xs md:text-sm font-black uppercase whitespace-nowrap px-2 py-1 sm:px-3 sm:py-2"
                    >
                      Ver Galeria →
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Textarea
                    id="idea-input"
                    placeholder={placeholder}
                    value={idea}
                    onChange={e => setIdea(e.target.value)}
                    className="flex-1 min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"
                    maxLength={10000}
                  />
                  <div className="hidden sm:block">
                    <VoiceRecorder onTranscript={handleVoiceTranscript} />
                  </div>
                </div>

                {/* Mobile: contador à esquerda, microfone à direita */}
                <div className="flex sm:hidden items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {idea.length}/10000 caracteres
                  </span>
                  <VoiceRecorder onTranscript={handleVoiceTranscript} />
                </div>

                {/* Desktop: UsageCounter à esquerda, contador à direita */}
                <div className="hidden sm:flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <UsageCounter onUpgradeClick={() => setShowUpgradeModal(true)} inline={true} />
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {idea.length}/10000 caracteres
                  </span>
                </div>

                {/* Mobile: UsageCounter embaixo */}
                <div className="flex sm:hidden w-full">
                  <UsageCounter onUpgradeClick={() => setShowUpgradeModal(true)} inline={true} />
                </div>
              </div>
            </div>

            {/* Botão hero */}
            <Button
              variant="hero"
              size="lg"
              onClick={generatePRD}
              disabled={isGenerating || !idea.trim()}
              className="w-full text-lg sm:text-xl md:text-2xl lg:text-3xl h-16 sm:h-20 md:h-24 font-display tracking-wider"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 animate-spin" />
                  <span className="animate-in fade-in duration-500 truncate px-2">
                    {loadingMessage}
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" />
                  <span className="truncate px-2">CRIAR DOCUMENTO</span>
                </>
              )}
            </Button>
          </div>

          {/* 2. Resultado (se existir) */}
          <PRDResult content={prdResult} />

          {/* 3. HowItWorks - ocultar após criar primeiro PRD */}
          {!prdResult && !hasCreatedPRD && <HowItWorks />}

          {/* 4. MyDocuments */}
          <MyDocuments />

          <footer className="w-full max-w-5xl mt-auto pt-8 sm:pt-10 md:pt-12 pb-6 sm:pb-8 text-center border-t-4 border-foreground space-y-4">
            {/* Copyright */}
            <p className="text-xs font-bold uppercase tracking-wider opacity-40">
              <a
                href="https://www.escoladeautomacao.com.br/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-100 transition-opacity"
              >
                © 2025 ESCOLA DE AUTOMAÇÃO
              </a>{' '}
              | CNPJ 49.853.639/0001-09 | Protegido pela LGPD
            </p>

            {/* Links de Privacidade */}
            <p className="text-xs font-medium uppercase tracking-wider opacity-60">
              <Link to="/privacidade" className="hover:opacity-100 transition-opacity">
                Política de Privacidade
              </Link>
              {user && (
                <>
                  {' | '}
                  <Link
                    to="/configuracoes/privacidade"
                    className="hover:opacity-100 transition-opacity"
                  >
                    Configurações de Privacidade
                  </Link>
                </>
              )}
            </p>

            {/* Desenvolvido por */}
            <p className="text-sm font-black uppercase tracking-wider opacity-60">
              Desenvolvido por{' '}
              <a
                href="https://www.instagram.com/thaleslaray/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Thales Laray
              </a>
            </p>
          </footer>
        </div>{' '}
        {/* Fecha container flex-1 */}
        {/* Overlay preto quando modo secreto está ativo */}
        {showRealtimeModal && <div className="fixed inset-0 bg-black z-40 animate-fade-in" />}
        <RealtimeVoiceInterface
          open={showRealtimeModal}
          onOpenChange={setShowRealtimeModal}
          onTranscriptComplete={handleTranscriptComplete}
        />
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          currentPlan={isStudent ? 'student' : 'free'}
        />
      </div>{' '}
      {/* Fecha min-h-screen */}
    </>
  );
};
