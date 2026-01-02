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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action_type: string
          admin_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          sender_role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          sender_role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          sender_role?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          aadhaar_back_url: string
          aadhaar_front_url: string
          aadhaar_number: string
          bank_statement_url: string | null
          created_at: string
          date_of_birth: string
          face_image_url: string | null
          first_name: string
          id: string
          last_name: string
          pan_document_url: string
          pan_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submitted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aadhaar_back_url: string
          aadhaar_front_url: string
          aadhaar_number: string
          bank_statement_url?: string | null
          created_at?: string
          date_of_birth: string
          face_image_url?: string | null
          first_name: string
          id?: string
          last_name: string
          pan_document_url: string
          pan_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aadhaar_back_url?: string
          aadhaar_front_url?: string
          aadhaar_number?: string
          bank_statement_url?: string | null
          created_at?: string
          date_of_birth?: string
          face_image_url?: string | null
          first_name?: string
          id?: string
          last_name?: string
          pan_document_url?: string
          pan_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submitted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          affiliate_user_id: string
          base_price: number
          completed_at: string | null
          created_at: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          order_number: string
          paid_at: string | null
          payment_link: string | null
          payment_link_clicked_at: string | null
          payment_link_updated_at: string | null
          payment_link_updated_by: string | null
          quantity: number
          selling_price: number
          status: Database["public"]["Enums"]["order_status"]
          storefront_product_id: string
          updated_at: string
        }
        Insert: {
          affiliate_user_id: string
          base_price: number
          completed_at?: string | null
          created_at?: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          order_number: string
          paid_at?: string | null
          payment_link?: string | null
          payment_link_clicked_at?: string | null
          payment_link_updated_at?: string | null
          payment_link_updated_by?: string | null
          quantity?: number
          selling_price: number
          status?: Database["public"]["Enums"]["order_status"]
          storefront_product_id: string
          updated_at?: string
        }
        Update: {
          affiliate_user_id?: string
          base_price?: number
          completed_at?: string | null
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          payment_link?: string | null
          payment_link_clicked_at?: string | null
          payment_link_updated_at?: string | null
          payment_link_updated_by?: string | null
          quantity?: number
          selling_price?: number
          status?: Database["public"]["Enums"]["order_status"]
          storefront_product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_storefront_product_id_fkey"
            columns: ["storefront_product_id"]
            isOneToOne: false
            referencedRelation: "storefront_products"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          id: string
          payment_details: Json
          payment_method: string
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          id?: string
          payment_details?: Json
          payment_method?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          base_price: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          sku: string
          stock: number
          updated_at: string
        }
        Insert: {
          base_price: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          sku: string
          stock?: number
          updated_at?: string
        }
        Update: {
          base_price?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          sku?: string
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          commission_override: number | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          saved_payment_details: Json | null
          storefront_banner: string | null
          storefront_name: string | null
          storefront_slug: string | null
          updated_at: string
          user_id: string
          user_level: Database["public"]["Enums"]["user_level"]
          user_status: Database["public"]["Enums"]["user_status"]
          wallet_balance: number
        }
        Insert: {
          commission_override?: number | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name: string
          saved_payment_details?: Json | null
          storefront_banner?: string | null
          storefront_name?: string | null
          storefront_slug?: string | null
          updated_at?: string
          user_id: string
          user_level?: Database["public"]["Enums"]["user_level"]
          user_status?: Database["public"]["Enums"]["user_status"]
          wallet_balance?: number
        }
        Update: {
          commission_override?: number | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          saved_payment_details?: Json | null
          storefront_banner?: string | null
          storefront_name?: string | null
          storefront_slug?: string | null
          updated_at?: string
          user_id?: string
          user_level?: Database["public"]["Enums"]["user_level"]
          user_status?: Database["public"]["Enums"]["user_status"]
          wallet_balance?: number
        }
        Relationships: []
      }
      storefront_products: {
        Row: {
          created_at: string
          custom_description: string | null
          id: string
          is_active: boolean
          product_id: string
          selling_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_description?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          selling_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_description?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          selling_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          order_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_audit_log: {
        Args: {
          _action_type: string
          _admin_id: string
          _entity_id: string
          _entity_type: string
          _metadata?: Json
          _new_value?: Json
          _old_value?: Json
          _reason?: string
          _user_id: string
        }
        Returns: string
      }
      get_affiliate_orders_masked: {
        Args: never
        Returns: {
          affiliate_user_id: string
          base_price: number
          completed_at: string
          created_at: string
          customer_address_masked: string
          customer_email_masked: string
          customer_name_masked: string
          customer_phone_masked: string
          id: string
          order_number: string
          paid_at: string
          payment_link: string
          payment_link_clicked_at: string
          quantity: number
          selling_price: number
          status: Database["public"]["Enums"]["order_status"]
          storefront_product_id: string
          updated_at: string
        }[]
      }
      get_kyc_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["kyc_status"]
      }
      get_public_storefront_profile: {
        Args: { _slug: string }
        Returns: {
          display_name: string
          storefront_banner: string
          storefront_name: string
          storefront_slug: string
          user_id: string
        }[]
      }
      get_user_commission_rate: { Args: { _user_id: string }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_kyc_approved: { Args: { _user_id: string }; Returns: boolean }
      is_user_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_status: "not_submitted" | "submitted" | "approved" | "rejected"
      order_status:
        | "pending_payment"
        | "paid_by_user"
        | "processing"
        | "completed"
        | "cancelled"
      user_level: "bronze" | "silver" | "gold"
      user_status: "pending" | "approved" | "disabled"
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
      app_role: ["admin", "user"],
      kyc_status: ["not_submitted", "submitted", "approved", "rejected"],
      order_status: [
        "pending_payment",
        "paid_by_user",
        "processing",
        "completed",
        "cancelled",
      ],
      user_level: ["bronze", "silver", "gold"],
      user_status: ["pending", "approved", "disabled"],
    },
  },
} as const
