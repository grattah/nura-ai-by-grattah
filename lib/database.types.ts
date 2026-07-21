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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_tokens: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          plan: string
          status: string
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          token: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          plan: string
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          token?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          action: string | null
          created_at: string
          id: number
          recipe_id: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          id?: number
          recipe_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          id?: number
          recipe_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_members: {
        Row: {
          created_at: string
          email: string | null
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          invited_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          likes: number
          parent_id: string | null
          recipe_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes?: number
          parent_id?: string | null
          recipe_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes?: number
          parent_id?: string | null
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          created_at: string
          delta: number
          id: number
          label: string | null
          reason: string
          stripe_session_id: string | null
          tokens: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: never
          label?: string | null
          reason: string
          stripe_session_id?: string | null
          tokens?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: never
          label?: string | null
          reason?: string
          stripe_session_id?: string | null
          tokens?: number | null
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          created_at: string
          extra_purchased: number
          extra_used: number
          free_granted: number
          free_used: number
          last_purchase_at: string | null
          updated_at: string
          user_id: string
          week_anchor: string | null
          weekly_used: number
        }
        Insert: {
          created_at?: string
          extra_purchased?: number
          extra_used?: number
          free_granted?: number
          free_used?: number
          last_purchase_at?: string | null
          updated_at?: string
          user_id: string
          week_anchor?: string | null
          weekly_used?: number
        }
        Update: {
          created_at?: string
          extra_purchased?: number
          extra_used?: number
          free_granted?: number
          free_used?: number
          last_purchase_at?: string | null
          updated_at?: string
          user_id?: string
          week_anchor?: string | null
          weekly_used?: number
        }
        Relationships: []
      }
      daily_tips: {
        Row: {
          created_at: string
          day: string
          description: string
          image_url: string | null
          title: string
        }
        Insert: {
          created_at?: string
          day: string
          description: string
          image_url?: string | null
          title: string
        }
        Update: {
          created_at?: string
          day?: string
          description?: string
          image_url?: string | null
          title?: string
        }
        Relationships: []
      }
      drug_interaction_buckets: {
        Row: {
          buckets: string[]
          drug_name: string | null
          resolved_at: string
          rxcui: string
        }
        Insert: {
          buckets?: string[]
          drug_name?: string | null
          resolved_at?: string
          rxcui: string
        }
        Update: {
          buckets?: string[]
          drug_name?: string | null
          resolved_at?: string
          rxcui?: string
        }
        Relationships: []
      }
      free_trial_usage: {
        Row: {
          created_at: string
          item_id: string
          surface: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          surface: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          surface?: string
          user_id?: string
        }
        Relationships: []
      }
      guides: {
        Row: {
          created_at: string
          display_order: number
          follow_up_questions: string[]
          id: string
          short_description: string
          slug: string
          source_url: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          follow_up_questions?: string[]
          id?: string
          short_description: string
          slug: string
          source_url?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          follow_up_questions?: string[]
          id?: string
          short_description?: string
          slug?: string
          source_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_profiles: {
        Row: {
          age_range: string | null
          allergies: string[]
          allergies_other: string | null
          biological_sex: string | null
          conditions: string[]
          conditions_other: string | null
          consent_given_at: string | null
          consent_version: string | null
          created_at: string
          dietary_pattern: string | null
          goals: string[]
          medications: Json
          pregnancy_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_range?: string | null
          allergies?: string[]
          allergies_other?: string | null
          biological_sex?: string | null
          conditions?: string[]
          conditions_other?: string | null
          consent_given_at?: string | null
          consent_version?: string | null
          created_at?: string
          dietary_pattern?: string | null
          goals?: string[]
          medications?: Json
          pregnancy_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_range?: string | null
          allergies?: string[]
          allergies_other?: string | null
          biological_sex?: string | null
          conditions?: string[]
          conditions_other?: string | null
          consent_given_at?: string | null
          consent_version?: string | null
          created_at?: string
          dietary_pattern?: string | null
          goals?: string[]
          medications?: Json
          pregnancy_status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ingredient_interactions: {
        Row: {
          aliases: string[]
          bucket: string
          created_at: string
          id: string
          ingredient_key: string
          layperson_note: string
          severity: string
          source: string | null
          supplement_only: boolean
        }
        Insert: {
          aliases?: string[]
          bucket: string
          created_at?: string
          id?: string
          ingredient_key: string
          layperson_note: string
          severity: string
          source?: string | null
          supplement_only?: boolean
        }
        Update: {
          aliases?: string[]
          bucket?: string
          created_at?: string
          id?: string
          ingredient_key?: string
          layperson_note?: string
          severity?: string
          source?: string | null
          supplement_only?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nura_embeddings: {
        Row: {
          content: string
          context_id: string
          context_type: string
          embedding: string | null
          id: string
          source_url: string
          title: string
        }
        Insert: {
          content: string
          context_id: string
          context_type: string
          embedding?: string | null
          id: string
          source_url?: string
          title: string
        }
        Update: {
          content?: string
          context_id?: string
          context_type?: string
          embedding?: string | null
          id?: string
          source_url?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          has_seen_free_tokens: boolean
          id: string
          is_admin: boolean
          username: string | null
          welcomed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          has_seen_free_tokens?: boolean
          id: string
          is_admin?: boolean
          username?: string | null
          welcomed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          has_seen_free_tokens?: boolean
          id?: string
          is_admin?: boolean
          username?: string | null
          welcomed_at?: string | null
        }
        Relationships: []
      }
      rag_raw: {
        Row: {
          created_at: string
          display_order: number | null
          id: number
          recipe_title: string | null
          sources: Json | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: number
          recipe_title?: string | null
          sources?: Json | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: number
          recipe_title?: string | null
          sources?: Json | null
        }
        Relationships: []
      }
      ranking_weights: {
        Row: {
          action: string
          weight: number
        }
        Insert: {
          action: string
          weight: number
        }
        Update: {
          action?: string
          weight?: number
        }
        Relationships: []
      }
      recipe_categories: {
        Row: {
          category_id: string
          created_at: string
          qualified: boolean
          recipe_id: string
          score: number
          via_trace: boolean
        }
        Insert: {
          category_id: string
          created_at?: string
          qualified?: boolean
          recipe_id: string
          score: number
          via_trace?: boolean
        }
        Update: {
          category_id?: string
          created_at?: string
          qualified?: boolean
          recipe_id?: string
          score?: number
          via_trace?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recipe_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_categories_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_likes: {
        Row: {
          created_at: string | null
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_likes_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_personalized_scores: {
        Row: {
          adjusted: boolean
          applied_modifiers: Json
          base_final_score: number | null
          created_at: string
          personalized_final_score: number | null
          profile_updated_at: string
          recipe_id: string
          safety_alerts: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          adjusted?: boolean
          applied_modifiers?: Json
          base_final_score?: number | null
          created_at?: string
          personalized_final_score?: number | null
          profile_updated_at: string
          recipe_id: string
          safety_alerts?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          adjusted?: boolean
          applied_modifiers?: Json
          base_final_score?: number | null
          created_at?: string
          personalized_final_score?: number | null
          profile_updated_at?: string
          recipe_id?: string
          safety_alerts?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_personalized_scores_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_tags: {
        Row: {
          recipe_id: string
          score: number | null
          tag_id: string
        }
        Insert: {
          recipe_id: string
          score?: number | null
          tag_id: string
        }
        Update: {
          recipe_id?: string
          score?: number | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          category_overrides: Json | null
          comments: number
          created_at: string
          created_by: string | null
          display_order: number
          drink_type: string
          final_score: number | null
          follow_up_questions: string[] | null
          generated_from: string | null
          how_to_make: Json
          id: string
          image_url: string | null
          ingredient_score: number | null
          ingredients: Json
          inside_tip: string
          interaction_ingredients: Json
          is_todays_recipe: boolean
          last_engaged_at: string | null
          likes: number | null
          nutrition: Json | null
          nutrition_rating: string | null
          nutrition_score: number | null
          preparation: string | null
          preview_ingredients: string[]
          recipe_section_title: string
          saves: number
          shares: number
          short_description: string
          source_url: string
          status: string
          title: string
          track: string | null
          track_reason: string | null
          updated_at: string
          weighted_score: number
          why_it_works: string
        }
        Insert: {
          category_overrides?: Json | null
          comments?: number
          created_at?: string
          created_by?: string | null
          display_order?: number
          drink_type?: string
          final_score?: number | null
          follow_up_questions?: string[] | null
          generated_from?: string | null
          how_to_make?: Json
          id?: string
          image_url?: string | null
          ingredient_score?: number | null
          ingredients?: Json
          inside_tip: string
          interaction_ingredients?: Json
          is_todays_recipe?: boolean
          last_engaged_at?: string | null
          likes?: number | null
          nutrition?: Json | null
          nutrition_rating?: string | null
          nutrition_score?: number | null
          preparation?: string | null
          preview_ingredients?: string[]
          recipe_section_title: string
          saves?: number
          shares?: number
          short_description: string
          source_url?: string
          status?: string
          title: string
          track?: string | null
          track_reason?: string | null
          updated_at?: string
          weighted_score?: number
          why_it_works: string
        }
        Update: {
          category_overrides?: Json | null
          comments?: number
          created_at?: string
          created_by?: string | null
          display_order?: number
          drink_type?: string
          final_score?: number | null
          follow_up_questions?: string[] | null
          generated_from?: string | null
          how_to_make?: Json
          id?: string
          image_url?: string | null
          ingredient_score?: number | null
          ingredients?: Json
          inside_tip?: string
          interaction_ingredients?: Json
          is_todays_recipe?: boolean
          last_engaged_at?: string | null
          likes?: number | null
          nutrition?: Json | null
          nutrition_rating?: string | null
          nutrition_score?: number | null
          preparation?: string | null
          preview_ingredients?: string[]
          recipe_section_title?: string
          saves?: number
          shares?: number
          short_description?: string
          source_url?: string
          status?: string
          title?: string
          track?: string | null
          track_reason?: string | null
          updated_at?: string
          weighted_score?: number
          why_it_works?: string
        }
        Relationships: []
      }
      risk_items: {
        Row: {
          cancer_type: string
          created_at: string
          display_order: number
          guide_id: string
          id: string
          image_url: string | null
          risk_label: string
          risk_level: number
          risks_from: string
          short_description: string
          title: string
        }
        Insert: {
          cancer_type: string
          created_at?: string
          display_order?: number
          guide_id: string
          id?: string
          image_url?: string | null
          risk_label: string
          risk_level: number
          risks_from: string
          short_description: string
          title: string
        }
        Update: {
          cancer_type?: string
          created_at?: string
          display_order?: number
          guide_id?: string
          id?: string
          image_url?: string | null
          risk_label?: string
          risk_level?: number
          risks_from?: string
          short_description?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_items_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          term: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          term: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          term?: string
          user_id?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created: string
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          created: string
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          created?: string
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string | null
          expires_at: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_session_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string | null
          expires_at?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_session_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      category_drink_types: {
        Args: { p_slug: string }
        Returns: {
          drink_type: string
        }[]
      }
      check_email_status: {
        Args: { p_email: string }
        Returns: {
          account_exists: boolean
          has_password: boolean
        }[]
      }
      claim_free_tokens_redirect: { Args: never; Returns: boolean }
      free_use_count: {
        Args: { p_surface: string; p_user: string }
        Returns: number
      }
      get_token_state: { Args: { p_user: string }; Returns: Json }
      increment_recipe_shares: { Args: { rid: string }; Returns: undefined }
      match_embeddings: {
        Args: {
          match_context_id: string
          match_count?: number
          min_score?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          similarity: number
          source_url: string
        }[]
      }
      purchase_tokens: {
        Args: {
          p_label?: string
          p_reason: string
          p_session_id?: string
          p_units: number
          p_user: string
        }
        Returns: Json
      }
      record_free_use: {
        Args: { p_item?: string; p_surface: string; p_user: string }
        Returns: number
      }
      refresh_recipe_scores: { Args: never; Returns: undefined }
      spend_tokens: {
        Args: {
          p_label?: string
          p_raw_tokens?: number
          p_reason: string
          p_units: number
          p_user: string
        }
        Returns: Json
      }
      token_state_json: {
        Args: { r: Database["public"]["Tables"]["credits"]["Row"] }
        Returns: Json
      }
      top_searched_concerns: {
        Args: { result_limit?: number }
        Returns: {
          searchers: number
          term: string
        }[]
      }
      try_free_view: {
        Args: {
          p_cap: number
          p_item: string
          p_surface: string
          p_user: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
