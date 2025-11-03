import { PRDGenerator } from '@/components/PRDGenerator';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WhatsAppAuth } from '@/components/WhatsAppAuth';
import { LGPDConsentModal } from '@/components/LGPDConsentModal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { debugLog, debugWarn } from '@/utils/debugLogger';
import { getUTMParams, type UTMParams } from '@/utils/utmTracker';
import { logger } from '@/lib/logger';

/**
 * Página principal da aplicação
 *
 * Renderiza o componente PRDGenerator e gerencia o dialog de autenticação.
 * Ponto de entrada para usuários gerarem seus PRDs.
 *
 * @example
 * ```tsx
 * <Route path="/" element={<Index />} />
 * ```
 */
const Index = () => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showLGPDModal, setShowLGPDModal] = useState(false);
  const [utmParams, setUtmParams] = useState<UTMParams | null>(null);
  const { user } = useAuth();

  // Capturar parâmetros UTM ao montar o componente
  useEffect(() => {
    const params = getUTMParams();
    if (params) {
      setUtmParams(params);
      debugLog('📊 UTM params capturados:', params);
    }
  }, []);

  // Rastrear aquisição de usuários existentes + verificar LGPD
  useEffect(() => {
    const trackAndCheckLGPD = async () => {
      if (!user) return;

      // 1. Rastrear aquisição se houver UTM params
      if (utmParams) {
        try {
          await supabase.functions.invoke('track-acquisition', {
            body: { user_id: user.id, utm_params: utmParams },
          });
          debugLog('✅ Aquisição rastreada para usuário existente');
        } catch (error) {
          debugWarn('⚠️ Erro ao rastrear aquisição:', error);
        }
      }

      // 2. Verificar consentimento LGPD
      const { data, error } = await supabase
        .from('profiles')
        .select('lgpd_consent_date')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        debugWarn('❌ Erro ao verificar consentimento:', error);
        return;
      }

      // Se não existe perfil OU sem consentimento, mostrar modal
      if (!data || !data.lgpd_consent_date) {
        debugLog('⚠️ Consentimento LGPD ausente, mostrando modal');
        setShowLGPDModal(true);
      }
    };

    trackAndCheckLGPD();
  }, [user, utmParams]);

  return (
    <div className="relative">
      {/* Modal de Consentimento LGPD */}
      {user && (
        <LGPDConsentModal
          open={showLGPDModal}
          onAccept={() => setShowLGPDModal(false)}
          onDecline={async () => {
            setShowLGPDModal(false);

            // 🔒 LGPD: Logout forçado ao recusar consentimento
            try {
              await supabase.auth.signOut();
              toast.info('Você precisa aceitar os termos para usar a plataforma', {
                duration: 5000,
              });
            } catch (error) {
              logger.error('Error signing out:', error);
            }
          }}
          userId={user.id}
        />
      )}

      {/* Dialog de Auth WhatsApp */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md max-w-[95vw] max-h-[95vh] overflow-y-auto bg-card border-brutal shadow-brutal p-4 sm:p-6">
          <DialogTitle className="text-xl sm:text-2xl font-black text-center mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            AUTENTICAÇÃO
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground mb-4">
            Entre com seu WhatsApp para continuar
          </DialogDescription>
          <WhatsAppAuth onSuccess={() => setShowAuthDialog(false)} utmParams={utmParams} />
        </DialogContent>
      </Dialog>

      <PRDGenerator onAuthRequired={() => setShowAuthDialog(true)} />
    </div>
  );
};

export default Index;
