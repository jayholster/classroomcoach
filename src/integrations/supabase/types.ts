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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          owner_id: string
          scenario_version_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          owner_id: string
          scenario_version_id?: string | null
          title?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          owner_id?: string
          scenario_version_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "courses_or_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_scenario_version_id_fkey"
            columns: ["scenario_version_id"]
            isOneToOne: false
            referencedRelation: "scenario_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      assurance_runs: {
        Row: {
          checks: Json
          created_at: string
          error_message: string | null
          event_id: string
          id: string
          model_identifier: string | null
          model_provider: string | null
          run_by: string
          state_update: Json | null
          visible_response: Json | null
        }
        Insert: {
          checks?: Json
          created_at?: string
          error_message?: string | null
          event_id: string
          id?: string
          model_identifier?: string | null
          model_provider?: string | null
          run_by: string
          state_update?: Json | null
          visible_response?: Json | null
        }
        Update: {
          checks?: Json
          created_at?: string
          error_message?: string | null
          event_id?: string
          id?: string
          model_identifier?: string | null
          model_provider?: string | null
          run_by?: string
          state_update?: Json | null
          visible_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assurance_runs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "simulation_events"
            referencedColumns: ["id"]
          },
        ]
      }
      context_documents: {
        Row: {
          byte_size: number
          created_at: string
          error_message: string | null
          extracted_chars: number
          file_name: string
          id: string
          mime_type: string
          owner_id: string
          scenario_id: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          byte_size?: number
          created_at?: string
          error_message?: string | null
          extracted_chars?: number
          file_name: string
          id?: string
          mime_type?: string
          owner_id: string
          scenario_id: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          byte_size?: number
          created_at?: string
          error_message?: string | null
          extracted_chars?: number
          file_name?: string
          id?: string
          mime_type?: string
          owner_id?: string
          scenario_id?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_documents_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      courses_or_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      document_chunks: {
        Row: {
          char_count: number
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          id: string
          owner_id: string
          scenario_id: string
          source_name: string
        }
        Insert: {
          char_count?: number
          chunk_index: number
          content: string
          created_at?: string
          document_id: string
          id?: string
          owner_id: string
          scenario_id: string
          source_name: string
        }
        Update: {
          char_count?: number
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          id?: string
          owner_id?: string
          scenario_id?: string
          source_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "context_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      flags: {
        Row: {
          created_at: string
          event_id: string
          id: string
          note: string | null
          reason: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          note?: string | null
          reason: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          note?: string | null
          reason?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flags_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "simulation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flags_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rehearsal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      foundation_resources: {
        Row: {
          active: boolean
          body: string
          governs: string
          id: string
          key: string
          name: string
          sort_order: number
          updated_at: string
          version: string
        }
        Insert: {
          active?: boolean
          body: string
          governs: string
          id?: string
          key: string
          name: string
          sort_order?: number
          updated_at?: string
          version?: string
        }
        Update: {
          active?: boolean
          body?: string
          governs?: string
          id?: string
          key?: string
          name?: string
          sort_order?: number
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      model_configurations: {
        Row: {
          active: boolean
          created_at: string
          endpoint: string | null
          id: string
          max_output: number | null
          model: string
          name: string
          provider_type: string
          temperature: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          endpoint?: string | null
          id?: string
          max_output?: number | null
          model: string
          name: string
          provider_type?: string
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          endpoint?: string | null
          id?: string
          max_output?: number | null
          model?: string
          name?: string
          provider_type?: string
          temperature?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      people_profiles: {
        Row: {
          background: string
          close_with: string[]
          descriptor: string
          grade_label: string
          hidden_from_teacher: string[]
          id: string
          interests: string[]
          key: string
          knows: string[]
          name: string
          participant_type: string
          ses: string
          source_reference: string
          tendencies: string[]
          tension_with: string[]
          updated_at: string
        }
        Insert: {
          background?: string
          close_with?: string[]
          descriptor?: string
          grade_label: string
          hidden_from_teacher?: string[]
          id?: string
          interests?: string[]
          key: string
          knows?: string[]
          name: string
          participant_type: string
          ses?: string
          source_reference?: string
          tendencies?: string[]
          tension_with?: string[]
          updated_at?: string
        }
        Update: {
          background?: string
          close_with?: string[]
          descriptor?: string
          grade_label?: string
          hidden_from_teacher?: string[]
          id?: string
          interests?: string[]
          key?: string
          knows?: string[]
          name?: string
          participant_type?: string
          ses?: string
          source_reference?: string
          tendencies?: string[]
          tension_with?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      rehearsal_sessions: {
        Row: {
          ended_at: string | null
          id: string
          owner_id: string
          review: Json | null
          scenario_id: string
          scenario_title: string
          scenario_version_id: string
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          id?: string
          owner_id: string
          review?: Json | null
          scenario_id: string
          scenario_title?: string
          scenario_version_id: string
          started_at?: string
        }
        Update: {
          ended_at?: string | null
          id?: string
          owner_id?: string
          review?: Json | null
          scenario_id?: string
          scenario_title?: string
          scenario_version_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rehearsal_sessions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehearsal_sessions_scenario_version_id_fkey"
            columns: ["scenario_version_id"]
            isOneToOne: false
            referencedRelation: "scenario_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_participants: {
        Row: {
          current_concern: string
          current_goal: string
          id: string
          known_information: string[]
          latent_information: string[]
          name: string
          owner_id: string
          participant_id: string
          profile_source_id: string | null
          provenance: Json
          role: string
          scenario_relevant_background: string
          scenario_version_id: string
        }
        Insert: {
          current_concern?: string
          current_goal?: string
          id?: string
          known_information?: string[]
          latent_information?: string[]
          name: string
          owner_id: string
          participant_id: string
          profile_source_id?: string | null
          provenance?: Json
          role?: string
          scenario_relevant_background?: string
          scenario_version_id: string
        }
        Update: {
          current_concern?: string
          current_goal?: string
          id?: string
          known_information?: string[]
          latent_information?: string[]
          name?: string
          owner_id?: string
          participant_id?: string
          profile_source_id?: string | null
          provenance?: Json
          role?: string
          scenario_relevant_background?: string
          scenario_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_participants_scenario_version_id_fkey"
            columns: ["scenario_version_id"]
            isOneToOne: false
            referencedRelation: "scenario_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      scenario_versions: {
        Row: {
          context_document_ids: string[]
          created_at: string
          created_by: string | null
          creator_label: string | null
          foundation_version: string
          id: string
          model_config_id: string | null
          model_identifier: string | null
          model_provider: string | null
          owner_id: string
          scenario_id: string
          spec: Json
          version_label: string
        }
        Insert: {
          context_document_ids?: string[]
          created_at?: string
          created_by?: string | null
          creator_label?: string | null
          foundation_version: string
          id?: string
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          owner_id: string
          scenario_id: string
          spec: Json
          version_label: string
        }
        Update: {
          context_document_ids?: string[]
          created_at?: string
          created_by?: string | null
          creator_label?: string | null
          foundation_version?: string
          id?: string
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          owner_id?: string
          scenario_id?: string
          spec?: Json
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenario_versions_model_config_id_fkey"
            columns: ["model_config_id"]
            isOneToOne: false
            referencedRelation: "model_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenario_versions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      scenarios: {
        Row: {
          created_at: string
          draft_spec: Json | null
          generation_error: string | null
          id: string
          model_identifier: string | null
          model_provider: string | null
          owner_id: string
          practice_purpose: string
          practicing_role: string
          setting_label: string
          specifics: string
          status: string
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_spec?: Json | null
          generation_error?: string | null
          id?: string
          model_identifier?: string | null
          model_provider?: string | null
          owner_id: string
          practice_purpose?: string
          practicing_role?: string
          setting_label?: string
          specifics?: string
          status?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_spec?: Json | null
          generation_error?: string | null
          id?: string
          model_identifier?: string | null
          model_provider?: string | null
          owner_id?: string
          practice_purpose?: string
          practicing_role?: string
          setting_label?: string
          specifics?: string
          status?: string
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      simulation_events: {
        Row: {
          created_at: string
          foundation_version: string
          id: string
          kind: string
          model_config_id: string | null
          model_identifier: string | null
          model_provider: string | null
          owner_id: string
          prior_state: Json | null
          resulting_state: Json | null
          scenario_id: string
          scenario_version_id: string
          sequence: number
          session_id: string
          state_update: Json | null
          user_action: string | null
          visible_response: Json | null
        }
        Insert: {
          created_at?: string
          foundation_version?: string
          id?: string
          kind?: string
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          owner_id: string
          prior_state?: Json | null
          resulting_state?: Json | null
          scenario_id: string
          scenario_version_id: string
          sequence: number
          session_id: string
          state_update?: Json | null
          user_action?: string | null
          visible_response?: Json | null
        }
        Update: {
          created_at?: string
          foundation_version?: string
          id?: string
          kind?: string
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          owner_id?: string
          prior_state?: Json | null
          resulting_state?: Json | null
          scenario_id?: string
          scenario_version_id?: string
          sequence?: number
          session_id?: string
          state_update?: Json | null
          user_action?: string | null
          visible_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rehearsal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_states: {
        Row: {
          id: string
          owner_id: string
          session_id: string
          state: Json
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          session_id: string
          state: Json
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          session_id?: string
          state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_states_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "rehearsal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "educator" | "learner"
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
      app_role: ["admin", "educator", "learner"],
    },
  },
} as const
