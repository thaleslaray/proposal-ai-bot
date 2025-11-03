import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PRDDocument } from '@/types';
import { Button } from '@/components/ui/button';
import { PRDDocument } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PRDDocument } from '@/types';
import { Badge } from '@/components/ui/badge';
import { PRDDocument } from '@/types';
import { Copy, Star } from 'lucide-react';
import { PRDDocument } from '@/types';
import { toast } from 'sonner';
import { PRDDocument } from '@/types';
import { ShareButtons } from './ShareButtons';
import { PRDDocument } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { PRDDocument } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { PRDDocument } from '@/types';
import { UserRoleBadge } from '@/components/UserRoleBadge';
import { PRDDocument } from '@/types';
import { normalizeDisplayName } from '@/lib/utils';
import { PRDDocument } from '@/types';
import { useNavigate } from 'react-router-dom';
import { PRDDocument } from '@/types';
import { useState, useEffect } from 'react';
import { PRDDocument } from '@/types';
import { logger } from '@/lib/logger';
import { PRDDocument } from '@/types';

interface PRDPreviewModalProps {
  prd: PRDDocument;
  open: boolean;
  onClose: () => void;
  canViewPremium: boolean;
  isAdmin?: boolean;
  onToggleFeatured?: (prdId: string, currentStatus: boolean) => void;
  isAnonymous?: boolean;
  onRequestAuth?: () => void;
}

export const PRDPreviewModal = ({
  prd,
  open,
  onClose,
  canViewPremium,
  isAdmin = false,
  onToggleFeatured,
  isAnonymous = false,
  onRequestAuth,
}: PRDPreviewModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creatorUsername, setCreatorUsername] = useState<string | null>(null);

  // Buscar username do criador
  useEffect(() => {
    const fetchCreatorUsername = async () => {
      if (!prd?.user_id) return;

      try {
        const { data } = await supabase
          .from('public_profiles')
          .select('username')
          .eq('id', prd.user_id)
          .maybeSingle();

        if (data?.username) {
          setCreatorUsername(data.username);
        }
      } catch (error) {
        logger.error('Error fetching creator username:', error);
      }
    };

    fetchCreatorUsername();
  }, [prd?.user_id]);

  const handleCreatorClick = () => {
    if (creatorUsername) {
      navigate(`/u/${creatorUsername}`);
    }
  };

  if (!prd) return null;

  const isPremium = (prd as any).is_premium;
  const isAnonymousUser = isAnonymous && !user;

  // Truncamento por tipo de usuário
  const shouldTruncatePremium = isPremium && !canViewPremium;
  const shouldTruncateAnonymous = isAnonymousUser;

  // Preview: 30% do conteúdo para anônimos
  const previewLength = Math.floor(prd.full_document.length * 0.3);

  const displayContent = shouldTruncateAnonymous
    ? prd.full_document.substring(0, previewLength)
    : shouldTruncatePremium
      ? prd.full_document.substring(0, Math.floor(prd.full_document.length / 2)) +
        '\n\n[... Conteúdo restrito ...]'
      : prd.full_document;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(displayContent);
    toast.success('📋 PRD copiado!');

    // Track copy
    supabase.from('prd_analytics').insert({
      document_id: prd.id,
      event_type: 'copy',
      user_id: user?.id || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] border-brutal shadow-brutal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase flex items-center gap-2 flex-wrap">
            📄 {prd.idea_preview}
            {isPremium && (
              <Badge variant="default" className="bg-yellow-500 text-black">
                ⭐ Premium
              </Badge>
            )}
            {(prd as any).is_featured && <Badge variant="premium">✨ Escolha do Editor</Badge>}
          </DialogTitle>
          {(prd as any).user_name && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Criado por{' '}
                {creatorUsername ? (
                  <button
                    onClick={handleCreatorClick}
                    className="font-semibold text-foreground hover:text-primary hover:underline transition-colors cursor-pointer inline"
                  >
                    {normalizeDisplayName((prd as any).user_name)}
                  </button>
                ) : (
                  <span className="font-semibold text-foreground">
                    {normalizeDisplayName((prd as any).user_name)}
                  </span>
                )}
              </p>
              <UserRoleBadge userId={(prd as any).user_id} size="md" showDescription />
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4 relative">
          <div
            className={`whitespace-pre-wrap text-sm font-mono leading-relaxed ${
              shouldTruncateAnonymous ? 'relative' : ''
            }`}
          >
            {displayContent}
          </div>

          {/* Blur overlay para usuários anônimos */}
          {shouldTruncateAnonymous && (
            <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent flex items-end justify-center pb-8">
              <div className="text-center p-6 bg-card border-4 border-primary rounded-lg shadow-brutal max-w-md">
                <h3 className="text-xl font-black mb-2">🔐 Conteúdo Bloqueado</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Faça login para ver o PRD completo e interagir com a comunidade
                </p>
                <Button variant="brutal" size="lg" onClick={onRequestAuth}>
                  Fazer Login / Cadastrar
                </Button>
              </div>
            </div>
          )}

          {/* Paywall premium (mantém comportamento original) */}
          {shouldTruncatePremium && !shouldTruncateAnonymous && (
            <div className="mt-6 p-6 border-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950 rounded-lg text-center">
              <h3 className="text-xl font-black mb-2">🔒 Conteúdo Premium</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Este PRD contém informações avançadas disponíveis apenas para alunos.
              </p>
              <Button
                variant="brutal"
                size="lg"
                onClick={() => window.open('https://escoladeautomacao.com.br/planos', '_blank')}
              >
                Fazer Upgrade para Student
              </Button>
            </div>
          )}
        </ScrollArea>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={copyToClipboard}
            className="flex-1"
            disabled={shouldTruncateAnonymous}
          >
            <Copy className="mr-2 h-4 w-4" />
            {shouldTruncateAnonymous ? '🔒 Login para copiar' : 'Copiar'}
          </Button>

          {isAdmin && onToggleFeatured && (
            <Button
              variant={prd.is_featured ? 'default' : 'outline'}
              onClick={() => onToggleFeatured(prd.id, prd.is_featured || false)}
              className={
                prd.is_featured
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950'
              }
            >
              <Star className={`mr-2 h-4 w-4 ${prd.is_featured ? 'fill-current' : ''}`} />
              {prd.is_featured ? 'Remover Destaque' : 'Marcar como Featured'}
            </Button>
          )}

          <ShareButtons prd={prd} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
