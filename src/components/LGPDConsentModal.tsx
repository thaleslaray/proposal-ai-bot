import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, X, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LGPDConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline: () => void;
  userId: string;
}

export const LGPDConsentModal = ({ open, onAccept, onDecline, userId }: LGPDConsentModalProps) => {
  const [consentChecked, setConsentChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const handleAccept = async () => {
    if (!consentChecked) {
      toast.error('Você precisa aceitar os termos para continuar');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          lgpd_consent_date: new Date().toISOString(),
          lgpd_consent_version: 'v1.0',
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('✅ Consentimento registrado com sucesso!');
      onAccept();
    } catch (error) {
      logger.error('Error saving consent:', error);
      toast.error('Erro ao salvar consentimento. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = () => {
    setShowDeclineDialog(true);
  };

  const confirmDecline = () => {
    setShowDeclineDialog(false);
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-2xl max-w-[95vw] max-h-[90vh] overflow-y-auto bg-card border-brutal shadow-brutal">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-primary" />
          <DialogTitle className="text-2xl font-black uppercase tracking-wide">
            Proteção de Dados
          </DialogTitle>
        </div>

        <DialogDescription className="text-sm text-muted-foreground space-y-4">
          <div className="space-y-3">
            <p>
              Para utilizar nossa plataforma, precisamos coletar e processar alguns dados pessoais.
              Leia atentamente as informações abaixo:
            </p>

            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-primary space-y-2">
              <h3 className="font-bold text-foreground">📊 Dados que Coletamos:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Nome, email e telefone (para autenticação e contato)</li>
                <li>PRDs criados e documentos (para histórico e melhorias)</li>
                <li>Dados de uso e navegação (analytics anônimos)</li>
              </ul>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-accent space-y-2">
              <h3 className="font-bold text-foreground">🎯 Por que Coletamos:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Autenticação e controle de acesso</li>
                <li>Limites de uso e validação de planos</li>
                <li>Melhorias na plataforma e suporte técnico</li>
              </ul>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-secondary space-y-2">
              <h3 className="font-bold text-foreground">🔒 Como Protegemos:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Armazenamento seguro com criptografia</li>
                <li>Acesso restrito apenas a pessoal autorizado</li>
                <li>Conformidade com LGPD (Lei 13.709/2018)</li>
              </ul>
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-muted space-y-2">
              <h3 className="font-bold text-foreground">⚖️ Seus Direitos:</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Acessar e exportar seus dados a qualquer momento</li>
                <li>Solicitar correção ou exclusão de dados</li>
                <li>Revogar consentimento e excluir sua conta</li>
              </ul>
            </div>

            <p className="text-xs pt-2">
              Para mais detalhes, leia nossa{' '}
              <Link to="/privacidade" className="text-primary hover:underline font-bold">
                Política de Privacidade completa
              </Link>
              .
            </p>
          </div>
        </DialogDescription>

        <div className="flex items-start space-x-3 pt-4 pb-2">
          <Checkbox
            id="lgpd-consent"
            checked={consentChecked}
            onCheckedChange={checked => setConsentChecked(checked as boolean)}
          />
          <Label
            htmlFor="lgpd-consent"
            className="text-sm font-medium leading-tight cursor-pointer"
          >
            Li e aceito os termos da{' '}
            <Link to="/privacidade" className="text-primary hover:underline font-bold">
              Política de Privacidade
            </Link>{' '}
            e autorizo o tratamento dos meus dados pessoais conforme descrito acima.
          </Label>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
          <Button variant="outline" onClick={handleDecline} disabled={isLoading} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Recusar
          </Button>
          <Button
            variant="default"
            onClick={handleAccept}
            disabled={!consentChecked || isLoading}
            className="flex-1"
          >
            {isLoading ? 'Salvando...' : 'Aceitar e Continuar'}
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent className="bg-card border-brutal shadow-brutal">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-black uppercase">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Confirmar Recusa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2">
              <p>
                ⚠️ Ao recusar os termos de privacidade, você não poderá usar a plataforma e será
                desconectado imediatamente.
              </p>
              <p className="font-semibold text-foreground">Tem certeza que deseja recusar?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecline}
              className="bg-destructive hover:bg-destructive/90"
            >
              Sim, Recusar e Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
