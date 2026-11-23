export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: boolean
          min_client_version: string
          updated_at: string
        }
        Insert: {
          id?: boolean
          min_client_version?: string
          updated_at?: string
        }
        Update: {
          id?: boolean
          min_client_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_addresses: {
        Row: {
          city: string
          client_id: string
          company_id: string
          complement: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          district: string | null
          id: string
          is_primary: boolean
          label: string | null
          number: string | null
          reference: string | null
          state: string
          street: string
          zip_code: string | null
        }
        Insert: {
          city: string
          client_id: string
          company_id: string
          complement?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          district?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          number?: string | null
          reference?: string | null
          state: string
          street: string
          zip_code?: string | null
        }
        Update: {
          city?: string
          client_id?: string
          company_id?: string
          complement?: string | null
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          district?: string | null
          id?: string
          is_primary?: boolean
          label?: string | null
          number?: string | null
          reference?: string | null
          state?: string
          street?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_addresses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_addresses_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          document: string | null
          email: string | null
          id: string
          name: string
          next_order_number: number
          phone: string | null
          timezone: string
        }
        Insert: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name: string
          next_order_number?: number
          phone?: string | null
          timezone?: string
        }
        Update: {
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          next_order_number?: number
          phone?: string | null
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          delete_reason?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_uploads: {
        Row: {
          company_id: string
          created_at: string
          execution_id: string
          file_size: number
          id: string
          service_order_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          execution_id: string
          file_size: number
          id?: string
          service_order_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          execution_id?: string
          file_size?: number
          id?: string
          service_order_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_uploads_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          is_platform_admin: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          is_platform_admin?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          is_platform_admin?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_order_assignees: {
        Row: {
          assigned_at: string
          assigned_by: string
          company_id: string
          created_at: string
          id: string
          service_order_id: string
          unassigned_at: string | null
          unassigned_by: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          company_id: string
          created_at?: string
          id?: string
          service_order_id: string
          unassigned_at?: string | null
          unassigned_by?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          company_id?: string
          created_at?: string
          id?: string
          service_order_id?: string
          unassigned_at?: string | null
          unassigned_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_assignees_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_assignees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_assignees_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_assignees_unassigned_by_fkey"
            columns: ["unassigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_assignees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_executions: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          client_started_at: string | null
          client_submitted_at: string
          company_id: string
          converted_to_supplement: boolean
          created_at: string
          description: string | null
          id: string
          is_late: boolean
          participants: string[]
          received_at: string
          review_comment: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string
          submitted_by: string
          supplements_execution_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          client_started_at?: string | null
          client_submitted_at: string
          company_id: string
          converted_to_supplement?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_late?: boolean
          participants: string[]
          received_at?: string
          review_comment?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_order_id: string
          submitted_by: string
          supplements_execution_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          client_started_at?: string | null
          client_submitted_at?: string
          company_id?: string
          converted_to_supplement?: boolean
          created_at?: string
          description?: string | null
          id?: string
          is_late?: boolean
          participants?: string[]
          received_at?: string
          review_comment?: string | null
          review_status?: Database["public"]["Enums"]["review_status"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_order_id?: string
          submitted_by?: string
          supplements_execution_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_executions_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_executions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_executions_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_executions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_executions_supplements_execution_id_fkey"
            columns: ["supplements_execution_id"]
            isOneToOne: false
            referencedRelation: "service_order_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_history: {
        Row: {
          actor_id: string | null
          company_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json
          service_order_id: string
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          service_order_id: string
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          service_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_history_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_photos: {
        Row: {
          accuracy_m: number | null
          captured_at: string | null
          company_id: string
          created_at: string
          execution_id: string
          file_size: number
          height: number | null
          id: string
          latitude: number | null
          longitude: number | null
          mime_type: string
          service_order_id: string
          source: Database["public"]["Enums"]["photo_source"]
          storage_path: string
          uploaded_at: string
          width: number | null
        }
        Insert: {
          accuracy_m?: number | null
          captured_at?: string | null
          company_id: string
          created_at?: string
          execution_id: string
          file_size: number
          height?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mime_type: string
          service_order_id: string
          source: Database["public"]["Enums"]["photo_source"]
          storage_path: string
          uploaded_at: string
          width?: number | null
        }
        Update: {
          accuracy_m?: number | null
          captured_at?: string | null
          company_id?: string
          created_at?: string
          execution_id?: string
          file_size?: number
          height?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          mime_type?: string
          service_order_id?: string
          source?: Database["public"]["Enums"]["photo_source"]
          storage_path?: string
          uploaded_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_order_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_photos_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "service_order_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_photos_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_address_id?: string | null
          client_id: string
          company_id: string
          created_at?: string
          created_by: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          materials_notes?: string | null
          order_number: number
          priority?: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_address_id?: string | null
          client_id?: string
          company_id?: string
          created_at?: string
          created_by?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          materials_notes?: string | null
          order_number?: number
          priority?: Database["public"]["Enums"]["order_priority"]
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_address_id_fkey"
            columns: ["client_address_id"]
            isOneToOne: false
            referencedRelation: "client_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_created_by_fkey"
            columns: ["created_by"]
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
      acknowledge_supplements: {
        Args: { p_order_id: string; p_seen_until: string }
        Returns: number
      }
      actor_role: {
        Args: { p_actor_id: string; p_company_id: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      add_client_address: {
        Args: {
          p_address: Json
          p_client_id: string
          p_id: string
          p_make_primary?: boolean
        }
        Returns: string
      }
      apply_materials_notes: {
        Args: {
          p_expected: string
          p_order: Database["public"]["Tables"]["service_orders"]["Row"]
          p_text: string
        }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_order_assignees: {
        Args: {
          p_assignee_ids: string[]
          p_order: Database["public"]["Tables"]["service_orders"]["Row"]
        }
        Returns: undefined
      }
      assigned_address_ids: { Args: never; Returns: string[] }
      assigned_client_ids: { Args: never; Returns: string[] }
      assigned_order_ids: { Args: never; Returns: string[] }
      authorize_photo_upload: {
        Args: { p_execution_id: string; p_order_id: string; p_photo_id: string }
        Returns: Record<string, unknown>
      }
      blank_to_null: { Args: { p_text: string }; Returns: string }
      cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_order_technicians: {
        Args: { p_company_id: string; p_user_ids: string[] }
        Returns: string[]
      }
      close_member_assignments: {
        Args: {
          p_actor_id: string
          p_cause: string
          p_company_id: string
          p_user_id: string
        }
        Returns: number
      }
      colleague_ids: { Args: never; Returns: string[] }
      create_client: {
        Args: {
          p_address?: Json
          p_company_id: string
          p_id: string
          p_name: string
          p_notes?: string
          p_phone?: string
        }
        Returns: Record<string, unknown>
      }
      create_order: {
        Args: {
          p_assignee_ids?: string[]
          p_client_address_id?: string
          p_client_id: string
          p_company_id: string
          p_due_date?: string
          p_id: string
          p_instructions?: string
          p_materials_notes?: string
          p_priority?: Database["public"]["Enums"]["order_priority"]
          p_service_type: Database["public"]["Enums"]["service_type"]
          p_title: string
        }
        Returns: Record<string, unknown>
      }
      delete_client: {
        Args: { p_client_id: string; p_reason: string }
        Returns: {
          company_id: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        SetofOptions: {
          from: "*"
          to: "clients"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_client_address: {
        Args: { p_address_id: string; p_reason: string }
        Returns: {
          city: string
          client_id: string
          company_id: string
          complement: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          district: string | null
          id: string
          is_primary: boolean
          label: string | null
          number: string | null
          reference: string | null
          state: string
          street: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "client_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ensure_order_editable: {
        Args: { p_order: Database["public"]["Tables"]["service_orders"]["Row"] }
        Returns: undefined
      }
      format_address: {
        Args: {
          p_address: Database["public"]["Tables"]["client_addresses"]["Row"]
        }
        Returns: string
      }
      get_dashboard: {
        Args: { p_company_id: string }
        Returns: Record<string, unknown>
      }
      insert_client_address: {
        Args: {
          p_address: Json
          p_client_id: string
          p_id: string
          p_is_primary: boolean
        }
        Returns: string
      }
      is_assigned: { Args: { p_service_order_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      lock_assignee_memberships: {
        Args: { p_assignee_ids: string[]; p_order_id: string }
        Returns: undefined
      }
      lock_client_for_write: { Args: { p_client_id: string }; Returns: string }
      lock_company_members: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      lock_member_for_owner: {
        Args: { p_actor_id: string; p_member_id: string }
        Returns: {
          company_id: string
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "company_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lock_order_address: {
        Args: { p_address_id: string; p_client_id: string }
        Returns: string
      }
      lock_order_for_write: {
        Args: { p_allow_assigned?: boolean; p_order_id: string }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      member_company_ids: {
        Args: { p_roles?: Database["public"]["Enums"]["member_role"][] }
        Returns: string[]
      }
      member_role: {
        Args: { p_company_id: string }
        Returns: Database["public"]["Enums"]["member_role"]
      }
      order_due_at: {
        Args: { p_company_id: string; p_due_date: string }
        Returns: string
      }
      order_for_technician: {
        Args: { p_lock?: boolean; p_order_id: string }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      parse_execution_photos: {
        Args: { p_photos: Json }
        Returns: {
          accuracy_m: number
          captured_at: string
          height: number
          id: string
          latitude: number
          longitude: number
          source: Database["public"]["Enums"]["photo_source"]
          width: number
        }[]
      }
      photo_storage_path: {
        Args: {
          p_execution_id: string
          p_order: Database["public"]["Tables"]["service_orders"]["Row"]
          p_photo_id: string
        }
        Returns: string
      }
      register_photo_upload: {
        Args: {
          p_execution_id: string
          p_file_size: number
          p_order_id: string
          p_photo_id: string
          p_storage_path: string
          p_uploaded_at: string
          p_uploaded_by: string
        }
        Returns: {
          company_id: string
          created_at: string
          execution_id: string
          file_size: number
          id: string
          service_order_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        SetofOptions: {
          from: "*"
          to: "photo_uploads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      review_execution: {
        Args: {
          p_comment?: string
          p_decision: Database["public"]["Enums"]["review_status"]
          p_execution_id: string
          p_seen_until?: string
        }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          client_started_at: string | null
          client_submitted_at: string
          company_id: string
          converted_to_supplement: boolean
          created_at: string
          description: string | null
          id: string
          is_late: boolean
          participants: string[]
          received_at: string
          review_comment: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string
          submitted_by: string
          supplements_execution_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_order_executions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_member_invite: {
        Args: {
          p_actor_id: string
          p_company_id: string
          p_ip?: string
          p_role: Database["public"]["Enums"]["member_role"]
          p_user_id: string
        }
        Returns: Record<string, unknown>
      }
      save_member_removal: {
        Args: {
          p_actor_id: string
          p_ip?: string
          p_member_id: string
          p_reason: string
        }
        Returns: Record<string, unknown>
      }
      save_member_role: {
        Args: {
          p_actor_id: string
          p_ip?: string
          p_member_id: string
          p_role: Database["public"]["Enums"]["member_role"]
        }
        Returns: Record<string, unknown>
      }
      set_assignees: {
        Args: { p_assignee_ids: string[]; p_order_id: string }
        Returns: {
          assigned_at: string
          assigned_by: string
          company_id: string
          created_at: string
          id: string
          service_order_id: string
          unassigned_at: string | null
          unassigned_by: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "service_order_assignees"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_primary_address: {
        Args: { p_address_id: string }
        Returns: {
          city: string
          client_id: string
          company_id: string
          complement: string | null
          created_at: string
          delete_reason: string | null
          deleted_at: string | null
          deleted_by: string | null
          district: string | null
          id: string
          is_primary: boolean
          label: string | null
          number: string | null
          reference: string | null
          state: string
          street: string
          zip_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "client_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_execution: {
        Args: { p_client_started_at: string; p_order_id: string }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_execution: {
        Args: {
          p_client_started_at?: string
          p_client_submitted_at: string
          p_description?: string
          p_execution_id: string
          p_order_id: string
          p_participants: string[]
          p_photos?: Json
          p_supplements_execution_id?: string
        }
        Returns: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          client_started_at: string | null
          client_submitted_at: string
          company_id: string
          converted_to_supplement: boolean
          created_at: string
          description: string | null
          id: string
          is_late: boolean
          participants: string[]
          received_at: string
          review_comment: string | null
          review_status: Database["public"]["Enums"]["review_status"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_order_id: string
          submitted_by: string
          supplements_execution_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "service_order_executions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      to_inet: { Args: { p_text: string }; Returns: unknown }
      update_materials_notes: {
        Args: { p_expected?: string; p_order_id: string; p_text?: string }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_order: {
        Args: {
          p_assignee_ids?: string[]
          p_client_address_id?: string
          p_due_date?: string
          p_instructions?: string
          p_materials_expected?: string
          p_materials_notes?: string
          p_order_id: string
          p_priority: Database["public"]["Enums"]["order_priority"]
          p_service_type: Database["public"]["Enums"]["service_type"]
          p_title: string
          p_update_materials?: boolean
        }
        Returns: {
          address: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_address_id: string | null
          client_id: string
          company_id: string
          created_at: string
          created_by: string
          due_at: string | null
          id: string
          instructions: string | null
          materials_notes: string | null
          order_number: number
          priority: Database["public"]["Enums"]["order_priority"]
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "service_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_id_by_email: { Args: { p_email: string }; Returns: string }
    }
    Enums: {
      member_role: "owner" | "manager" | "technician"
      order_priority: "low" | "normal" | "high" | "urgent"
      order_status:
        | "open"
        | "in_progress"
        | "pending_approval"
        | "rejected"
        | "approved"
        | "cancelled"
      photo_source: "camera" | "gallery"
      review_status: "pending" | "approved" | "rejected" | "voided"
      service_type: "installation" | "maintenance" | "technical_visit"
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
      member_role: ["owner", "manager", "technician"],
      order_priority: ["low", "normal", "high", "urgent"],
      order_status: [
        "open",
        "in_progress",
        "pending_approval",
        "rejected",
        "approved",
        "cancelled",
      ],
      photo_source: ["camera", "gallery"],
      review_status: ["pending", "approved", "rejected", "voided"],
      service_type: ["installation", "maintenance", "technical_visit"],
    },
  },
} as const

