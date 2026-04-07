export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      access_tokens: {
        Row: {
          created_at: string;
          email: string;
          expires_at: string | null;
          id: string;
          plan: string;
          status: string;
          stripe_session_id: string | null;
          stripe_subscription_id: string | null;
          token: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          email: string;
          expires_at?: string | null;
          id?: string;
          plan: string;
          status?: string;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          token?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string;
          expires_at?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_session_id?: string | null;
          stripe_subscription_id?: string | null;
          token?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      guides: {
        Row: {
          created_at: string;
          display_order: number;
          follow_up_questions: string[];
          id: string;
          short_description: string;
          slug: string;
          source_url: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          follow_up_questions?: string[];
          id?: string;
          short_description: string;
          slug: string;
          source_url?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          follow_up_questions?: string[];
          id?: string;
          short_description?: string;
          slug?: string;
          source_url?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      nura_embeddings: {
        Row: {
          content: string;
          context_id: string;
          context_type: string;
          embedding: number[];
          id: string;
          source_url: string;
          title: string;
        };
        Insert: {
          content: string;
          context_id: string;
          context_type: string;
          embedding?: number[];
          id: string;
          source_url?: string;
          title: string;
        };
        Update: {
          content?: string;
          context_id?: string;
          context_type?: string;
          embedding?: number[];
          id?: string;
          source_url?: string;
          title?: string;
        };
        Relationships: [];
      };
      recipe_tags: {
        Row: {
          recipe_id: string;
          tag_id: string;
        };
        Insert: {
          recipe_id: string;
          tag_id: string;
        };
        Update: {
          recipe_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_tags_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recipe_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      recipes: {
        Row: {
          created_at: string;
          display_order: number;
          how_to_make: Json;
          id: string;
          image_url: string | null;
          ingredients: Json;
          inside_tip: string;
          is_todays_recipe: boolean;
          preview_ingredients: string[];
          recipe_section_title: string;
          short_description: string;
          source_url: string;
          title: string;
          updated_at: string;
          why_it_works: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          how_to_make?: Json;
          id?: string;
          image_url?: string | null;
          ingredients?: Json;
          inside_tip: string;
          is_todays_recipe?: boolean;
          preview_ingredients?: string[];
          recipe_section_title: string;
          short_description: string;
          source_url?: string;
          title: string;
          updated_at?: string;
          why_it_works: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          how_to_make?: Json;
          id?: string;
          image_url?: string | null;
          ingredients?: Json;
          inside_tip?: string;
          is_todays_recipe?: boolean;
          preview_ingredients?: string[];
          recipe_section_title?: string;
          short_description?: string;
          source_url?: string;
          title?: string;
          updated_at?: string;
          why_it_works?: string;
        };
        Relationships: [];
      };
      risk_items: {
        Row: {
          cancer_type: string;
          created_at: string;
          display_order: number;
          guide_id: string;
          id: string;
          image_url: string | null;
          risk_label: string;
          risk_level: number;
          risks_from: string;
          short_description: string;
          title: string;
        };
        Insert: {
          cancer_type: string;
          created_at?: string;
          display_order?: number;
          guide_id: string;
          id?: string;
          image_url?: string | null;
          risk_label: string;
          risk_level: number;
          risks_from: string;
          short_description: string;
          title: string;
        };
        Update: {
          cancer_type?: string;
          created_at?: string;
          display_order?: number;
          guide_id?: string;
          id?: string;
          image_url?: string | null;
          risk_label?: string;
          risk_level?: number;
          risks_from?: string;
          short_description?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "risk_items_guide_id_fkey";
            columns: ["guide_id"];
            isOneToOne: false;
            referencedRelation: "guides";
            referencedColumns: ["id"];
          },
        ];
      };
      tags: {
        Row: {
          created_at: string;
          display_order: number;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          display_order?: number;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          display_order?: number;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_embeddings: {
        Args: {
          match_context_id: string;
          match_count?: number;
          min_score?: number;
          query_embedding: number[];
        };
        Returns: {
          content: string;
          id: string;
          similarity: number;
          source_url: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
