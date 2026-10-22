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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      call_logs: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          outcome: Database["public"]["Enums"]["call_outcome"]
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          outcome: Database["public"]["Enums"]["call_outcome"]
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_rates: {
        Row: {
          desk_price: number | null
          home_price: number | null
          store_id: string
          wilaya_code: number
        }
        Insert: {
          desk_price?: number | null
          home_price?: number | null
          store_id: string
          wilaya_code: number
        }
        Update: {
          desk_price?: number | null
          home_price?: number | null
          store_id?: string
          wilaya_code?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_rates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          call_attempts: number
          commune: string
          created_at: string
          customer_name: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          notes: string | null
          order_number: number
          payment_status: string
          phone: string
          product_id: string | null
          product_image: string | null
          product_name: string
          quantity: number
          shipping_price: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          tracking_number: string | null
          unit_price: number
          updated_at: string
          variant_color: string | null
          variant_size: string | null
          wilaya_code: number
          wilaya_name: string
        }
        Insert: {
          address?: string | null
          call_attempts?: number
          commune: string
          created_at?: string
          customer_name: string
          delivery_type: Database["public"]["Enums"]["delivery_type"]
          id?: string
          last_call_outcome?: Database["public"]["Enums"]["call_outcome"] | null
          notes?: string | null
          order_number?: never
          payment_status?: string
          phone: string
          product_id?: string | null
          product_image?: string | null
          product_name: string
          quantity: number
          shipping_price: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal: number
          total: number
          tracking_number?: string | null
          unit_price: number
          updated_at?: string
          variant_color?: string | null
          variant_size?: string | null
          wilaya_code: number
          wilaya_name: string
        }
        Update: {
          address?: string | null
          call_attempts?: number
          commune?: string
          created_at?: string
          customer_name?: string
          delivery_type?: Database["public"]["Enums"]["delivery_type"]
          id?: string
          last_call_outcome?: Database["public"]["Enums"]["call_outcome"] | null
          notes?: string | null
          order_number?: never
          payment_status?: string
          phone?: string
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          quantity?: number
          shipping_price?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal?: number
          total?: number
          tracking_number?: string | null
          unit_price?: number
          updated_at?: string
          variant_color?: string | null
          variant_size?: string | null
          wilaya_code?: number
          wilaya_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_receipts: {
        Row: {
          amount: number
          created_at: string
          id: string
          months: number
          plan_id: string
          receipt_path: string
          reject_reason: string | null
          reviewed_at: string | null
          status: string
          store_id: string
          transaction_ref: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          months?: number
          plan_id: string
          receipt_path: string
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: string
          store_id: string
          transaction_ref: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          months?: number
          plan_id?: string
          receipt_path?: string
          reject_reason?: string | null
          reviewed_at?: string | null
          status?: string
          store_id?: string
          transaction_ref?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_receipts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_receipts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          id: string
          months: number
          name: string
          price: number
          sort: number
        }
        Insert: {
          id: string
          months: number
          name: string
          price: number
          sort?: number
        }
        Update: {
          id?: string
          months?: number
          name?: string
          price?: number
          sort?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          ccp_holder: string
          ccp_key: string
          ccp_number: string
          id: number
          rip: string
          support_phone: string
        }
        Insert: {
          ccp_holder?: string
          ccp_key?: string
          ccp_number?: string
          id?: number
          rip?: string
          support_phone?: string
        }
        Update: {
          ccp_holder?: string
          ccp_key?: string
          ccp_number?: string
          id?: number
          rip?: string
          support_phone?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          colors: string[]
          compare_at_price: number | null
          created_at: string
          description: string
          features: string[]
          id: string
          images: string[]
          is_active: boolean
          name: string
          price: number
          sizes: string[]
          slug: string
          store_id: string
          updated_at: string
        }
        Insert: {
          colors?: string[]
          compare_at_price?: number | null
          created_at?: string
          description?: string
          features?: string[]
          id?: string
          images?: string[]
          is_active?: boolean
          name: string
          price: number
          sizes?: string[]
          slug: string
          store_id: string
          updated_at?: string
        }
        Update: {
          colors?: string[]
          compare_at_price?: number | null
          created_at?: string
          description?: string
          features?: string[]
          id?: string
          images?: string[]
          is_active?: boolean
          name?: string
          price?: number
          sizes?: string[]
          slug?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          default_desk_price: number
          default_home_price: number
          id: string
          logo_url: string | null
          name: string
          origin_wilaya_code: number
          owner_email: string | null
          owner_id: string
          paid_until: string | null
          phone: string | null
          slug: string
          trial_ends_at: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          default_desk_price?: number
          default_home_price?: number
          id?: string
          logo_url?: string | null
          name: string
          origin_wilaya_code?: number
          owner_email?: string | null
          owner_id: string
          paid_until?: string | null
          phone?: string | null
          slug: string
          trial_ends_at?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          default_desk_price?: number
          default_home_price?: number
          id?: string
          logo_url?: string | null
          name?: string
          origin_wilaya_code?: number
          owner_email?: string | null
          owner_id?: string
          paid_until?: string | null
          phone?: string | null
          slug?: string
          trial_ends_at?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      yalidine_credentials: {
        Row: {
          api_id: string
          api_token: string
          store_id: string
          updated_at: string
        }
        Insert: {
          api_id: string
          api_token: string
          store_id: string
          updated_at?: string
        }
        Update: {
          api_id?: string
          api_token?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yalidine_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_receipt: { Args: { _receipt_id: string }; Returns: string }
      get_public_store: {
        Args: { _slug: string }
        Returns: {
          accepting_orders: boolean
          default_desk_price: number
          default_home_price: number
          id: string
          logo_url: string
          name: string
          slug: string
          whatsapp: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      order_stats: {
        Args: { _store_id: string }
        Returns: {
          orders_count: number
          orders_total: number
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      owns_store: { Args: { _store_id: string }; Returns: boolean }
      place_order: {
        Args: {
          _address: string
          _color?: string
          _commune: string
          _customer_name: string
          _delivery_type: Database["public"]["Enums"]["delivery_type"]
          _phone: string
          _product_id: string
          _quantity: number
          _size?: string
          _wilaya_code: number
          _wilaya_name: string
        }
        Returns: {
          order_number: number
          total: number
        }[]
      }
      reject_receipt: {
        Args: { _reason: string; _receipt_id: string }
        Returns: undefined
      }
      store_is_active: { Args: { _store_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "merchant"
      call_outcome:
        | "no_answer_1"
        | "no_answer_2"
        | "busy_callback"
        | "confirmed"
      delivery_type: "home" | "desk"
      order_status:
        | "new"
        | "confirmed"
        | "shipping"
        | "delivered"
        | "cancelled"
        | "returned"
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
      app_role: ["admin", "merchant"],
      call_outcome: [
        "no_answer_1",
        "no_answer_2",
        "busy_callback",
        "confirmed",
      ],
      delivery_type: ["home", "desk"],
      order_status: [
        "new",
        "confirmed",
        "shipping",
        "delivered",
        "cancelled",
        "returned",
      ],
    },
  },
} as const
