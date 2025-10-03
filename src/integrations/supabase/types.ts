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
      admin_sessions: {
        Row: {
          chat_id: number | null
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          session_token: string | null
          telegram_id: number
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          chat_id?: number | null
          created_at?: string
          expires_at: string
          id?: string
          is_active?: boolean
          session_token?: string | null
          telegram_id: number
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          chat_id?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          session_token?: string | null
          telegram_id?: number
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string
          data_json: Json | null
          id: string
          round_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data_json?: Json | null
          id?: string
          round_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data_json?: Json | null
          id?: string
          round_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      chat_admins: {
        Row: {
          chat_id: number
          created_at: string
          granted_at: string
          granted_by: string | null
          id: string
          is_active: boolean
          role: string
          telegram_id: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          chat_id: number
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: string
          telegram_id: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          chat_id?: number
          created_at?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          is_active?: boolean
          role?: string
          telegram_id?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          chat_id: number
          created_at: string
          id: string
          settings_json: Json | null
          updated_at: string
        }
        Insert: {
          chat_id: number
          created_at?: string
          id?: string
          settings_json?: Json | null
          updated_at?: string
        }
        Update: {
          chat_id?: number
          created_at?: string
          id?: string
          settings_json?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      codes: {
        Row: {
          code: string
          created_at: string
          data_json: Json | null
          expires_at: string
          id: string
          redeemed_at: string | null
          round_id: string | null
          tier: string
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          data_json?: Json | null
          expires_at: string
          id?: string
          redeemed_at?: string | null
          round_id?: string | null
          tier: string
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          data_json?: Json | null
          expires_at?: string
          id?: string
          redeemed_at?: string | null
          round_id?: string | null
          tier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codes_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      game_images: {
        Row: {
          category: string
          created_at: string
          file_path: string
          filename: string
          id: string
          subcategory: string | null
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          file_path: string
          filename: string
          id?: string
          subcategory?: string | null
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          file_path?: string
          filename?: string
          id?: string
          subcategory?: string | null
          version?: number
        }
        Relationships: []
      }
      global_config: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          best_score: number | null
          created_at: string
          id: string
          period: string
          points: number | null
          rounds_played: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          best_score?: number | null
          created_at?: string
          id?: string
          period: string
          points?: number | null
          rounds_played?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          best_score?: number | null
          created_at?: string
          id?: string
          period?: string
          points?: number | null
          rounds_played?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      participation: {
        Row: {
          actions_count: number | null
          created_at: string
          critical_strike: boolean | null
          id: string
          joined_at: string | null
          last_action_at: string | null
          quest_clicked_at: string | null
          quest_done: boolean | null
          quest_points: number | null
          respawn_clicked_at: string | null
          respawn_points: number | null
          respawn_rarity: string | null
          round_id: string | null
          streak_bonus: number | null
          strike_clicked_at: string | null
          strike_meter_value: number | null
          strike_points: number | null
          total_points: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actions_count?: number | null
          created_at?: string
          critical_strike?: boolean | null
          id?: string
          joined_at?: string | null
          last_action_at?: string | null
          quest_clicked_at?: string | null
          quest_done?: boolean | null
          quest_points?: number | null
          respawn_clicked_at?: string | null
          respawn_points?: number | null
          respawn_rarity?: string | null
          round_id?: string | null
          streak_bonus?: number | null
          strike_clicked_at?: string | null
          strike_meter_value?: number | null
          strike_points?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actions_count?: number | null
          created_at?: string
          critical_strike?: boolean | null
          id?: string
          joined_at?: string | null
          last_action_at?: string | null
          quest_clicked_at?: string | null
          quest_done?: boolean | null
          quest_points?: number | null
          respawn_clicked_at?: string | null
          respawn_points?: number | null
          respawn_rarity?: string | null
          round_id?: string | null
          streak_bonus?: number | null
          strike_clicked_at?: string | null
          strike_meter_value?: number | null
          strike_points?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participation_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participation_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          active: boolean | null
          created_at: string
          description: string
          emoji: string
          id: string
          position: number
          tier: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description: string
          emoji: string
          id?: string
          position: number
          tier: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          position?: number
          tier?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reward_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          payload_json: Json | null
          redeemed: boolean | null
          redeemed_at: string | null
          round_id: string | null
          signature: string | null
          telegram_user_id: number
          tier: string
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          payload_json?: Json | null
          redeemed?: boolean | null
          redeemed_at?: string | null
          round_id?: string | null
          signature?: string | null
          telegram_user_id: number
          tier: string
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          payload_json?: Json | null
          redeemed?: boolean | null
          redeemed_at?: string | null
          round_id?: string | null
          signature?: string | null
          telegram_user_id?: number
          tier?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rounds: {
        Row: {
          anchor_message_id: number | null
          chat_id: number
          created_at: string
          end_at: string | null
          id: string
          phase: string | null
          pump_meter: number | null
          results_json: Json | null
          settings_json: Json | null
          start_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          anchor_message_id?: number | null
          chat_id: number
          created_at?: string
          end_at?: string | null
          id?: string
          phase?: string | null
          pump_meter?: number | null
          results_json?: Json | null
          settings_json?: Json | null
          start_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          anchor_message_id?: number | null
          chat_id?: number
          created_at?: string
          end_at?: string | null
          id?: string
          phase?: string | null
          pump_meter?: number | null
          results_json?: Json | null
          settings_json?: Json | null
          start_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string
          first_name: string | null
          id: string
          telegram_id: number
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          id?: string
          telegram_id: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          first_name?: string | null
          id?: string
          telegram_id?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_pump_meter_update: {
        Args: { increment_value: number; max_value?: number; round_id: string }
        Returns: number
      }
      batch_upsert_users: {
        Args: { user_data: Json[] }
        Returns: undefined
      }
      get_game_image_url: {
        Args: { category_param: string; subcategory_param?: string }
        Returns: string
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
