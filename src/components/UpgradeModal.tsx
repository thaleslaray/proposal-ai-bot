import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Crown, Zap, Check } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: 'free' | 'student';
}

export const UpgradeModal = ({ open, onOpenChange, currentPlan }: UpgradeModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState<'question' | 'validation' | 'plans'>('question');
  const [validationEmail, setValidationEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const plans = [
    {
      name: 'Aluno',
      icon: Zap,
      limit: '2 documentos/dia',
      price: 'R$ 1.997',
      installments: 'ou 12x R$ 218,88',
      features: [
        'Acesso à Escola de Automação',
        'Todos os cursos disponíveis',
        'Geração de PRDs com IA',
        '2 documentos por dia',
        'Suporte por email',
        'Histórico de documentos',
      ],
      cta: 'Assinar Aluno',
      href: 'https://escoladeautomacao.com.br/',
      highlight: currentPlan === 'free',
    },
    {
      name: 'Vitalício',
      icon: Crown,
      limit: 'Documentos ILIMITADOS',
      price: 'R$ 2.997',
      installments: 'ou 12x R$ 309,96',
      features: [
        'Tudo do Aluno +',
        'Acesso VITALÍCIO aos cursos',
        'Documentos ILIMITADOS',
        'Todas as ferramentas',
        'Suporte prioritário',
        'Atualizações gratuitas para sempre',
      ],
      cta: 'Garantir Vitalício',
      href: 'https://escoladeautomacao.com.br/vitalicio',
      highlight: true,
    },
  ];

  // Filtrar planos baseado no currentPlan
  const plansToShow = plans.filter(plan => {
    if (currentPlan === 'student') {
      // Se já é aluno, mostrar apenas Vitalício
      return plan.name === 'Vitalício';
    }
    // Se é free, mostrar ambos
    return true;
  });

  const handleValidateAccess = async () => {
    if (!validationEmail || !validationEmail.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Digite um email válido',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não encontrado. Faça login novamente.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);

    try {
      const { data, error } = await supabase.functions.invoke('validate-hotmart-access', {
        body: {
          user_id: user.id,
          email: validationEmail,
          force_revalidate: true,
        },
      });

      if (error) throw error;

      if (data.hasAccess) {
        toast({
          title: '✅ Acesso validado!',
          description: 'Seu limite foi aumentado. Recarregando...',
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: '❌ Acesso não encontrado',
          description: 'Nenhum produto ativo foi encontrado com este email',
          variant: 'destructive',
        });
        setStep('plans'); // Mostrar os planos
      }
    } catch (error) {
      logger.error('Erro na validação:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao validar acesso. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-brutal shadow-brutal">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black uppercase">
            {currentPlan === 'student' ? '🚀 Upgrade para Vitalício' : '⏱️ Limite Diário Atingido'}
          </DialogTitle>
          <DialogDescription>
            {currentPlan === 'student'
              ? 'Desbloqueie documentos ILIMITADOS e acesso vitalício a Escola de Automação'
              : step === 'question'
                ? 'Primeiro, vamos verificar se você já tem acesso'
                : 'Faça upgrade e continue gerando documentos profissionais com IA'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Pergunta SIM/NÃO (apenas para FREE) */}
        {currentPlan === 'free' && step === 'question' && (
          <div className="py-8">
            <h3 className="text-2xl font-black text-center mb-8">
              📚 Você já é aluno da Escola de Automação?
            </h3>

            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <Button
                variant="default"
                size="lg"
                className="h-32 flex flex-col gap-2 text-lg font-black"
                onClick={() => setStep('validation')}
              >
                <span className="text-4xl">✅</span>
                <span>SIM</span>
                <span className="text-xs font-normal opacity-80">Validar meu acesso</span>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="h-32 flex flex-col gap-2 text-lg font-black"
                onClick={() => setStep('plans')}
              >
                <span className="text-4xl">❌</span>
                <span>NÃO</span>
                <span className="text-xs font-normal opacity-80">Conhecer os planos</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Validação de Email */}
        {currentPlan === 'free' && step === 'validation' && (
          <div className="py-6">
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center mb-6">
                <h3 className="text-xl font-black mb-2">🔓 Validar Acesso Hotmart</h3>
                <p className="text-sm text-muted-foreground">
                  Digite o email que você usou para comprar na Hotmart
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotmart-email" className="text-lg">
                  Email cadastrado na Hotmart *
                </Label>
                <Input
                  id="hotmart-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={validationEmail}
                  onChange={e => setValidationEmail(e.target.value)}
                  className="h-12 text-lg"
                  disabled={isValidating}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !isValidating) {
                      handleValidateAccess();
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Usaremos este email para buscar suas compras na Hotmart
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="default"
                  className="flex-1 h-12"
                  onClick={handleValidateAccess}
                  disabled={isValidating}
                >
                  {isValidating ? 'Validando...' : 'Validar Acesso'}
                </Button>
                <Button
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    setStep('question');
                    setValidationEmail('');
                  }}
                  disabled={isValidating}
                >
                  ← Voltar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Planos */}
        {(step === 'plans' || currentPlan === 'student') && (
          <>
            <div
              className={`grid ${plansToShow.length === 1 ? 'md:grid-cols-1 max-w-2xl mx-auto' : 'md:grid-cols-2'} gap-6 mt-6`}
            >
              {plansToShow.map(plan => (
                <div
                  key={plan.name}
                  className={`border-brutal p-6 ${plan.highlight ? 'bg-accent/10' : 'bg-card'}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <plan.icon className="w-6 h-6" />
                    <h3 className="text-2xl font-black">{plan.name}</h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">{plan.limit}</p>
                  <div className="mb-6">
                    <p className="text-3xl font-black">{plan.price}</p>
                    {plan.installments && (
                      <p className="text-sm text-muted-foreground mt-1">{plan.installments}</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlight ? 'hero' : 'default'}
                    className="w-full"
                    onClick={() => {
                      trackEvent('upgrade_button_clicked', {
                        plan: plan.name.toLowerCase(),
                        current_plan: currentPlan,
                        answered_already_student: step === 'plans' ? 'no' : 'n/a',
                      });
                      window.open(plan.href, '_blank');
                    }}
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>

            {/* Botão voltar (apenas se veio da pergunta) */}
            {currentPlan === 'free' && step === 'plans' && (
              <div className="mt-4">
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('question');
                    setValidationEmail('');
                  }}
                >
                  ← Voltar
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
