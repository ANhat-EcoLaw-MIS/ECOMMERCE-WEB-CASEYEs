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
      addresses: {
        Row: {
          city: string
          created_at: string
          district: string | null
          id: string
          is_default: boolean
          line: string
          phone: string
          recipient: string
          user_id: string
          ward: string
        }
        Insert: {
          city: string
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          line: string
          phone: string
          recipient: string
          user_id: string
          ward: string
        }
        Update: {
          city?: string
          created_at?: string
          district?: string | null
          id?: string
          is_default?: boolean
          line?: string
          phone?: string
          recipient?: string
          user_id?: string
          ward?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cancel_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          id: string
          note: string | null
          order_id: string
          reason: string
          sla_due_at: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          note?: string | null
          order_id: string
          reason: string
          sla_due_at: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          id?: string
          note?: string | null
          order_id?: string
          reason?: string
          sla_due_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cancel_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancel_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          attempt_no: number
          ended_at: string | null
          failure_cause: string | null
          id: string
          result: string | null
          shipment_id: string
          started_at: string
        }
        Insert: {
          attempt_no: number
          ended_at?: string | null
          failure_cause?: string | null
          id?: string
          result?: string | null
          shipment_id: string
          started_at?: string
        }
        Update: {
          attempt_no?: number
          ended_at?: string | null
          failure_cause?: string | null
          id?: string
          result?: string | null
          shipment_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_shipment_id_fkey"
            columns: ["shipment_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id"]
          },
        ]
      }
      design_reviews: {
        Row: {
          created_at: string
          decision: string
          design_id: string | null
          id: string
          order_id: string
          reason: string | null
          reviewer_id: string | null
          round: number
          violation_group: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          design_id?: string | null
          id?: string
          order_id: string
          reason?: string | null
          reviewer_id?: string | null
          round: number
          violation_group?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          design_id?: string | null
          id?: string
          order_id?: string
          reason?: string | null
          reviewer_id?: string | null
          round?: number
          violation_group?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_reviews_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      designs: {
        Row: {
          canvas_json: Json
          created_at: string
          id: string
          name: string
          phone_model_id: string
          preview_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          canvas_json: Json
          created_at?: string
          id?: string
          name?: string
          phone_model_id: string
          preview_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          canvas_json?: Json
          created_at?: string
          id?: string
          name?: string
          phone_model_id?: string
          preview_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "designs_phone_model_id_fkey"
            columns: ["phone_model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "designs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          case_type: string | null
          color_hex: string | null
          color_name: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["inventory_kind"]
          name: string
          phone_model_id: string | null
          quantity_on_hand: number
          sku_code: string | null
        }
        Insert: {
          case_type?: string | null
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["inventory_kind"]
          name: string
          phone_model_id?: string | null
          quantity_on_hand?: number
          sku_code?: string | null
        }
        Update: {
          case_type?: string | null
          color_hex?: string | null
          color_name?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["inventory_kind"]
          name?: string
          phone_model_id?: string | null
          quantity_on_hand?: number
          sku_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_phone_model_id_fkey"
            columns: ["phone_model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
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
      order_items: {
        Row: {
          design_id: string | null
          design_version: number
          id: string
          image_url: string | null
          inventory_item_id: string
          is_custom: boolean | null
          name: string
          order_id: string
          phone_model: string | null
          qty: number
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          design_id?: string | null
          design_version?: number
          id?: string
          image_url?: string | null
          inventory_item_id: string
          is_custom?: boolean | null
          name: string
          order_id: string
          phone_model?: string | null
          qty: number
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          design_id?: string | null
          design_version?: number
          id?: string
          image_url?: string | null
          inventory_item_id?: string
          is_custom?: boolean | null
          name?: string
          order_id?: string
          phone_model?: string | null
          qty?: number
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_design_id_fkey"
            columns: ["design_id"]
            isOneToOne: false
            referencedRelation: "designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "stock_availability"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          id: string
          note: string | null
          order_id: string
          reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_detail: string | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          reason?: string | null
          status: Database["public"]["Enums"]["order_status"]
          status_detail?: string | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          status_detail?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_vouchers: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          order_id: string
          used_at: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          kind: string
          order_id: string
          used_at?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          order_id?: string
          used_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_vouchers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          auto_complete_at: string | null
          batch_date: string | null
          checkout_ref: string | null
          city: string
          confirm_due_at: string | null
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          design_fix_reminded_at: string | null
          design_resubmit_count: number
          discount: number
          district: string | null
          earliest_edd: string | null
          express_surcharge: number
          failure_cause: string | null
          fault_override: string | null
          frozen_at: string | null
          gift_message: string | null
          goods_total: number
          id: string
          late_voucher_issued: boolean
          latest_edd: string | null
          order_code: string | null
          payment_channel: string | null
          payment_method: string
          payment_status: string
          payment_txn_ref: string | null
          phone: string
          qc_reprint_count: number
          recipient: string
          redelivery_used: boolean
          rejected_at: string | null
          review_queued_at: string | null
          shipper_note: string | null
          shipping_fee: number
          shipping_tier: string
          standard_fee: number
          status: Database["public"]["Enums"]["order_status"]
          status_detail: string
          ticket_id: string | null
          total: number
          transit_max: number
          transit_min: number
          updated_at: string
          user_id: string
          version: number
          ward: string
          warehouse_disputed: boolean
          warehouse_hold_until: string | null
        }
        Insert: {
          address_line: string
          auto_complete_at?: string | null
          batch_date?: string | null
          checkout_ref?: string | null
          city: string
          confirm_due_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          design_fix_reminded_at?: string | null
          design_resubmit_count?: number
          discount?: number
          district?: string | null
          earliest_edd?: string | null
          express_surcharge?: number
          failure_cause?: string | null
          fault_override?: string | null
          frozen_at?: string | null
          gift_message?: string | null
          goods_total?: number
          id?: string
          late_voucher_issued?: boolean
          latest_edd?: string | null
          order_code?: string | null
          payment_channel?: string | null
          payment_method?: string
          payment_status?: string
          payment_txn_ref?: string | null
          phone: string
          qc_reprint_count?: number
          recipient: string
          redelivery_used?: boolean
          rejected_at?: string | null
          review_queued_at?: string | null
          shipper_note?: string | null
          shipping_fee?: number
          shipping_tier?: string
          standard_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          status_detail?: string
          ticket_id?: string | null
          total?: number
          transit_max?: number
          transit_min?: number
          updated_at?: string
          user_id: string
          version?: number
          ward: string
          warehouse_disputed?: boolean
          warehouse_hold_until?: string | null
        }
        Update: {
          address_line?: string
          auto_complete_at?: string | null
          batch_date?: string | null
          checkout_ref?: string | null
          city?: string
          confirm_due_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          design_fix_reminded_at?: string | null
          design_resubmit_count?: number
          discount?: number
          district?: string | null
          earliest_edd?: string | null
          express_surcharge?: number
          failure_cause?: string | null
          fault_override?: string | null
          frozen_at?: string | null
          gift_message?: string | null
          goods_total?: number
          id?: string
          late_voucher_issued?: boolean
          latest_edd?: string | null
          order_code?: string | null
          payment_channel?: string | null
          payment_method?: string
          payment_status?: string
          payment_txn_ref?: string | null
          phone?: string
          qc_reprint_count?: number
          recipient?: string
          redelivery_used?: boolean
          rejected_at?: string | null
          review_queued_at?: string | null
          shipper_note?: string | null
          shipping_fee?: number
          shipping_tier?: string
          standard_fee?: number
          status?: Database["public"]["Enums"]["order_status"]
          status_detail?: string
          ticket_id?: string | null
          total?: number
          transit_max?: number
          transit_min?: number
          updated_at?: string
          user_id?: string
          version?: number
          ward?: string
          warehouse_disputed?: boolean
          warehouse_hold_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_models: {
        Row: {
          brand: string
          created_at: string
          custom_price: number
          has_3d_model: boolean
          id: string
          is_active: boolean
          mask_image_url: string | null
          model_3d_url: string | null
          name: string
          slug: string
        }
        Insert: {
          brand: string
          created_at?: string
          custom_price: number
          has_3d_model?: boolean
          id?: string
          is_active?: boolean
          mask_image_url?: string | null
          model_3d_url?: string | null
          name: string
          slug: string
        }
        Update: {
          brand?: string
          created_at?: string
          custom_price?: number
          has_3d_model?: boolean
          id?: string
          is_active?: boolean
          mask_image_url?: string | null
          model_3d_url?: string | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      policy_consents: {
        Row: {
          accepted_at: string
          id: string
          order_id: string
          policy_version: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          order_id: string
          policy_version: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          order_id?: string
          policy_version?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_consents_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color_sku: string | null
          created_at: string
          id: string
          inventory_item_id: string
          is_active: boolean
          name: string | null
          phone_model_id: string | null
          price: number
          product_id: string
        }
        Insert: {
          color_sku?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          is_active?: boolean
          name?: string | null
          phone_model_id?: string | null
          price: number
          product_id: string
        }
        Update: {
          color_sku?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_active?: boolean
          name?: string | null
          phone_model_id?: string | null
          price?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "stock_availability"
            referencedColumns: ["inventory_item_id"]
          },
          {
            foreignKeyName: "product_variants_phone_model_id_fkey"
            columns: ["phone_model_id"]
            isOneToOne: false
            referencedRelation: "phone_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          art_url: string | null
          badge: string | null
          caption: string | null
          category: string | null
          collection: string | null
          created_at: string
          description: string
          finish: string | null
          gallery_urls: string[]
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          premium: number
          product_type: Database["public"]["Enums"]["product_type"]
          slug: string
          styles: string[]
          tags: string[]
        }
        Insert: {
          art_url?: string | null
          badge?: string | null
          caption?: string | null
          category?: string | null
          collection?: string | null
          created_at?: string
          description?: string
          finish?: string | null
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          premium?: number
          product_type: Database["public"]["Enums"]["product_type"]
          slug: string
          styles?: string[]
          tags?: string[]
        }
        Update: {
          art_url?: string | null
          badge?: string | null
          caption?: string | null
          category?: string | null
          collection?: string | null
          created_at?: string
          description?: string
          finish?: string | null
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          premium?: number
          product_type?: Database["public"]["Enums"]["product_type"]
          slug?: string
          styles?: string[]
          tags?: string[]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          deletion_requested_at: string | null
          device_type: string | null
          display_name: string | null
          gender: string | null
          id: string
          onboarding_status: string
          phone: string | null
          preferences: string[]
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          device_type?: string | null
          display_name?: string | null
          gender?: string | null
          id: string
          onboarding_status?: string
          phone?: string | null
          preferences?: string[]
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          device_type?: string | null
          display_name?: string | null
          gender?: string | null
          id?: string
          onboarding_status?: string
          phone?: string | null
          preferences?: string[]
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      refund_requests: {
        Row: {
          account_holder: string | null
          account_no: string | null
          amount: number
          approved_by: string | null
          bank: string | null
          bank_ref: string | null
          created_at: string
          deducted_fee: number
          escalated_at: string | null
          id: string
          order_id: string
          refund_method: string | null
          reject_reason: string | null
          reminder_sent_at: string | null
          resolved_at: string | null
          situation: string
          status: string
          transfer_attempts: number
        }
        Insert: {
          account_holder?: string | null
          account_no?: string | null
          amount: number
          approved_by?: string | null
          bank?: string | null
          bank_ref?: string | null
          created_at?: string
          deducted_fee?: number
          escalated_at?: string | null
          id?: string
          order_id: string
          refund_method?: string | null
          reject_reason?: string | null
          reminder_sent_at?: string | null
          resolved_at?: string | null
          situation: string
          status?: string
          transfer_attempts?: number
        }
        Update: {
          account_holder?: string | null
          account_no?: string | null
          amount?: number
          approved_by?: string | null
          bank?: string | null
          bank_ref?: string | null
          created_at?: string
          deducted_fee?: number
          escalated_at?: string | null
          id?: string
          order_id?: string
          refund_method?: string | null
          reject_reason?: string | null
          reminder_sent_at?: string | null
          resolved_at?: string | null
          situation?: string
          status?: string
          transfer_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier: string
          created_at: string
          id: string
          order_id: string
          tracking_code: string
        }
        Insert: {
          carrier: string
          created_at?: string
          id?: string
          order_id: string
          tracking_code: string
        }
        Update: {
          carrier?: string
          created_at?: string
          id?: string
          order_id?: string
          tracking_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      template_comments: {
        Row: {
          author_name: string
          comment: string
          created_at: string
          device_model: string | null
          id: string
          template_id: string
          user_id: string
        }
        Insert: {
          author_name?: string
          comment: string
          created_at?: string
          device_model?: string | null
          id?: string
          template_id: string
          user_id?: string
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string
          device_model?: string | null
          id?: string
          template_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test: {
        Row: {
          id: string
          title: string
        }
        Insert: {
          id?: string
          title: string
        }
        Update: {
          id?: string
          title?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          order_id: string | null
          payload: Json
          received_at: string
          type: string
        }
        Insert: {
          event_id: string
          order_id?: string | null
          payload?: Json
          received_at?: string
          type: string
        }
        Update: {
          event_id?: string
          order_id?: string | null
          payload?: Json
          received_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stock_availability: {
        Row: {
          available: number | null
          inventory_item_id: string | null
        }
        Insert: {
          available?: number | null
          inventory_item_id?: string | null
        }
        Update: {
          available?: number | null
          inventory_item_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_working_days: {
        Args: { p_count: number; p_day: string }
        Returns: string
      }
      apply_carrier_event: {
        Args: {
          p_event_id: string
          p_failure_cause?: string
          p_order_id: string
          p_type: string
        }
        Returns: string
      }
      apply_ticket_result: {
        Args: { p_note?: string; p_order_id: string; p_resolution: string }
        Returns: undefined
      }
      approve_refund: { Args: { p_refund_id: string }; Returns: undefined }
      batch_date_for: { Args: { p_at: string }; Returns: string }
      cancel_after_failure: { Args: { p_order_id: string }; Returns: undefined }
      cancel_order: { Args: { p_order_id: string }; Returns: undefined }
      cancel_rejected_order: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      complete_refund: {
        Args: { p_bank_ref: string; p_refund_id: string }
        Returns: undefined
      }
      confirm_received: { Args: { p_order_id: string }; Returns: undefined }
      create_refund: {
        Args: {
          p_order: Database["public"]["Tables"]["orders"]["Row"]
          p_situation: string
        }
        Returns: undefined
      }
      current_app_role: { Args: never; Returns: string }
      decide_cancel_request: {
        Args: { p_accept: boolean; p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      is_customer_fault: { Args: { p_cause: string }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_working_day: { Args: { p_day: string }; Returns: boolean }
      list_open_orders: {
        Args: never
        Returns: {
          order_code: string
          status_detail: string
        }[]
      }
      lock_order: {
        Args: { p_order_id: string; p_own: boolean }
        Returns: {
          address_line: string
          auto_complete_at: string | null
          batch_date: string | null
          checkout_ref: string | null
          city: string
          confirm_due_at: string | null
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          design_fix_reminded_at: string | null
          design_resubmit_count: number
          discount: number
          district: string | null
          earliest_edd: string | null
          express_surcharge: number
          failure_cause: string | null
          fault_override: string | null
          frozen_at: string | null
          gift_message: string | null
          goods_total: number
          id: string
          late_voucher_issued: boolean
          latest_edd: string | null
          order_code: string | null
          payment_channel: string | null
          payment_method: string
          payment_status: string
          payment_txn_ref: string | null
          phone: string
          qc_reprint_count: number
          recipient: string
          redelivery_used: boolean
          rejected_at: string | null
          review_queued_at: string | null
          shipper_note: string | null
          shipping_fee: number
          shipping_tier: string
          standard_fee: number
          status: Database["public"]["Enums"]["order_status"]
          status_detail: string
          ticket_id: string | null
          total: number
          transit_max: number
          transit_min: number
          updated_at: string
          user_id: string
          version: number
          ward: string
          warehouse_disputed: boolean
          warehouse_hold_until: string | null
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      lock_refund: {
        Args: { p_refund_id: string }
        Returns: {
          account_holder: string | null
          account_no: string | null
          amount: number
          approved_by: string | null
          bank: string | null
          bank_ref: string | null
          created_at: string
          deducted_fee: number
          escalated_at: string | null
          id: string
          order_id: string
          refund_method: string | null
          reject_reason: string | null
          reminder_sent_at: string | null
          resolved_at: string | null
          situation: string
          status: string
          transfer_attempts: number
        }
        SetofOptions: {
          from: "*"
          to: "refund_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_order_note: {
        Args: { p_actor_type: string; p_order_id: string; p_reason: string }
        Returns: undefined
      }
      mark_packed: { Args: { p_order_id: string }; Returns: undefined }
      mark_qc_reprint: { Args: { p_order_id: string }; Returns: undefined }
      mark_transfer_failed: {
        Args: { p_refund_id: string }
        Returns: undefined
      }
      moderate_design: {
        Args: {
          p_approve: boolean
          p_order_id: string
          p_reason?: string
          p_violation?: string
        }
        Returns: undefined
      }
      notify: {
        Args: {
          p_body: string
          p_link?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      order_has_custom: { Args: { p_order_id: string }; Returns: boolean }
      order_link: { Args: { p_code: string }; Returns: string }
      order_on_hold: { Args: { p_order_id: string }; Returns: boolean }
      order_status_for: {
        Args: { p_detail: string }
        Returns: Database["public"]["Enums"]["order_status"]
      }
      owns_order: { Args: { p_order_id: string }; Returns: boolean }
      place_order: {
        Args: { p_items: Json; p_shipping: Json }
        Returns: string
      }
      reject_refund: {
        Args: { p_reason: string; p_refund_id: string }
        Returns: undefined
      }
      report_issue: {
        Args: { p_order_id: string; p_ticket_id: string }
        Returns: undefined
      }
      request_cancel: {
        Args: { p_note?: string; p_order_id: string; p_reason: string }
        Returns: undefined
      }
      request_redelivery: { Args: { p_order_id: string }; Returns: undefined }
      require_role: { Args: { p_roles: string[] }; Returns: undefined }
      resolve_dispute: {
        Args: { p_customer_right: boolean; p_note?: string; p_order_id: string }
        Returns: undefined
      }
      restock_order: { Args: { p_order_id: string }; Returns: undefined }
      restock_stock_items: { Args: { p_order_id: string }; Returns: undefined }
      resubmit_design: { Args: { p_order_id: string }; Returns: undefined }
      retry_transfer: { Args: { p_refund_id: string }; Returns: undefined }
      run_order_jobs: { Args: never; Returns: undefined }
      run_order_jobs_v9: { Args: never; Returns: undefined }
      set_order_actor: {
        Args: { p_actor_type: string; p_reason: string }
        Returns: undefined
      }
      sim_create_sample_order: {
        Args: {
          p_email: string
          p_kind: string
          p_payment: string
          p_tier?: string
        }
        Returns: string
      }
      sim_run_jobs: { Args: never; Returns: undefined }
      sim_time_travel: {
        Args: { p_minutes: number; p_order_id: string }
        Returns: undefined
      }
      start_production: { Args: never; Returns: number }
      submit_refund_account: {
        Args: {
          p_account_no: string
          p_bank: string
          p_holder: string
          p_refund_id: string
        }
        Returns: undefined
      }
      vn_now: { Args: never; Returns: string }
      withdraw_cancel_request: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      working_days_between: {
        Args: { p_from: string; p_to: string }
        Returns: number
      }
    }
    Enums: {
      inventory_kind: "blank" | "material" | "trade_good"
      order_status:
        | "pending"
        | "confirmed"
        | "shipping"
        | "delivered"
        | "cancelled"
      product_type: "case" | "accessory"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      inventory_kind: ["blank", "material", "trade_good"],
      order_status: [
        "pending",
        "confirmed",
        "shipping",
        "delivered",
        "cancelled",
      ],
      product_type: ["case", "accessory"],
    },
  },
} as const
