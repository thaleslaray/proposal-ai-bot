/**
 * Tipos centralizados da aplicação
 * Evita duplicação e garante consistência
 */

import { Json } from '@/integrations/supabase/types';

export interface PRDDocument {
  id: string;
  user_id: string;
  idea_preview: string;
  description?: string;
  full_document: string;
  category: string;
  likes_count: number;
  remixes_count: number;
  view_count?: number;
  is_premium: boolean;
  is_featured?: boolean;
  created_at: string;
  user_name?: string;
  username?: string;
  avatar_url?: string;
  public_profiles?: {
    name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export interface Leader {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  total_points: number;
  prds_created: number;
  position: number;
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
}

export interface ProfileData {
  id?: string;
  username?: string;
  name?: string;
  bio?: string;
  occupation?: string;
  location?: string;
  website?: string;
  email?: string;
  avatar_url?: string;
  show_email?: boolean;
  social_links?: SocialLinks | Json;
}

export interface BadgeData {
  id: string;
  user_id: string;
  badge_type: string;
  earned_at: string;
  metadata?: Record<string, unknown> | Json;
}

export interface Document {
  id: string;
  user_id: string;
  idea_preview: string;
  full_document: string;
  created_at: string;
  category: string;
  user_name: string;
}
