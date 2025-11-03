export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_stats_cache: {
        Row: {
          docs_today: number
          docs_total: number
          docs_week: number
          id: number
          last_updated: string
          total_users: number
        }
        Insert: {
          docs_today: number
          docs_total: number
          docs_week: number
          id?: number
          last_updated?: string
          total_users: number
        }
        Update: {
          docs_today?: number
          docs_total?: number
          docs_week?: number
          id?: number
          last_updated?: string
          total_users?: number
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          cost_usd: number | null
          created_at: string | null
          endpoint: string
          id: string
          metadata: Json | null
          tokens_used: number | null
          user_id: string | null
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string | null
          endpoint: string
          id?: string
          metadata?: Json | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Update: {
          cost_usd?: number | null
          created_at?: string | null
          endpoint?: string
          id?: string
          metadata?: Json | null
          tokens_used?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      deletion_audit: {
        Row: {
          confirmation_text: string | null
          deleted_at: string
          deleted_user_id: string
          deletion_type: string
          executed_by: string | null
          id: string
          ip_address: string | null
          user_email: string | null
          user_phone: string | null
        }
        Insert: {
          confirmation_text?: string | null
          deleted_at?: string
          deleted_user_id: string
          deletion_type: string
          executed_by?: string | null
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_phone?: string | null
        }
        Update: {
          confirmation_text?: string | null
          deleted_at?: string
          deleted_user_id?: string
          deletion_type?: string
          executed_by?: string | null
          id?: string
          ip_address?: string | null
          user_email?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      document_history: {
        Row: {
          category: string | null
          category_metadata: Json | null
          created_at: string
          description: string | null
          document_length: number
          featured_at: string | null
          full_document: string
          id: string
          idea_preview: string
          is_featured: boolean | null
          is_public: boolean | null
          likes_count: number | null
          remixes_count: number | null
          tags: string[] | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          category?: string | null
          category_metadata?: Json | null
          created_at?: string
          description?: string | null
          document_length: number
          featured_at?: string | null
          full_document: string
          id?: string
          idea_preview: string
          is_featured?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          remixes_count?: number | null
          tags?: string[] | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          category?: string | null
          category_metadata?: Json | null
          created_at?: string
          description?: string | null
          document_length?: number
          featured_at?: string | null
          full_document?: string
          id?: string
          idea_preview?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          likes_count?: number | null
          remixes_count?: number | null
          tags?: string[] | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_history_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document_history_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_actions: {
        Row: {
          action_type: string
          created_at: string | null
          event_slug: string
          id: string
          points_earned: number | null
          prd_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          event_slug: string
          id?: string
          points_earned?: number | null
          prd_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          event_slug?: string
          id?: string
          points_earned?: number | null
          prd_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_actions_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "event_actions_prd_id_fkey"
            columns: ["prd_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_actions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_broadcast_state: {
        Row: {
          created_at: string | null
          current_state: string
          current_team_name: string | null
          event_slug: string
          id: string
          pitch_closes_at: string | null
          pitch_duration_seconds: number | null
          random_mode_enabled: boolean | null
          teams_presented: string[] | null
          updated_at: string | null
          updated_by: string | null
          voting_closes_at: string | null
          voting_duration_seconds: number | null
        }
        Insert: {
          created_at?: string | null
          current_state: string
          current_team_name?: string | null
          event_slug: string
          id?: string
          pitch_closes_at?: string | null
          pitch_duration_seconds?: number | null
          random_mode_enabled?: boolean | null
          teams_presented?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          voting_closes_at?: string | null
          voting_duration_seconds?: number | null
        }
        Update: {
          created_at?: string | null
          current_state?: string
          current_team_name?: string | null
          event_slug?: string
          id?: string
          pitch_closes_at?: string | null
          pitch_duration_seconds?: number | null
          random_mode_enabled?: boolean | null
          teams_presented?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          voting_closes_at?: string | null
          voting_duration_seconds?: number | null
        }
        Relationships: []
      }
      event_control_log: {
        Row: {
          action: string
          created_at: string | null
          event_slug: string
          id: string
          metadata: Json | null
          team_name: string | null
          triggered_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          event_slug: string
          id?: string
          metadata?: Json | null
          team_name?: string | null
          triggered_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          event_slug?: string
          id?: string
          metadata?: Json | null
          team_name?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_control_log_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
        ]
      }
      event_participants: {
        Row: {
          acquisition_metadata: Json | null
          event_slug: string
          id: string
          points: number | null
          prds_created: number | null
          registered_at: string | null
          user_id: string
        }
        Insert: {
          acquisition_metadata?: Json | null
          event_slug: string
          id?: string
          points?: number | null
          prds_created?: number | null
          registered_at?: string | null
          user_id: string
        }
        Update: {
          acquisition_metadata?: Json | null
          event_slug?: string
          id?: string
          points?: number | null
          prds_created?: number | null
          registered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_votes: {
        Row: {
          created_at: string | null
          event_slug: string
          id: string
          score_demo: number
          score_innovation: number
          score_pitch: number
          score_viability: number
          team_name: string
          voter_user_id: string
          weighted_score: number | null
        }
        Insert: {
          created_at?: string | null
          event_slug: string
          id?: string
          score_demo: number
          score_innovation: number
          score_pitch: number
          score_viability: number
          team_name: string
          voter_user_id: string
          weighted_score?: number | null
        }
        Update: {
          created_at?: string | null
          event_slug?: string
          id?: string
          score_demo?: number
          score_innovation?: number
          score_pitch?: number
          score_viability?: number
          team_name?: string
          voter_user_id?: string
          weighted_score?: number | null
        }
        Relationships: []
      }
      event_voting_weights: {
        Row: {
          created_at: string | null
          event_slug: string
          id: string
          template_name: string
          updated_at: string | null
          weight_demo: number
          weight_innovation: number
          weight_pitch: number
          weight_viability: number
        }
        Insert: {
          created_at?: string | null
          event_slug: string
          id?: string
          template_name: string
          updated_at?: string | null
          weight_demo: number
          weight_innovation: number
          weight_pitch: number
          weight_viability: number
        }
        Update: {
          created_at?: string | null
          event_slug?: string
          id?: string
          template_name?: string
          updated_at?: string | null
          weight_demo?: number
          weight_innovation?: number
          weight_pitch?: number
          weight_viability?: number
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          custom_limit: number | null
          description: string | null
          duration_hours: number | null
          end_date: string | null
          event_visibility: string | null
          id: string
          is_active: boolean | null
          logo_size: string | null
          logo_url: string | null
          manual_start_enabled: boolean | null
          name: string
          organizers_logos: Json | null
          slug: string
          start_date: string | null
          team_names: Json | null
          unpublish_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          custom_limit?: number | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          event_visibility?: string | null
          id?: string
          is_active?: boolean | null
          logo_size?: string | null
          logo_url?: string | null
          manual_start_enabled?: boolean | null
          name: string
          organizers_logos?: Json | null
          slug: string
          start_date?: string | null
          team_names?: Json | null
          unpublish_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          custom_limit?: number | null
          description?: string | null
          duration_hours?: number | null
          end_date?: string | null
          event_visibility?: string | null
          id?: string
          is_active?: boolean | null
          logo_size?: string | null
          logo_url?: string | null
          manual_start_enabled?: boolean | null
          name?: string
          organizers_logos?: Json | null
          slug?: string
          start_date?: string | null
          team_names?: Json | null
          unpublish_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      funnel_stats_cache: {
        Row: {
          engaged_users: number | null
          first_prd_users: number | null
          id: number
          last_updated: string | null
          total_users: number | null
        }
        Insert: {
          engaged_users?: number | null
          first_prd_users?: number | null
          id?: number
          last_updated?: string | null
          total_users?: number | null
        }
        Update: {
          engaged_users?: number | null
          first_prd_users?: number | null
          id?: number
          last_updated?: string | null
          total_users?: number | null
        }
        Relationships: []
      }
      hotmart_validation_cache: {
        Row: {
          encrypted_email: string | null
          error_details: Json | null
          error_message: string | null
          expires_at: string
          has_access: boolean
          last_check: string
          phone: string | null
          product_name: string | null
          user_id: string
          validation_method: string | null
          validation_status: string | null
        }
        Insert: {
          encrypted_email?: string | null
          error_details?: Json | null
          error_message?: string | null
          expires_at?: string
          has_access: boolean
          last_check?: string
          phone?: string | null
          product_name?: string | null
          user_id: string
          validation_method?: string | null
          validation_status?: string | null
        }
        Update: {
          encrypted_email?: string | null
          error_details?: Json | null
          error_message?: string | null
          expires_at?: string
          has_access?: boolean
          last_check?: string
          phone?: string | null
          product_name?: string | null
          user_id?: string
          validation_method?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number | null
          code: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      prd_analytics: {
        Row: {
          created_at: string | null
          document_id: string
          event_type: string
          id: string
          metadata: Json | null
          target_user_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          event_type: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prd_analytics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_comments: {
        Row: {
          content: string
          created_at: string | null
          document_id: string
          id: string
          is_implemented: boolean | null
          likes_count: number | null
          parent_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_id: string
          id?: string
          is_implemented?: boolean | null
          likes_count?: number | null
          parent_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_id?: string
          id?: string
          is_implemented?: boolean | null
          likes_count?: number | null
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prd_comments_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prd_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "prd_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_likes: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prd_likes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_limits_config: {
        Row: {
          daily_limit: number
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          daily_limit: number
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          daily_limit?: number
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      prd_permissions_config: {
        Row: {
          can_delete: boolean
          can_toggle_visibility: boolean
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          can_delete?: boolean
          can_toggle_visibility?: boolean
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          can_delete?: boolean
          can_toggle_visibility?: boolean
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      prd_remixes: {
        Row: {
          created_at: string | null
          id: string
          original_id: string
          remix_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          original_id: string
          remix_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          original_id?: string
          remix_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prd_remixes_original_id_fkey"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prd_remixes_remix_id_fkey"
            columns: ["remix_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_usage_tracking: {
        Row: {
          last_request: string
          usage_count: number
          usage_date: string
          user_id: string
        }
        Insert: {
          last_request?: string
          usage_count?: number
          usage_date?: string
          user_id: string
        }
        Update: {
          last_request?: string
          usage_count?: number
          usage_date?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string | null
          id: string
          lgpd_consent_date: string | null
          lgpd_consent_version: string | null
          location: string | null
          name: string | null
          occupation: string | null
          phone: string
          show_email: boolean | null
          social_links: Json | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          lgpd_consent_date?: string | null
          lgpd_consent_version?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          phone: string
          show_email?: boolean | null
          social_links?: Json | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          lgpd_consent_date?: string | null
          lgpd_consent_version?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          phone?: string
          show_email?: boolean | null
          social_links?: Json | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      user_acquisition: {
        Row: {
          created_at: string
          id: string
          landing_page: string | null
          ref_code: string | null
          referrer: string | null
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          landing_page?: string | null
          ref_code?: string | null
          referrer?: string | null
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          landing_page?: string | null
          ref_code?: string | null
          referrer?: string | null
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_type: string
          earned_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      alltime_leaderboard: {
        Row: {
          prds_created: number | null
          rank: number | null
          total_likes: number | null
          total_remixes: number | null
          total_views: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_history_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document_history_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants_voting_status: {
        Row: {
          avatar_url: string | null
          email: string | null
          event_slug: string | null
          has_voted: boolean | null
          name: string | null
          registered_at: string | null
          score_demo: number | null
          score_innovation: number | null
          score_pitch: number | null
          score_viability: number | null
          user_id: string | null
          username: string | null
          voted_at: string | null
          voting_for_team: string | null
          weighted_score: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_slug_fkey"
            columns: ["event_slug"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_team_scores: {
        Row: {
          avg_demo: number | null
          avg_innovation: number | null
          avg_pitch: number | null
          avg_viability: number | null
          avg_weighted_score: number | null
          event_slug: string | null
          team_name: string | null
          total_votes: number | null
        }
        Relationships: []
      }
      hotmart_cache_admin: {
        Row: {
          email: string | null
          expires_at: string | null
          has_access: boolean | null
          last_check: string | null
          phone: string | null
          product_name: string | null
          user_id: string | null
          validation_method: string | null
          validation_status: string | null
        }
        Insert: {
          email?: never
          expires_at?: string | null
          has_access?: boolean | null
          last_check?: string | null
          phone?: string | null
          product_name?: string | null
          user_id?: string | null
          validation_method?: string | null
          validation_status?: string | null
        }
        Update: {
          email?: never
          expires_at?: string | null
          has_access?: boolean | null
          last_check?: string | null
          phone?: string | null
          product_name?: string | null
          user_id?: string | null
          validation_method?: string | null
          validation_status?: string | null
        }
        Relationships: []
      }
      monthly_leaderboard: {
        Row: {
          engagement_score: number | null
          prds_created: number | null
          rank: number | null
          rank_by_likes: number | null
          rank_by_remixes: number | null
          total_likes: number | null
          total_remixes: number | null
          total_views: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_document_history_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_document_history_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      prd_like_stats: {
        Row: {
          document_id: string | null
          total_likes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "prd_likes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "document_history"
            referencedColumns: ["id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          id: string | null
          location: string | null
          name: string | null
          occupation: string | null
          social_links: Json | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          id?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          social_links?: Json | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          id?: string | null
          location?: string | null
          name?: string | null
          occupation?: string | null
          social_links?: Json | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      backfill_missing_profiles: { Args: never; Returns: number }
      calculate_user_badges: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      check_and_increment_prd_usage: {
        Args: { p_daily_limit: number; p_user_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          reset_time: string
        }[]
      }
      check_profile_sync: {
        Args: never
        Returns: {
          missing_profiles: number
          sync_percentage: number
          total_profiles: number
          total_users: number
        }[]
      }
      cleanup_expired_otps: { Args: never; Returns: undefined }
      cleanup_old_prd_usage: { Args: never; Returns: undefined }
      decrement_likes: { Args: { doc_id: string }; Returns: undefined }
      decrypt_hotmart_email: {
        Args: { encrypted_data: string }
        Returns: string
      }
      decrypt_text: {
        Args: { data_encrypted: string; key_text: string }
        Returns: string
      }
      encrypt_text: {
        Args: { data_text: string; key_text: string }
        Returns: string
      }
      extract_description_preview: {
        Args: { document: string }
        Returns: string
      }
      generate_username: { Args: { full_name: string }; Returns: string }
      get_acquisition_metrics: { Args: { start_date: string }; Returns: Json }
      get_active_users_24h: { Args: never; Returns: number }
      get_auth_users_count: { Args: never; Returns: number }
      get_funnel_stats: {
        Args: never
        Returns: {
          engaged_users: number
          total_users: number
          users_with_first_prd: number
        }[]
      }
      get_prd_limit: { Args: { _user_id: string }; Returns: number }
      get_source_performance: {
        Args: { days: number; start_date: string }
        Returns: {
          avg_prds_per_user: number
          engagement_score: number
          first_prd_rate: number
          first_prd_users: number
          public_prd_users: number
          public_rate: number
          source: string
          total_users: number
        }[]
      }
      get_top_users_by_cost: {
        Args: { limit_count?: number }
        Returns: {
          total_cost: number
          total_tokens: number
          user_id: string
        }[]
      }
      get_user_active_event: {
        Args: { p_user_id: string }
        Returns: {
          custom_limit: number
          end_date: string
          event_name: string
          event_slug: string
        }[]
      }
      get_user_by_phone: {
        Args: { search_phone: string }
        Returns: {
          email: string
          id: string
          phone: string
        }[]
      }
      get_user_full_context: {
        Args: { p_user_id: string }
        Returns: {
          active_event_name: string
          active_event_slug: string
          event_custom_limit: number
          event_end_date: string
          roles: string[]
        }[]
      }
      get_user_prd_permissions: {
        Args: { _user_id: string }
        Returns: {
          can_delete: boolean
          can_toggle_visibility: boolean
        }[]
      }
      get_users_with_details: {
        Args: {
          event_filter?: string
          limit_count?: number
          offset_count?: number
          role_filter?: string
          search_term?: string
          source_filter?: string
        }
        Returns: {
          created_at: string
          doc_count: number
          email: string
          last_doc_at: string
          name: string
          phone: string
          product_name: string
          ref_code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
          utm_source: string
        }[]
      }
      get_voting_metrics: {
        Args: { p_event_slug: string; p_team_name: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_event_participant_points: {
        Args: { p_event_slug: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      increment_event_participant_prds: {
        Args: { p_event_slug: string; p_user_id: string }
        Returns: undefined
      }
      increment_event_stats: {
        Args: { p_event_slug: string; p_points: number; p_user_id: string }
        Returns: undefined
      }
      increment_likes: { Args: { doc_id: string }; Returns: undefined }
      increment_remixes: { Args: { doc_id: string }; Returns: undefined }
      increment_views: { Args: { doc_id: string }; Returns: undefined }
      infer_utm_from_acquisition: {
        Args: { p_landing_page: string; p_referrer: string }
        Returns: {
          inferred_medium: string
          inferred_source: string
        }[]
      }
      normalize_name: { Args: { full_name: string }; Returns: string }
      refresh_admin_stats_cache: { Args: never; Returns: undefined }
      refresh_funnel_stats: { Args: never; Returns: undefined }
      validate_document_counters: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "free" | "student" | "admin" | "lifetime" | "event_participant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["free", "student", "admin", "lifetime", "event_participant"],
    },
  },
} as const
