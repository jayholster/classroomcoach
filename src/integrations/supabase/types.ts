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
      after_action_reviews: {
        Row: {
          created_at: string
          event_count: number
          id: string
          model_identifier: string | null
          model_provider: string | null
          organization_id: string | null
          owner_id: string
          session_id: string
          synthesis: Json
        }
        Insert: {
          created_at?: string
          event_count?: number
          id?: string
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id: string
          session_id: string
          synthesis: Json
        }
        Update: {
          created_at?: string
          event_count?: number
          id?: string
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id?: string
          session_id?: string
          synthesis?: Json
        }
        Relationships: [
          {
            foreignKeyName: "after_action_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "after_action_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "rehearsal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          archived_at: string | null
          closes_at: string | null
          created_at: string
          group_id: string | null
          id: string
          instructions: string
          opens_at: string | null
          organization_id: string | null
          owner_id: string
          scenario_version_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          closes_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          instructions?: string
          opens_at?: string | null
          organization_id?: string | null
          owner_id: string
          scenario_version_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          closes_at?: string | null
          created_at?: string
          group_id?: string | null
          id?: string
          instructions?: string
          opens_at?: string | null
          organization_id?: string | null
          owner_id?: string
          scenario_version_id?: string | null
          status?: string
          title?: string
          updated_at?: string
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
            foreignKeyName: "assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
          {
            foreignKeyName: "assurance_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          object_id: string | null
          object_type: string
          object_version_id: string | null
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type: string
          object_version_id?: string | null
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type?: string
          object_version_id?: string | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      context_documents: {
        Row: {
          archived_at: string | null
          byte_size: number
          content_hash: string | null
          created_at: string
          error_message: string | null
          extracted_chars: number
          file_name: string
          id: string
          mime_type: string
          organization_id: string | null
          owner_id: string
          scenario_id: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          byte_size?: number
          content_hash?: string | null
          created_at?: string
          error_message?: string | null
          extracted_chars?: number
          file_name: string
          id?: string
          mime_type?: string
          organization_id?: string | null
          owner_id: string
          scenario_id: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          byte_size?: number
          content_hash?: string | null
          created_at?: string
          error_message?: string | null
          extracted_chars?: number
          file_name?: string
          id?: string
          mime_type?: string
          organization_id?: string | null
          owner_id?: string
          scenario_id?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "context_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          archived_at: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          organization_id: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          organization_id?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_or_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          char_count: number
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          id: string
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "document_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      foundation_versions: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          id: string
          notes: string
          resources: Json
          version: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          resources?: Json
          version: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          resources?: Json
          version?: string
        }
        Relationships: []
      }
      group_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          group_id: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          group_id: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          group_id?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invitations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "courses_or_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      group_memberships: {
        Row: {
          created_at: string
          group_id: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "courses_or_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      model_configurations: {
        Row: {
          active: boolean
          configuration_version: number
          created_at: string
          credentials_reference: string | null
          endpoint: string | null
          id: string
          input_cost_per_mtok: number | null
          max_concurrency: number
          max_output: number | null
          max_retries: number
          model: string
          name: string
          output_cost_per_mtok: number | null
          provider_type: string
          temperature: number | null
          timeout_ms: number
          turn_model: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          configuration_version?: number
          created_at?: string
          credentials_reference?: string | null
          endpoint?: string | null
          id?: string
          input_cost_per_mtok?: number | null
          max_concurrency?: number
          max_output?: number | null
          max_retries?: number
          model: string
          name: string
          output_cost_per_mtok?: number | null
          provider_type?: string
          temperature?: number | null
          timeout_ms?: number
          turn_model?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          configuration_version?: number
          created_at?: string
          credentials_reference?: string | null
          endpoint?: string | null
          id?: string
          input_cost_per_mtok?: number | null
          max_concurrency?: number
          max_output?: number | null
          max_retries?: number
          model?: string
          name?: string
          output_cost_per_mtok?: number | null
          provider_type?: string
          temperature?: number | null
          timeout_ms?: number
          turn_model?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      model_usage_events: {
        Row: {
          attempt: number
          configuration_version: number | null
          created_at: string
          error_kind: string | null
          error_message: string | null
          estimated_cost_usd: number | null
          function_type: string
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model_config_id: string | null
          model_identifier: string
          organization_id: string | null
          output_tokens: number | null
          provider_type: string
          repaired: boolean
          scenario_id: string | null
          session_id: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          attempt?: number
          configuration_version?: number | null
          created_at?: string
          error_kind?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_type: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_config_id?: string | null
          model_identifier?: string
          organization_id?: string | null
          output_tokens?: number | null
          provider_type?: string
          repaired?: boolean
          scenario_id?: string | null
          session_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          attempt?: number
          configuration_version?: number | null
          created_at?: string
          error_kind?: string | null
          error_message?: string | null
          estimated_cost_usd?: number | null
          function_type?: string
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_config_id?: string | null
          model_identifier?: string
          organization_id?: string | null
          output_tokens?: number | null
          provider_type?: string
          repaired?: boolean
          scenario_id?: string | null
          session_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_usage_events_model_config_id_fkey"
            columns: ["model_config_id"]
            isOneToOne: false
            referencedRelation: "model_configurations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_usage_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_usage_events_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_usage_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rehearsal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          is_owner: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_owner?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_owner?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          document_retention_days: number | null
          export_retention_days: number | null
          id: string
          name: string
          session_retention_days: number | null
          slug: string
          updated_at: string
          usage_limit_enabled: boolean
          usage_limit_usd: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          document_retention_days?: number | null
          export_retention_days?: number | null
          id?: string
          name: string
          session_retention_days?: number | null
          slug: string
          updated_at?: string
          usage_limit_enabled?: boolean
          usage_limit_usd?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          document_retention_days?: number | null
          export_retention_days?: number | null
          id?: string
          name?: string
          session_retention_days?: number | null
          slug?: string
          updated_at?: string
          usage_limit_enabled?: boolean
          usage_limit_usd?: number | null
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
          profile_version: number
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
          profile_version?: number
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
          profile_version?: number
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
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rehearsal_sessions: {
        Row: {
          app_release: string | null
          assignment_id: string | null
          ended_at: string | null
          foundation_version: string
          id: string
          organization_id: string | null
          owner_id: string
          review: Json | null
          scenario_id: string
          scenario_title: string
          scenario_version_id: string
          started_at: string
          state_seq: number
        }
        Insert: {
          app_release?: string | null
          assignment_id?: string | null
          ended_at?: string | null
          foundation_version?: string
          id?: string
          organization_id?: string | null
          owner_id: string
          review?: Json | null
          scenario_id: string
          scenario_title?: string
          scenario_version_id: string
          started_at?: string
          state_seq?: number
        }
        Update: {
          app_release?: string | null
          assignment_id?: string | null
          ended_at?: string | null
          foundation_version?: string
          id?: string
          organization_id?: string | null
          owner_id?: string
          review?: Json | null
          scenario_id?: string
          scenario_title?: string
          scenario_version_id?: string
          started_at?: string
          state_seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "rehearsal_sessions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rehearsal_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      research_annotations: {
        Row: {
          author_id: string
          body: string
          created_at: string
          event_id: string | null
          id: string
          project_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          event_id?: string | null
          id?: string
          project_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          event_id?: string | null
          id?: string
          project_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_annotations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "simulation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_annotations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_annotations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rehearsal_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      research_datasets: {
        Row: {
          created_at: string
          created_by: string
          definition: Json
          description: string
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          definition?: Json
          description?: string
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          definition?: Json
          description?: string
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_participants: {
        Row: {
          created_at: string
          id: string
          project_id: string
          pseudonym: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          pseudonym: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          pseudonym?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_participants_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          collection_settings: Json
          created_at: string
          created_by: string | null
          description: string
          id: string
          name: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          collection_settings?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          collection_settings?: Json
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      research_scopes: {
        Row: {
          created_at: string
          granted_by: string | null
          group_id: string | null
          id: string
          organization_id: string | null
          project_id: string
          scenario_id: string | null
          scope_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          group_id?: string | null
          id?: string
          organization_id?: string | null
          project_id: string
          scenario_id?: string | null
          scope_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          group_id?: string | null
          id?: string
          organization_id?: string | null
          project_id?: string
          scenario_id?: string | null
          scope_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_scopes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "courses_or_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_scopes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_scopes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_scopes_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      research_snapshots: {
        Row: {
          created_at: string
          created_by: string
          dataset_id: string | null
          definition: Json
          field_schema: Json
          id: string
          name: string
          payload: Json
          project_id: string
          row_count: number
          version_info: Json
        }
        Insert: {
          created_at?: string
          created_by: string
          dataset_id?: string | null
          definition?: Json
          field_schema?: Json
          id?: string
          name: string
          payload?: Json
          project_id: string
          row_count?: number
          version_info?: Json
        }
        Update: {
          created_at?: string
          created_by?: string
          dataset_id?: string | null
          definition?: Json
          field_schema?: Json
          id?: string
          name?: string
          payload?: Json
          project_id?: string
          row_count?: number
          version_info?: Json
        }
        Relationships: [
          {
            foreignKeyName: "research_snapshots_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "research_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "research_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
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
          organization_id: string | null
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
          organization_id?: string | null
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
          organization_id?: string | null
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
            foreignKeyName: "scenario_participants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          app_release: string | null
          context_document_ids: string[]
          created_at: string
          created_by: string | null
          creator_label: string | null
          foundation_version: string
          id: string
          model_config_id: string | null
          model_identifier: string | null
          model_provider: string | null
          organization_id: string | null
          owner_id: string
          scenario_id: string
          source_references: Json
          spec: Json
          version_label: string
        }
        Insert: {
          app_release?: string | null
          context_document_ids?: string[]
          created_at?: string
          created_by?: string | null
          creator_label?: string | null
          foundation_version: string
          id?: string
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id: string
          scenario_id: string
          source_references?: Json
          spec: Json
          version_label: string
        }
        Update: {
          app_release?: string | null
          context_document_ids?: string[]
          created_at?: string
          created_by?: string | null
          creator_label?: string | null
          foundation_version?: string
          id?: string
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id?: string
          scenario_id?: string
          source_references?: Json
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
            foreignKeyName: "scenario_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          archived_at: string | null
          created_at: string
          created_by: string | null
          difficult_moment: string
          draft_spec: Json | null
          generation_error: string | null
          id: string
          is_sample: boolean
          model_identifier: string | null
          model_provider: string | null
          organization_id: string | null
          owner_id: string
          practice_purpose: string
          practicing_role: string
          setting_label: string
          specifics: string
          status: string
          student_count: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          difficult_moment?: string
          draft_spec?: Json | null
          generation_error?: string | null
          id?: string
          is_sample?: boolean
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id: string
          practice_purpose?: string
          practicing_role?: string
          setting_label?: string
          specifics?: string
          status?: string
          student_count?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          difficult_moment?: string
          draft_spec?: Json | null
          generation_error?: string | null
          id?: string
          is_sample?: boolean
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id?: string
          practice_purpose?: string
          practicing_role?: string
          setting_label?: string
          specifics?: string
          status?: string
          student_count?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulation_events: {
        Row: {
          app_release: string | null
          created_at: string
          error_message: string | null
          foundation_version: string
          id: string
          kind: string
          latency_ms: number | null
          model_config_id: string | null
          model_identifier: string | null
          model_provider: string | null
          organization_id: string | null
          owner_id: string
          prior_state: Json | null
          resulting_state: Json | null
          scenario_id: string
          scenario_version_id: string
          sequence: number
          session_id: string
          state_update: Json | null
          status: string
          user_action: string | null
          visible_response: Json | null
        }
        Insert: {
          app_release?: string | null
          created_at?: string
          error_message?: string | null
          foundation_version?: string
          id?: string
          kind?: string
          latency_ms?: number | null
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id: string
          prior_state?: Json | null
          resulting_state?: Json | null
          scenario_id: string
          scenario_version_id: string
          sequence: number
          session_id: string
          state_update?: Json | null
          status?: string
          user_action?: string | null
          visible_response?: Json | null
        }
        Update: {
          app_release?: string | null
          created_at?: string
          error_message?: string | null
          foundation_version?: string
          id?: string
          kind?: string
          latency_ms?: number | null
          model_config_id?: string | null
          model_identifier?: string | null
          model_provider?: string | null
          organization_id?: string | null
          owner_id?: string
          prior_state?: Json | null
          resulting_state?: Json | null
          scenario_id?: string
          scenario_version_id?: string
          sequence?: number
          session_id?: string
          state_update?: Json | null
          status?: string
          user_action?: string | null
          visible_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "simulation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string | null
          owner_id: string
          seq: number
          session_id: string
          state: Json
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          owner_id: string
          seq?: number
          session_id: string
          state: Json
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          owner_id?: string
          seq?: number
          session_id?: string
          state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "simulation_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
      commit_simulation_event: {
        Args: {
          _actor_id: string
          _app_release?: string
          _expected_sequence: number
          _foundation_version: string
          _kind: string
          _model_config_id: string
          _model_identifier: string
          _model_provider: string
          _prior_state: Json
          _resulting_state: Json
          _session_id: string
          _state_update: Json
          _user_action: string
          _visible_response: Json
        }
        Returns: {
          app_release: string | null
          created_at: string
          error_message: string | null
          foundation_version: string
          id: string
          kind: string
          latency_ms: number | null
          model_config_id: string | null
          model_identifier: string | null
          model_provider: string | null
          organization_id: string | null
          owner_id: string
          prior_state: Json | null
          resulting_state: Json | null
          scenario_id: string
          scenario_version_id: string
          sequence: number
          session_id: string
          state_update: Json | null
          status: string
          user_action: string | null
          visible_response: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "simulation_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      commit_simulation_turn: {
        Args: {
          _app_release?: string
          _expected_sequence: number
          _foundation_version: string
          _model_config_id: string
          _model_identifier: string
          _model_provider: string
          _prior_state: Json
          _resulting_state: Json
          _session_id: string
          _state_update: Json
          _user_action: string
          _visible_response: Json
        }
        Returns: {
          app_release: string | null
          created_at: string
          error_message: string | null
          foundation_version: string
          id: string
          kind: string
          latency_ms: number | null
          model_config_id: string | null
          model_identifier: string | null
          model_provider: string | null
          organization_id: string | null
          owner_id: string
          prior_state: Json | null
          resulting_state: Json | null
          scenario_id: string
          scenario_version_id: string
          sequence: number
          session_id: string
          state_update: Json | null
          status: string
          user_action: string | null
          visible_response: Json | null
        }
        SetofOptions: {
          from: "*"
          to: "simulation_events"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
