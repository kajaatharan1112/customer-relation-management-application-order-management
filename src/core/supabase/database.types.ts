export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
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
  public: {
    Tables: {
      attachments: {
        Row: {
          created_at: string
          deleted_at: string | null
          file_name: string
          id: string
          mime_type: string | null
          owner_id: string
          owner_type: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          file_name: string
          id?: string
          mime_type?: string | null
          owner_id: string
          owner_type: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          file_name?: string
          id?: string
          mime_type?: string | null
          owner_id?: string
          owner_type?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
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
        ]
      }
      bill_comments: {
        Row: {
          author_id: string
          bill_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
        }
        Insert: {
          author_id: string
          bill_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
        }
        Update: {
          author_id?: string
          bill_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_comments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_stage_summary"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "bill_comments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_rows: {
        Row: {
          amount: number
          bill_id: string
          created_at: string
          current_stage_id: string | null
          deleted_at: string | null
          detail: string
          id: string
          order_type_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount?: number
          bill_id: string
          created_at?: string
          current_stage_id?: string | null
          deleted_at?: string | null
          detail?: string
          id?: string
          order_type_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          bill_id?: string
          created_at?: string
          current_stage_id?: string | null
          deleted_at?: string | null
          detail?: string
          id?: string
          order_type_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bill_rows_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_stage_summary"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "bill_rows_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_rows_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_rows_order_type_id_fkey"
            columns: ["order_type_id"]
            isOneToOne: false
            referencedRelation: "order_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_statuses: {
        Row: {
          id: string
          is_terminal: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_terminal?: boolean
          key: string
          label: string
          sort_order: number
        }
        Update: {
          id?: string
          is_terminal?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      bills: {
        Row: {
          bill_number: string
          bill_status_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          deadline: string | null
          deleted_at: string | null
          id: string
          notes: string | null
          order_date: string
          paid_amount: number
          updated_at: string
        }
        Insert: {
          bill_number: string
          bill_status_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          paid_amount?: number
          updated_at?: string
        }
        Update: {
          bill_number?: string
          bill_status_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deadline?: string | null
          deleted_at?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          paid_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bills_bill_status_id_fkey"
            columns: ["bill_status_id"]
            isOneToOne: false
            referencedRelation: "bill_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bills_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line: string | null
          city: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          notes: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          notes?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          notes?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      export_tokens: {
        Row: {
          consumed_at: string | null
          covers_before: string
          created_at: string
          created_by: string | null
          id: string
        }
        Insert: {
          consumed_at?: string | null
          covers_before: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Update: {
          consumed_at?: string | null
          covers_before?: string
          created_at?: string
          created_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_images: {
        Row: {
          caption: string | null
          deleted_at: string | null
          id: string
          image_path: string
          sort_order: number
        }
        Insert: {
          caption?: string | null
          deleted_at?: string | null
          id?: string
          image_path: string
          sort_order?: number
        }
        Update: {
          caption?: string | null
          deleted_at?: string | null
          id?: string
          image_path?: string
          sort_order?: number
        }
        Relationships: []
      }
      home_blocks: {
        Row: {
          id: string
          is_visible: boolean
          sort_order: number
          type: string
        }
        Insert: {
          id?: string
          is_visible?: boolean
          sort_order: number
          type: string
        }
        Update: {
          id?: string
          is_visible?: boolean
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          bill_row_id: string
          changed_by: string | null
          created_at: string
          from_stage_id: string | null
          id: string
          note: string | null
          to_stage_id: string
        }
        Insert: {
          bill_row_id: string
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          note?: string | null
          to_stage_id: string
        }
        Update: {
          bill_row_id?: string
          changed_by?: string | null
          created_at?: string
          from_stage_id?: string | null
          id?: string
          note?: string | null
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_bill_row_id_fkey"
            columns: ["bill_row_id"]
            isOneToOne: false
            referencedRelation: "bill_rows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "workflow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      order_types: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          fixed_amount: number | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          workflow_template_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          workflow_template_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          fixed_amount?: number | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          workflow_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_types_workflow_template_id_fkey"
            columns: ["workflow_template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          about: string
          address: string
          currency_code: string
          currency_locale: string
          default_bill_status_id: string
          email: string
          hours: string
          id: boolean
          logo_path: string | null
          org_name: string
          phone: string
          socials: Json
          tagline: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          about?: string
          address?: string
          currency_code?: string
          currency_locale?: string
          default_bill_status_id: string
          email?: string
          hours?: string
          id?: boolean
          logo_path?: string | null
          org_name?: string
          phone?: string
          socials?: Json
          tagline?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          about?: string
          address?: string
          currency_code?: string
          currency_locale?: string
          default_bill_status_id?: string
          email?: string
          hours?: string
          id?: boolean
          logo_path?: string | null
          org_name?: string
          phone?: string
          socials?: Json
          tagline?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_default_bill_status_id_fkey"
            columns: ["default_bill_status_id"]
            isOneToOne: false
            referencedRelation: "bill_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          deleted_at: string | null
          description: string | null
          id: string
          image_path: string | null
          is_active: boolean
          name: string
          price: number
          sort_order: number
        }
        Insert: {
          category?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name: string
          price?: number
          sort_order?: number
        }
        Update: {
          category?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          name?: string
          price?: number
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          status: string
          theme_color: string
          updated_at: string
          user_type_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email: string
          full_name?: string
          id: string
          phone?: string | null
          status?: string
          theme_color?: string
          updated_at?: string
          user_type_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          status?: string
          theme_color?: string
          updated_at?: string
          user_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_user_type_id_fkey"
            columns: ["user_type_id"]
            isOneToOne: false
            referencedRelation: "user_types"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          body: string | null
          deleted_at: string | null
          discount_kind: string
          discount_value: string | null
          ends_at: string | null
          id: string
          image_path: string | null
          is_active: boolean
          sort_order: number
          starts_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          deleted_at?: string | null
          discount_kind?: string
          discount_value?: string | null
          ends_at?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          deleted_at?: string | null
          discount_kind?: string
          discount_value?: string | null
          ends_at?: string | null
          id?: string
          image_path?: string | null
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          title?: string
        }
        Relationships: []
      }
      user_types: {
        Row: {
          id: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          id?: string
          key: string
          label: string
          sort_order: number
        }
        Update: {
          id?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      workflow_stages: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          id: string
          is_final: boolean
          name: string
          sort_order: number
          template_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_final?: boolean
          name: string
          sort_order: number
          template_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_final?: boolean
          name?: string
          sort_order?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      bill_history: {
        Row: {
          bill_id: string | null
          bill_row_id: string | null
          changed_by_name: string | null
          created_at: string | null
          from_stage: string | null
          id: string | null
          note: string | null
          row_detail: string | null
          to_stage: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_rows_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bill_stage_summary"
            referencedColumns: ["bill_id"]
          },
          {
            foreignKeyName: "bill_rows_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_bill_row_id_fkey"
            columns: ["bill_row_id"]
            isOneToOne: false
            referencedRelation: "bill_rows"
            referencedColumns: ["id"]
          },
        ]
      }
      bill_stage_summary: {
        Row: {
          bill_id: string | null
          completed_rows: number | null
          tracked_rows: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_admin_count: { Args: never; Returns: number }
      advance_bill_row_stage: {
        Args: { p_note?: string; p_row_id: string; p_to_stage_id: string }
        Returns: undefined
      }
      current_profile: { Args: never; Returns: string }
      current_user_type: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      maintenance_stats: { Args: { p_before: string }; Returns: Json }
      purge_archived_data: {
        Args: { p_before: string; p_token: string }
        Returns: Json
      }
      replace_workflow_stages: {
        Args: { p_stages: Json; p_template_id: string }
        Returns: undefined
      }
      save_bill: { Args: { p_bill: Json; p_rows: Json }; Returns: string }
      set_bill_status: {
        Args: { p_bill_id: string; p_status_key: string }
        Returns: undefined
      }
      set_member_status: {
        Args: { p_profile_id: string; p_status: string }
        Returns: undefined
      }
      soft_delete_bill: { Args: { p_bill_id: string }; Returns: undefined }
      soft_delete_customer: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      soft_delete_order_type: {
        Args: { p_order_type_id: string }
        Returns: undefined
      }
      soft_delete_workflow_template: {
        Args: { p_template_id: string }
        Returns: undefined
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

