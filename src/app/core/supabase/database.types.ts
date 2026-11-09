
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "addresses": {
                  Row: {
                    "city": string,"created_at": string,"district": string | null,"id": string,"is_default": boolean,"line": string,"phone": string,"recipient": string,"user_id": string,"ward": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city": string,"created_at"?: string,"district"?: string | null,"id"?: string,"is_default"?: boolean,"line": string,"phone": string,"recipient": string,"user_id": string,"ward": string
                  }
                  Update: {
                    "city"?: string,"created_at"?: string,"district"?: string | null,"id"?: string,"is_default"?: boolean,"line"?: string,"phone"?: string,"recipient"?: string,"user_id"?: string,"ward"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "addresses_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"designs": {
                  Row: {
                    "canvas_json": NonNullable<Json>,"created_at": string,"id": string,"name": string,"phone_model_id": string,"preview_url": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "canvas_json": NonNullable<Json>,"created_at"?: string,"id"?: string,"name"?: string,"phone_model_id": string,"preview_url"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "canvas_json"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"name"?: string,"phone_model_id"?: string,"preview_url"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "designs_phone_model_id_fkey"
      columns: ["phone_model_id"]
isOneToOne: false
      referencedRelation: "phone_models"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "designs_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_items": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["inventory_kind"],"name": string,"phone_model_id": string | null,"quantity_on_hand": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["inventory_kind"],"name": string,"phone_model_id"?: string | null,"quantity_on_hand"?: number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["inventory_kind"],"name"?: string,"phone_model_id"?: string | null,"quantity_on_hand"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_items_phone_model_id_fkey"
      columns: ["phone_model_id"]
isOneToOne: false
      referencedRelation: "phone_models"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "design_id": string | null,"id": string,"image_url": string | null,"inventory_item_id": string,"name": string,"order_id": string,"qty": number,"unit_price": number,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "design_id"?: string | null,"id"?: string,"image_url"?: string | null,"inventory_item_id": string,"name": string,"order_id": string,"qty": number,"unit_price": number,"variant_id"?: string | null
                  }
                  Update: {
                    "design_id"?: string | null,"id"?: string,"image_url"?: string | null,"inventory_item_id"?: string,"name"?: string,"order_id"?: string,"qty"?: number,"unit_price"?: number,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_design_id_fkey"
      columns: ["design_id"]
isOneToOne: false
      referencedRelation: "designs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_inventory_item_id_fkey"
      columns: ["inventory_item_id"]
isOneToOne: false
      referencedRelation: "inventory_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_inventory_item_id_fkey"
      columns: ["inventory_item_id"]
isOneToOne: false
      referencedRelation: "stock_availability"
      referencedColumns: ["inventory_item_id"]
    },{
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_variant_id_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"order_status_history": {
                  Row: {
                    "created_at": string,"id": string,"note": string | null,"order_id": string,"status": Database["public"]['Enums']["order_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"order_id": string,"status": Database["public"]['Enums']["order_status"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"note"?: string | null,"order_id"?: string,"status"?: Database["public"]['Enums']["order_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_status_history_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address_line": string,"city": string,"created_at": string,"district": string | null,"id": string,"payment_method": string,"phone": string,"recipient": string,"status": Database["public"]['Enums']["order_status"],"total": number,"user_id": string,"ward": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"city": string,"created_at"?: string,"district"?: string | null,"id"?: string,"payment_method"?: string,"phone": string,"recipient": string,"status"?: Database["public"]['Enums']["order_status"],"total"?: number,"user_id": string,"ward": string
                  }
                  Update: {
                    "address_line"?: string,"city"?: string,"created_at"?: string,"district"?: string | null,"id"?: string,"payment_method"?: string,"phone"?: string,"recipient"?: string,"status"?: Database["public"]['Enums']["order_status"],"total"?: number,"user_id"?: string,"ward"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"phone_models": {
                  Row: {
                    "brand": string,"created_at": string,"custom_price": number,"id": string,"is_active": boolean,"mask_image_url": string | null,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand": string,"created_at"?: string,"custom_price": number,"id"?: string,"is_active"?: boolean,"mask_image_url"?: string | null,"name": string,"slug": string
                  }
                  Update: {
                    "brand"?: string,"created_at"?: string,"custom_price"?: number,"id"?: string,"is_active"?: boolean,"mask_image_url"?: string | null,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"product_variants": {
                  Row: {
                    "created_at": string,"id": string,"inventory_item_id": string,"is_active": boolean,"name": string | null,"phone_model_id": string | null,"price": number,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"inventory_item_id": string,"is_active"?: boolean,"name"?: string | null,"phone_model_id"?: string | null,"price": number,"product_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"inventory_item_id"?: string,"is_active"?: boolean,"name"?: string | null,"phone_model_id"?: string | null,"price"?: number,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_inventory_item_id_fkey"
      columns: ["inventory_item_id"]
isOneToOne: false
      referencedRelation: "inventory_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_inventory_item_id_fkey"
      columns: ["inventory_item_id"]
isOneToOne: false
      referencedRelation: "stock_availability"
      referencedColumns: ["inventory_item_id"]
    },{
      foreignKeyName: "product_variants_phone_model_id_fkey"
      columns: ["phone_model_id"]
isOneToOne: false
      referencedRelation: "phone_models"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_variants_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "created_at": string,"description": string,"gallery_urls": (string)[],"id": string,"image_url": string | null,"is_active": boolean,"name": string,"product_type": Database["public"]['Enums']["product_type"],"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string,"gallery_urls"?: (string)[],"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name": string,"product_type": Database["public"]['Enums']["product_type"],"slug": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"gallery_urls"?: (string)[],"id"?: string,"image_url"?: string | null,"is_active"?: boolean,"name"?: string,"product_type"?: Database["public"]['Enums']["product_type"],"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "avatar_url": string | null,"created_at": string,"device_type": string | null,"display_name": string | null,"id": string,"onboarding_status": string,"preferences": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_url"?: string | null,"created_at"?: string,"device_type"?: string | null,"display_name"?: string | null,"id": string,"onboarding_status": string,"preferences"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "avatar_url"?: string | null,"created_at"?: string,"device_type"?: string | null,"display_name"?: string | null,"id"?: string,"onboarding_status"?: string,"preferences"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"test": {
                  Row: {
                    "id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"title": string
                  }
                  Update: {
                    "id"?: string,"title"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "stock_availability": {
                  Row: {
                    "available": number,"inventory_item_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "available"?: number | null,"inventory_item_id"?: string | null
                         }
                        Update: {
                           "available"?: number | null,"inventory_item_id"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "cancel_order":
{ Args: { "p_order_id": string }; Returns: undefined
                           },
"place_order":
{ Args: { "p_items": Json,"p_shipping": Json }; Returns: string
                           }
          }
          Enums: {
            "inventory_kind": "blank"|"material"|"trade_good","order_status": "pending"|"confirmed"|"shipping"|"delivered"|"cancelled","product_type": "case"|"accessory"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "inventory_kind": ["blank", "material", "trade_good"],"order_status": ["pending", "confirmed", "shipping", "delivered", "cancelled"],"product_type": ["case", "accessory"]
          }
        }
} as const
