import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Link2, Copy, QrCode, MessageCircle } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { logger } from '@/lib/logger';

interface Event {
  slug: string;
  name: string;
}

const COMMON_SOURCES = [
  'instagram',
  'facebook',
  'email',
  'google',
  'linkedin',
  'twitter',
  'youtube',
  'tiktok',
];
const COMMON_MEDIUMS = ['social', 'paid', 'organic', 'email', 'cpc', 'banner', 'referral'];

export function UTMGenerator() {
  const [baseUrl, setBaseUrl] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [refCode, setRefCode] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    // URL base fixa para produção
    setBaseUrl('https://prd.escoladeautomacao.com.br');

    // Load active events
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data } = await supabase
        .from('events')
        .select('slug, name')
        .eq('is_active', true)
        .order('start_date', { ascending: false });

      if (data) {
        setEvents(data);
      }
    } catch (error) {
      logger.error('Error loading events:', error);
    }
  };

  const generatedUrl = useMemo(() => {
    if (!baseUrl) return '';

    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    if (utmTerm) params.append('utm_term', utmTerm);
    if (utmContent) params.append('utm_content', utmContent);
    if (refCode) params.append('ref_code', refCode);

    const queryString = params.toString();
    return queryString ? `${baseUrl}/?${queryString}` : baseUrl;
  }, [baseUrl, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, refCode]);

  const matchingEvent = useMemo(() => {
    if (!utmCampaign) return null;
    return events.find(e => e.slug === utmCampaign);
  }, [utmCampaign, events]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      toast({
        title: 'URL copiada!',
        description: 'A URL foi copiada para a área de transferência.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar a URL.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateQR = async () => {
    try {
      const dataUrl = await QRCodeLib.toDataURL(generatedUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (error) {
      toast({
        title: 'Erro ao gerar QR Code',
        description: 'Não foi possível gerar o QR Code.',
        variant: 'destructive',
      });
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Confira: ${generatedUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.download = 'qrcode-utm.png';
    link.href = qrCodeDataUrl;
    link.click();
  };

  return (
    <>
      <Card className="border-brutal shadow-brutal">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black text-lg">
            <Link2 className="h-5 w-5 text-primary" />
            Gerador de URL com Rastreamento UTM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="baseUrl">URL Base</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://seusite.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utmSource">Origem (utm_source) *</Label>
              <Select value={utmSource} onValueChange={setUtmSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou digite" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_SOURCES.map(source => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">✏️ Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {utmSource === 'custom' && (
                <Input
                  placeholder="Digite a origem"
                  onChange={e => setUtmSource(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="utmMedium">Meio (utm_medium) *</Label>
              <Select value={utmMedium} onValueChange={setUtmMedium}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione ou digite" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_MEDIUMS.map(medium => (
                    <SelectItem key={medium} value={medium}>
                      {medium}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">✏️ Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {utmMedium === 'custom' && (
                <Input
                  placeholder="Digite o meio"
                  onChange={e => setUtmMedium(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="utmCampaign">Campanha (utm_campaign)</Label>
              <Select value={utmCampaign} onValueChange={setUtmCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.slug} value={event.slug}>
                      {event.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">✏️ Personalizado</SelectItem>
                </SelectContent>
              </Select>
              {utmCampaign === 'custom' && (
                <Input
                  placeholder="Digite a campanha"
                  onChange={e => setUtmCampaign(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="refCode">Código Ref (ref_code)</Label>
              <Input
                id="refCode"
                value={refCode}
                onChange={e => setRefCode(e.target.value)}
                placeholder="parceiro123"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utmTerm">Termo (utm_term)</Label>
              <Input
                id="utmTerm"
                value={utmTerm}
                onChange={e => setUtmTerm(e.target.value)}
                placeholder="palavra-chave"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utmContent">Conteúdo (utm_content)</Label>
              <Input
                id="utmContent"
                value={utmContent}
                onChange={e => setUtmContent(e.target.value)}
                placeholder="banner-topo"
              />
            </div>
          </div>

          {/* URL Preview */}
          <div className="space-y-2">
            <Label>🔗 URL Gerada</Label>
            <div className="p-3 bg-muted rounded-md border border-border break-all text-sm font-mono">
              {generatedUrl || 'Preencha os campos acima...'}
            </div>
          </div>

          {/* Smart Alert */}
          {matchingEvent && (
            <Badge variant="default" className="w-full justify-center py-2 text-sm">
              ✅ Usuários serão adicionados automaticamente ao evento "{matchingEvent.name}"
            </Badge>
          )}

          {!matchingEvent && utmCampaign && (
            <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
              ℹ️ Link de rastreamento genérico (sem vínculo a evento)
            </Badge>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCopy}
              disabled={!generatedUrl}
              className="flex-1"
              variant="default"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar URL
            </Button>
            <Button
              onClick={handleGenerateQR}
              disabled={!generatedUrl}
              className="flex-1"
              variant="outline"
            >
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Button>
            <Button
              onClick={handleWhatsApp}
              disabled={!generatedUrl}
              className="flex-1"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - UTM URL</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            {qrCodeDataUrl && <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />}
            <p className="text-sm text-muted-foreground text-center break-all px-4">
              {generatedUrl}
            </p>
            <Button onClick={downloadQRCode} className="w-full">
              Baixar QR Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
