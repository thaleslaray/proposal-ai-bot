/**
 * Utility para capturar e gerenciar parâmetros UTM
 * Armazena dados de aquisição em sessionStorage para persistir durante a navegação
 */

import { logger } from '@/lib/logger';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref_code?: string;
  referrer?: string;
  landing_page?: string;
  fbclid?: string;
  gclid?: string;
}

const UTM_STORAGE_KEY = 'utm_params';

/**
 * Captura parâmetros UTM da URL atual
 */
export const captureUTMParams = (): UTMParams | null => {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);

  const utmParams: UTMParams = {
    utm_source: urlParams.get('utm_source') || undefined,
    utm_medium: urlParams.get('utm_medium') || undefined,
    utm_campaign: urlParams.get('utm_campaign') || undefined,
    utm_term: urlParams.get('utm_term') || undefined,
    utm_content: urlParams.get('utm_content') || undefined,
    ref_code: urlParams.get('ref') || urlParams.get('ref_code') || undefined,
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname + window.location.search,
    fbclid: urlParams.get('fbclid') || undefined,
    gclid: urlParams.get('gclid') || undefined,
  };

  // Só retorna se tiver pelo menos um parâmetro
  const hasParams = Object.values(utmParams).some(v => v !== undefined);
  return hasParams ? utmParams : null;
};

/**
 * Salva parâmetros UTM em sessionStorage
 */
export const saveUTMParams = (params: UTMParams): void => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(params));
  } catch (error) {
    logger.warn('Erro ao salvar UTM params:', error);
  }
};

/**
 * Recupera parâmetros UTM salvos
 */
export const getStoredUTMParams = (): UTMParams | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    logger.warn('Erro ao recuperar UTM params:', error);
    return null;
  }
};

/**
 * Limpa parâmetros UTM salvos
 */
export const clearUTMParams = (): void => {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.removeItem(UTM_STORAGE_KEY);
  } catch (error) {
    logger.warn('Erro ao limpar UTM params:', error);
  }
};

/**
 * Hook principal: captura UTM da URL ou recupera do storage
 */
export const getUTMParams = (): UTMParams | null => {
  // Primeiro tenta capturar da URL
  const capturedParams = captureUTMParams();

  if (capturedParams) {
    saveUTMParams(capturedParams);
    return capturedParams;
  }

  // Se não tem na URL, tenta recuperar do storage
  return getStoredUTMParams();
};
