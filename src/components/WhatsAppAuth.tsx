import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle } from 'lucide-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { trackEvent } from '@/lib/analytics';
import { Link } from 'react-router-dom';
import { debugLog, debugError } from '@/utils/debugLogger';
import type { UTMParams } from '@/utils/utmTracker';
import { logger } from '@/lib/logger';

interface WhatsAppAuthProps {
  onSuccess?: () => void;
  utmParams?: UTMParams | null;
}

export const WhatsAppAuth: React.FC<WhatsAppAuthProps> = ({ onSuccess, utmParams }) => {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('+55');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const handleSendCode = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Digite seu nome (mínimo 2 caracteres)');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      toast.error('Digite um e-mail válido');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      toast.error('Digite um número de telefone válido');
      return;
    }

    if (!lgpdConsent) {
      toast.error('Você precisa aceitar a Política de Privacidade para continuar');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-whatsapp-otp', {
        body: {
          phone: cleanPhone,
          name: name.trim(),
          email: email.trim(),
        },
      });

      if (error) throw error;

      toast.success('✅ Código enviado!', {
        description: 'Verifique seu WhatsApp',
      });
      trackEvent('whatsapp_otp_sent', { phone: cleanPhone });
      setStep('code');
    } catch (error: unknown) {
      debugError('Error sending code:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Tente novamente em alguns instantes';
      toast.error('Erro ao enviar código', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código de 6 dígitos recebido no WhatsApp');
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const eventSlug = window.location.pathname.match(/\/evento\/([^/]+)/)?.[1];
      logger.log('🎯 Detectado evento na URL:', eventSlug);

      const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
        body: {
          phone: cleanPhone,
          code,
          name: name.trim(),
          email: email.trim(),
          utmParams: utmParams || undefined,
        },
        headers: eventSlug ? { 'X-Event-Slug': eventSlug } : {},
      });

      if (error) throw error;

      logger.log('📨 Resposta do verify-whatsapp-otp:', data);
      debugLog('✅ Verification response:', data);

      // Fazer login com os tokens recebidos
      if (data.access_token && data.refresh_token) {
        debugLog('🔑 Setting session with tokens');
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });

        if (sessionError) {
          debugError('❌ Session error:', sessionError);
          throw sessionError;
        }

        debugLog('✅ Session set successfully!');
        toast.success('🎉 Bem-vindo!', {
          description: data.message,
        });
        trackEvent('whatsapp_login_success', { phone: cleanPhone });

        // Chamar onSuccess imediatamente
        onSuccess?.();
      } else {
        debugError('❌ Missing tokens in response:', data);
        throw new Error('Tokens não recebidos do servidor');
      }
    } catch (error: unknown) {
      debugError('Error verifying code:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Verifique o código e tente novamente';
      toast.error('Código inválido', {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-brutal shadow-brutal">
      <CardHeader>
        <CardTitle className="text-3xl font-display uppercase flex items-center gap-2">
          <MessageCircle className="w-8 h-8 text-green-500" />
          {step === 'phone' ? 'Entre com WhatsApp' : 'Verifique seu código'}
        </CardTitle>
        <CardDescription className="text-base">
          {step === 'phone'
            ? 'Preencha seus dados para receber o código de acesso'
            : `Enviamos um código para ${phone}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'phone' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="name" className="text-base sm:text-lg">
                Nome completo *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-14 text-base sm:text-lg touch-manipulation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base sm:text-lg">
                E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-14 text-base sm:text-lg touch-manipulation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-base sm:text-lg">
                WhatsApp *
              </Label>
              <PhoneInput
                defaultCountry="br"
                value={phone}
                onChange={phone => setPhone(phone)}
                inputClassName="h-14 text-base sm:text-lg"
                className="phone-input-custom"
                forceDialCode={true}
                disableCountryGuess={true}
                disableDialCodeAndPrefix={false}
              />
              <p className="text-xs text-muted-foreground">
                Usaremos seu número apenas para login e comunicações importantes
              </p>
            </div>

            {/* Consentimento LGPD */}
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="lgpd-consent"
                checked={lgpdConsent}
                onCheckedChange={checked => setLgpdConsent(checked as boolean)}
              />
              <Label htmlFor="lgpd-consent" className="text-xs leading-tight cursor-pointer">
                Li e aceito a{' '}
                <Link to="/privacidade" className="text-primary hover:underline font-bold">
                  Política de Privacidade
                </Link>{' '}
                e autorizo o tratamento dos meus dados pessoais.
              </Label>
            </div>

            <Button
              onClick={handleSendCode}
              disabled={
                loading ||
                !name.trim() ||
                !email.trim() ||
                phone.replace(/\D/g, '').length < 10 ||
                !lgpdConsent
              }
              className="w-full h-14 sm:h-16 text-lg sm:text-xl touch-manipulation"
              variant="hero"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  RECEBER CÓDIGO
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-base sm:text-lg">
                Código de 6 dígitos
              </Label>
              <Input
                id="code"
                type="text"
                placeholder="123456"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl sm:text-3xl tracking-widest h-16 sm:h-20 touch-manipulation"
                autoFocus
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>
            <Button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className="w-full h-14 sm:h-16 text-lg sm:text-xl touch-manipulation"
              variant="hero"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  VERIFICANDO...
                </>
              ) : (
                '✅ ENTRAR'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep('phone');
                setCode('');
              }}
              disabled={loading}
              className="w-full h-12 text-base sm:text-lg"
            >
              ← Voltar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
