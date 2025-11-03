import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// 🎯 TIPOS CENTRALIZADOS
export type AnalyticsEventType =
  | 'profile_view' // Visualização de perfil
  | 'social_click' // Clique em rede social
  | 'prd_view' // Visualização de PRD
  | 'prd_like' // Like em PRD
  | 'prd_remix' // Remix de PRD
  | 'prd_share' // Compartilhamento
  | 'prd_generated' // PRD gerado
  | 'search' // Busca na galeria
  | 'category_filter' // Filtro por categoria
  | 'page_view' // Navegação entre páginas
  | 'upgrade_modal_opened' // Modal de upgrade aberto
  | 'upgrade_button_clicked' // Botão de upgrade clicado
  | 'whatsapp_otp_sent' // OTP do WhatsApp enviado
  | 'whatsapp_login_success'; // Login via WhatsApp bem-sucedido

export interface AnalyticsEventMetadata {
  // Profile Events
  profile_id?: string;
  platform?: string; // Para social_click

  // PRD Events
  document_id?: string;
  category?: string;
  remix_original_id?: string;

  // Search Events
  search_term?: string;
  results_count?: number;

  // Page Events
  page_path?: string;
  referrer?: string;

  // Generic - allow additional metadata fields
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * 🚀 FUNÇÃO ÚNICA DE TRACKING
 * Substitui todas as funções espalhadas (trackEvent, trackProfileView, trackSocialClick)
 */
export const trackAnalyticsEvent = async (
  eventType: AnalyticsEventType,
  metadata: AnalyticsEventMetadata = {},
  userId?: string
) => {
  try {
    // Se não passou userId, tenta pegar da sessão atual
    const finalUserId = userId || (await supabase.auth.getUser()).data.user?.id || null;

    await supabase.from('prd_analytics').insert({
      event_type: eventType,
      user_id: finalUserId,
      document_id: metadata.document_id || null,
      target_user_id: metadata.profile_id || null,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error(`[Analytics] Failed to track "${eventType}":`, error);
  }
};

/**
 * @deprecated Para retrocompatibilidade com código antigo. Use trackAnalyticsEvent() ou analytics.trackX()
 */
export const trackEvent = trackAnalyticsEvent;

// 🎯 ATALHOS TIPADOS (Opcional, para DX melhor)
export const analytics = {
  trackProfileView: (profileId: string, viewerId?: string) =>
    trackAnalyticsEvent('profile_view', { profile_id: profileId }, viewerId),

  trackSocialClick: (profileId: string, platform: string, clickerId?: string) =>
    trackAnalyticsEvent('social_click', { profile_id: profileId, platform }, clickerId),

  trackPRDView: (documentId: string, userId?: string) =>
    trackAnalyticsEvent('prd_view', { document_id: documentId }, userId),

  trackSearch: (searchTerm: string, resultsCount: number, userId?: string) =>
    trackAnalyticsEvent('search', { search_term: searchTerm, results_count: resultsCount }, userId),

  trackPageView: (path: string, userId?: string) =>
    trackAnalyticsEvent('page_view', { page_path: path }, userId),
};
