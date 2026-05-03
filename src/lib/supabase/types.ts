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
      achievements: {
        Row: {
          category: string
          created_at: string
          description: string
          gold_reward: number
          icon: string
          id: string
          key: string
          name: string
          threshold: number
          xp_reward: number
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          gold_reward?: number
          icon?: string
          id?: string
          key: string
          name: string
          threshold?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          gold_reward?: number
          icon?: string
          id?: string
          key?: string
          name?: string
          threshold?: number
          xp_reward?: number
        }
        Relationships: []
      }
      challenges: {
        Row: {
          created_at: string
          creator_id: string
          creator_progress: number
          ends_at: string | null
          gold_wager: number
          id: string
          opponent_id: string
          opponent_progress: number
          starts_at: string | null
          status: string
          target: number
          type: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          creator_progress?: number
          ends_at?: string | null
          gold_wager?: number
          id?: string
          opponent_id: string
          opponent_progress?: number
          starts_at?: string | null
          status?: string
          target: number
          type: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          creator_progress?: number
          ends_at?: string | null
          gold_wager?: number
          id?: string
          opponent_id?: string
          opponent_progress?: number
          starts_at?: string | null
          status?: string
          target?: number
          type?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenges_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      completions: {
        Row: {
          completed_at: string
          habit_id: string
          id: string
          note: string | null
          xp_earned: number
        }
        Insert: {
          completed_at?: string
          habit_id: string
          id?: string
          note?: string | null
          xp_earned?: number
        }
        Update: {
          completed_at?: string
          habit_id?: string
          id?: string
          note?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quest_templates: {
        Row: {
          description: string
          difficulty: string
          gold_reward: number
          id: string
          is_active: boolean
          quest_type: string
          target_category: string | null
          target_value: number
          title: string
          xp_reward: number
        }
        Insert: {
          description: string
          difficulty?: string
          gold_reward?: number
          id?: string
          is_active?: boolean
          quest_type: string
          target_category?: string | null
          target_value: number
          title: string
          xp_reward?: number
        }
        Update: {
          description?: string
          difficulty?: string
          gold_reward?: number
          id?: string
          is_active?: boolean
          quest_type?: string
          target_category?: string | null
          target_value?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      duels: {
        Row: {
          challenger_attack_id: string | null
          challenger_hp: number
          challenger_id: string
          created_at: string
          id: string
          loser_xp_bonus: number | null
          opponent_attack_id: string | null
          opponent_hp: number
          opponent_id: string
          resolved_at: string | null
          rounds: Json | null
          status: string
          winner_id: string | null
        }
        Insert: {
          challenger_attack_id?: string | null
          challenger_hp?: number
          challenger_id: string
          created_at?: string
          id?: string
          loser_xp_bonus?: number | null
          opponent_attack_id?: string | null
          opponent_hp?: number
          opponent_id: string
          resolved_at?: string | null
          rounds?: Json | null
          status?: string
          winner_id?: string | null
        }
        Update: {
          challenger_attack_id?: string | null
          challenger_hp?: number
          challenger_id?: string
          created_at?: string
          id?: string
          loser_xp_bonus?: number | null
          opponent_attack_id?: string | null
          opponent_hp?: number
          opponent_id?: string
          resolved_at?: string | null
          rounds?: Json | null
          status?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "duels_challenger_id_fkey"
            columns: ["challenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_opponent_id_fkey"
            columns: ["opponent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "duels_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipped_items: {
        Row: {
          equipped_at: string
          id: string
          item_id: string
          slot: string
          user_id: string
        }
        Insert: {
          equipped_at?: string
          id?: string
          item_id: string
          slot: string
          user_id: string
        }
        Update: {
          equipped_at?: string
          id?: string
          item_id?: string
          slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipped_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipped_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string
          content: Json | null
          created_at: string
          frequency: string
          id: string
          is_archived: boolean
          is_paused: boolean
          name: string
          paused_at: string | null
          user_id: string
        }
        Insert: {
          category?: string
          content?: Json | null
          created_at?: string
          frequency?: string
          id?: string
          is_archived?: boolean
          is_paused?: boolean
          name: string
          paused_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          content?: Json | null
          created_at?: string
          frequency?: string
          id?: string
          is_archived?: boolean
          is_paused?: boolean
          name?: string
          paused_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_theme: string
          best_streak: number
          created_at: string
          email: string
          eye_color: string
          freeze_tokens: number
          gold: number
          hair_color: string
          id: string
          last_duel_at: string | null
          level: number
          push_token: string | null
          rank: string
          revenue_cat_id: string | null
          skin_color: string
          subscription_expires_at: string | null
          subscription_status: string
          username: string
          xp: number
        }
        Insert: {
          active_theme?: string
          best_streak?: number
          created_at?: string
          email: string
          eye_color?: string
          freeze_tokens?: number
          gold?: number
          hair_color?: string
          id: string
          last_duel_at?: string | null
          level?: number
          push_token?: string | null
          rank?: string
          revenue_cat_id?: string | null
          skin_color?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          username: string
          xp?: number
        }
        Update: {
          active_theme?: string
          best_streak?: number
          created_at?: string
          email?: string
          eye_color?: string
          freeze_tokens?: number
          gold?: number
          hair_color?: string
          id?: string
          last_duel_at?: string | null
          level?: number
          push_token?: string | null
          rank?: string
          revenue_cat_id?: string | null
          skin_color?: string
          subscription_expires_at?: string | null
          subscription_status?: string
          username?: string
          xp?: number
        }
        Relationships: []
      }
      purchases: {
        Row: {
          id: string
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_available: boolean
          name: string
          price_gold: number
          rarity: string
          required_level: number
          sprite_key: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string
          id?: string
          is_available?: boolean
          name: string
          price_gold: number
          rarity?: string
          required_level?: number
          sprite_key?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_available?: boolean
          name?: string
          price_gold?: number
          rarity?: string
          required_level?: number
          sprite_key?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          current_count: number
          habit_id: string
          id: string
          last_completed_at: string | null
          longest_count: number
        }
        Insert: {
          current_count?: number
          habit_id: string
          id?: string
          last_completed_at?: string | null
          longest_count?: number
        }
        Update: {
          current_count?: number
          habit_id?: string
          id?: string
          last_completed_at?: string | null
          longest_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "streaks_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: true
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_daily_quests: {
        Row: {
          assigned_date: string
          claimed_at: string | null
          completed_at: string | null
          current_progress: number
          id: string
          is_claimed: boolean
          is_completed: boolean
          template_id: string
          user_id: string
        }
        Insert: {
          assigned_date?: string
          claimed_at?: string | null
          completed_at?: string | null
          current_progress?: number
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          template_id: string
          user_id: string
        }
        Update: {
          assigned_date?: string
          claimed_at?: string | null
          completed_at?: string | null
          current_progress?: number
          id?: string
          is_claimed?: boolean
          is_completed?: boolean
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_quests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "daily_quest_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_daily_quests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_freeze_token: { Args: { p_user_id: string }; Returns: undefined }
      add_gold: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      apply_punishment: {
        Args: { p_gold_loss: number; p_user_id: string; p_xp_loss: number }
        Returns: undefined
      }
      assign_daily_quests: {
        Args: { p_user_id: string }
        Returns: {
          assigned_date: string
          claimed_at: string | null
          completed_at: string | null
          current_progress: number
          id: string
          is_claimed: boolean
          is_completed: boolean
          template_id: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "user_daily_quests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_daily_quest: {
        Args: { p_quest_id: string; p_user_id: string }
        Returns: Json
      }
      create_notification: {
        Args: {
          p_body: string
          p_data?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      increment_xp: {
        Args: { user_id: string; xp_amount: number }
        Returns: undefined
      }
      purchase_item: {
        Args: { p_item_id: string; p_user_id: string }
        Returns: Json
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
