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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address: string
          area: string
          created_at: string
          district_id: string
          id: string
          is_default: boolean
          label: string
          local_area: string
          name: string
          phone: string
          street_address: string
          upazila_id: string
          user_id: string
        }
        Insert: {
          address: string
          area?: string
          created_at?: string
          district_id?: string
          id?: string
          is_default?: boolean
          label?: string
          local_area?: string
          name: string
          phone: string
          street_address?: string
          upazila_id?: string
          user_id: string
        }
        Update: {
          address?: string
          area?: string
          created_at?: string
          district_id?: string
          id?: string
          is_default?: boolean
          label?: string
          local_area?: string
          name?: string
          phone?: string
          street_address?: string
          upazila_id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_translation_usage: {
        Row: {
          characters: number
          requests: number
          usage_day: string
          user_id: string
        }
        Insert: {
          characters?: number
          requests?: number
          usage_day: string
          user_id: string
        }
        Update: {
          characters?: number
          requests?: number
          usage_day?: string
          user_id?: string
        }
        Relationships: []
      }
      app_branding: {
        Row: {
          admin_logo: string
          admin_name: string
          android_icon: string
          app_logo: string
          favicon: string
          id: number
          menu_logo: string
          name_bn: string
          name_en: string
        }
        Insert: {
          admin_logo?: string
          admin_name?: string
          android_icon?: string
          app_logo?: string
          favicon?: string
          id?: number
          menu_logo?: string
          name_bn?: string
          name_en?: string
        }
        Update: {
          admin_logo?: string
          admin_name?: string
          android_icon?: string
          app_logo?: string
          favicon?: string
          id?: number
          menu_logo?: string
          name_bn?: string
          name_en?: string
        }
        Relationships: []
      }
      app_ui_settings: {
        Row: {
          admin_names: Json
          entry_offer: Json
          fonts: Json
          icons: Json
          id: number
          nav_items: Json | null
          profile_items: Json | null
          shortcuts: Json
          ticker_link: string
        }
        Insert: {
          admin_names?: Json
          entry_offer?: Json
          fonts?: Json
          icons?: Json
          id?: number
          nav_items?: Json | null
          profile_items?: Json | null
          shortcuts?: Json
          ticker_link?: string
        }
        Update: {
          admin_names?: Json
          entry_offer?: Json
          fonts?: Json
          icons?: Json
          id?: number
          nav_items?: Json | null
          profile_items?: Json | null
          shortcuts?: Json
          ticker_link?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          changes: Json
          created_at: string
          id: string
          row_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor?: string | null
          changes?: Json
          created_at?: string
          id?: string
          row_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor?: string | null
          changes?: Json
          created_at?: string
          id?: string
          row_id?: string
          table_name?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          alt_bn: string
          alt_en: string
          created_at: string
          id: string
          image: string
          image_en: string
          link: string
          sort: number
          visible: boolean
        }
        Insert: {
          alt_bn?: string
          alt_en?: string
          created_at?: string
          id?: string
          image: string
          image_en?: string
          link?: string
          sort?: number
          visible?: boolean
        }
        Update: {
          alt_bn?: string
          alt_en?: string
          created_at?: string
          id?: string
          image?: string
          image_en?: string
          link?: string
          sort?: number
          visible?: boolean
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string
          key: string
          name_bn: string
          name_en: string
          sort: number
          visible: boolean
        }
        Insert: {
          icon?: string
          key: string
          name_bn: string
          name_en?: string
          sort?: number
          visible?: boolean
        }
        Update: {
          icon?: string
          key?: string
          name_bn?: string
          name_en?: string
          sort?: number
          visible?: boolean
        }
        Relationships: []
      }
      certifications: {
        Row: {
          cert_no: string
          created_at: string
          doc_url: string
          id: string
          image: string
          issuer: string
          issuer_en: string
          scope: string
          scope_en: string
          sort: number
          title: string
          title_en: string
          valid_until: string
        }
        Insert: {
          cert_no?: string
          created_at?: string
          doc_url?: string
          id?: string
          image?: string
          issuer?: string
          issuer_en?: string
          scope?: string
          scope_en?: string
          sort?: number
          title: string
          title_en?: string
          valid_until?: string
        }
        Update: {
          cert_no?: string
          created_at?: string
          doc_url?: string
          id?: string
          image?: string
          issuer?: string
          issuer_en?: string
          scope?: string
          scope_en?: string
          sort?: number
          title?: string
          title_en?: string
          valid_until?: string
        }
        Relationships: []
      }
      customer_communication_settings: {
        Row: {
          app_origin: string
          id: number
          sms_enabled: boolean
        }
        Insert: {
          app_origin?: string
          id: number
          sms_enabled?: boolean
        }
        Update: {
          app_origin?: string
          id?: number
          sms_enabled?: boolean
        }
        Relationships: []
      }
      customer_product_reviews: {
        Row: {
          author_name: string
          body: string
          created_at: string
          hidden: boolean
          id: string
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          body: string
          created_at?: string
          hidden?: boolean
          id?: string
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          hidden?: boolean
          id?: string
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_sms_queue: {
        Row: {
          attempted_at: string | null
          body: string
          booking_id: string | null
          created_at: string
          dedupe_key: string
          error: string
          id: string
          order_id: string | null
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempted_at?: string | null
          body: string
          booking_id?: string | null
          created_at?: string
          dedupe_key: string
          error?: string
          id?: string
          order_id?: string | null
          phone: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempted_at?: string | null
          body?: string
          booking_id?: string | null
          created_at?: string
          dedupe_key?: string
          error?: string
          id?: string
          order_id?: string | null
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_sms_queue_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "doctor_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_sms_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_booking_events: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          booking_id: string
          created_at: string
          id: string
          kind: string
          note: string
          payment_status: string
          previous_date: string | null
          previous_time: string | null
          status: string
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          booking_id: string
          created_at?: string
          id?: string
          kind: string
          note?: string
          payment_status: string
          previous_date?: string | null
          previous_time?: string | null
          status: string
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          booking_id?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string
          payment_status?: string
          previous_date?: string | null
          previous_time?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "doctor_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_booking_intents: {
        Row: {
          amount: number
          booking_id: string | null
          consultation_mode: string
          created_at: string
          doctor_id: string
          id: string
          patient: Json
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          consultation_mode: string
          created_at?: string
          doctor_id: string
          id: string
          patient: Json
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          consultation_mode?: string
          created_at?: string
          doctor_id?: string
          id?: string
          patient?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_booking_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "doctor_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_booking_intents_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_bookings: {
        Row: {
          address: string
          admin_note: string
          concern: string
          consultation_mode: string
          created_at: string
          doctor_id: string
          fee: number | null
          id: string
          patient_age: number | null
          patient_name: string
          payment_status: string
          phone: string
          preferred_date: string | null
          preferred_time: string | null
          requested_date: string | null
          requested_time: string | null
          serial_number: string
          sms_note: string
          status: string
          user_id: string
        }
        Insert: {
          address?: string
          admin_note?: string
          concern?: string
          consultation_mode?: string
          created_at?: string
          doctor_id: string
          fee?: number | null
          id?: string
          patient_age?: number | null
          patient_name: string
          payment_status?: string
          phone: string
          preferred_date?: string | null
          preferred_time?: string | null
          requested_date?: string | null
          requested_time?: string | null
          serial_number?: string
          sms_note?: string
          status?: string
          user_id: string
        }
        Update: {
          address?: string
          admin_note?: string
          concern?: string
          consultation_mode?: string
          created_at?: string
          doctor_id?: string
          fee?: number | null
          id?: string
          patient_age?: number | null
          patient_name?: string
          payment_status?: string
          phone?: string
          preferred_date?: string | null
          preferred_time?: string | null
          requested_date?: string | null
          requested_time?: string | null
          serial_number?: string
          sms_note?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_bookings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_payment_sessions: {
        Row: {
          amount: number
          created_at: string
          gateway_url: string | null
          id: string
          intent_id: string
          method: string
          paid_at: string | null
          provider_session: string | null
          status: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_url?: string | null
          id: string
          intent_id: string
          method: string
          paid_at?: string | null
          provider_session?: string | null
          status?: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_url?: string | null
          id?: string
          intent_id?: string
          method?: string
          paid_at?: string | null
          provider_session?: string | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_payment_sessions_intent_id_fkey"
            columns: ["intent_id"]
            isOneToOne: true
            referencedRelation: "doctor_booking_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          achievements: string
          achievements_en: string
          availability: string
          bio_bn: string
          bio_en: string
          bmdc_number: string
          booking_schedule: Json
          certification: string
          certification_en: string
          certification_image: string
          consultation_fee: number | null
          consultation_free: boolean
          consultation_minutes: number | null
          consultation_note: string
          consultation_note_en: string
          consultation_payment_url: string
          created_at: string
          degree: string
          degree_en: string
          designation: string
          designation_en: string
          doctor_code: string
          education: string
          education_en: string
          experience: string
          experience_en: string
          followup_days: number | null
          followup_fee: number | null
          id: string
          in_person_fee: number | null
          in_person_free: boolean
          in_person_schedule: string
          in_person_schedule_en: string
          joined_on: string | null
          languages_bn: string
          languages_en: string
          name: string
          name_en: string
          patients_seen: number | null
          phone: string
          photo: string
          profile_clips: Json
          profile_position: string
          profile_rating: number | null
          profile_review_count: number | null
          profile_reviews: Json
          schedule: string
          schedule_en: string
          services_bn: string
          services_en: string
          specialty_bn: string
          specialty_en: string
          training_bn: string
          training_en: string
          whatsapp: string
          workplace: string
          workplace_en: string
        }
        Insert: {
          achievements?: string
          achievements_en?: string
          availability?: string
          bio_bn?: string
          bio_en?: string
          bmdc_number?: string
          booking_schedule?: Json
          certification?: string
          certification_en?: string
          certification_image?: string
          consultation_fee?: number | null
          consultation_free?: boolean
          consultation_minutes?: number | null
          consultation_note?: string
          consultation_note_en?: string
          consultation_payment_url?: string
          created_at?: string
          degree?: string
          degree_en?: string
          designation?: string
          designation_en?: string
          doctor_code?: string
          education?: string
          education_en?: string
          experience?: string
          experience_en?: string
          followup_days?: number | null
          followup_fee?: number | null
          id?: string
          in_person_fee?: number | null
          in_person_free?: boolean
          in_person_schedule?: string
          in_person_schedule_en?: string
          joined_on?: string | null
          languages_bn?: string
          languages_en?: string
          name: string
          name_en?: string
          patients_seen?: number | null
          phone?: string
          photo?: string
          profile_clips?: Json
          profile_position?: string
          profile_rating?: number | null
          profile_review_count?: number | null
          profile_reviews?: Json
          schedule?: string
          schedule_en?: string
          services_bn?: string
          services_en?: string
          specialty_bn?: string
          specialty_en?: string
          training_bn?: string
          training_en?: string
          whatsapp?: string
          workplace?: string
          workplace_en?: string
        }
        Update: {
          achievements?: string
          achievements_en?: string
          availability?: string
          bio_bn?: string
          bio_en?: string
          bmdc_number?: string
          booking_schedule?: Json
          certification?: string
          certification_en?: string
          certification_image?: string
          consultation_fee?: number | null
          consultation_free?: boolean
          consultation_minutes?: number | null
          consultation_note?: string
          consultation_note_en?: string
          consultation_payment_url?: string
          created_at?: string
          degree?: string
          degree_en?: string
          designation?: string
          designation_en?: string
          doctor_code?: string
          education?: string
          education_en?: string
          experience?: string
          experience_en?: string
          followup_days?: number | null
          followup_fee?: number | null
          id?: string
          in_person_fee?: number | null
          in_person_free?: boolean
          in_person_schedule?: string
          in_person_schedule_en?: string
          joined_on?: string | null
          languages_bn?: string
          languages_en?: string
          name?: string
          name_en?: string
          patients_seen?: number | null
          phone?: string
          photo?: string
          profile_clips?: Json
          profile_position?: string
          profile_rating?: number | null
          profile_review_count?: number | null
          profile_reviews?: Json
          schedule?: string
          schedule_en?: string
          services_bn?: string
          services_en?: string
          specialty_bn?: string
          specialty_en?: string
          training_bn?: string
          training_en?: string
          whatsapp?: string
          workplace?: string
          workplace_en?: string
        }
        Relationships: []
      }
      favourites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favourites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_spin_awards: {
        Row: {
          campaign: string
          created_at: string
          customer_name: string
          expires_at: string
          id: string
          order_code: string | null
          phone: string
          prize: Json
          token_hash: string
          user_id: string | null
        }
        Insert: {
          campaign: string
          created_at?: string
          customer_name: string
          expires_at?: string
          id?: string
          order_code?: string | null
          phone: string
          prize: Json
          token_hash: string
          user_id?: string | null
        }
        Update: {
          campaign?: string
          created_at?: string
          customer_name?: string
          expires_at?: string
          id?: string
          order_code?: string | null
          phone?: string
          prize?: Json
          token_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          device_id: string | null
          error: string
          id: string
          message_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          device_id?: string | null
          error?: string
          id?: string
          message_id?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          device_id?: string | null
          error?: string
          id?: string
          message_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_delivery_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "notification_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_messages: {
        Row: {
          body_bn: string
          body_en: string
          created_at: string
          daily_time: string | null
          dispatched_at: string | null
          expires_at: string | null
          id: string
          kind: string
          last_daily_dispatch: string | null
          link: string
          published: boolean
          schedule_mode: string
          starts_at: string
          tip_slot: string | null
          title_bn: string
          title_en: string
        }
        Insert: {
          body_bn: string
          body_en?: string
          created_at?: string
          daily_time?: string | null
          dispatched_at?: string | null
          expires_at?: string | null
          id?: string
          kind: string
          last_daily_dispatch?: string | null
          link?: string
          published?: boolean
          schedule_mode?: string
          starts_at?: string
          tip_slot?: string | null
          title_bn: string
          title_en?: string
        }
        Update: {
          body_bn?: string
          body_en?: string
          created_at?: string
          daily_time?: string | null
          dispatched_at?: string | null
          expires_at?: string | null
          id?: string
          kind?: string
          last_daily_dispatch?: string | null
          link?: string
          published?: boolean
          schedule_mode?: string
          starts_at?: string
          tip_slot?: string | null
          title_bn?: string
          title_en?: string
        }
        Relationships: []
      }
      notification_occurrence_claims: {
        Row: {
          claimed_at: string
          device_id: string
          message_id: string
          occurrence_date: string
        }
        Insert: {
          claimed_at?: string
          device_id: string
          message_id: string
          occurrence_date: string
        }
        Update: {
          claimed_at?: string
          device_id?: string
          message_id?: string
          occurrence_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_occurrence_claims_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_occurrence_claims_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "notification_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_push_claims: {
        Row: {
          claimed_at: string
          device_id: string
          message_id: string
        }
        Insert: {
          claimed_at?: string
          device_id: string
          message_id: string
        }
        Update: {
          claimed_at?: string
          device_id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_push_claims_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "push_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_push_claims_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "notification_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          daily_enabled: boolean
          id: number
        }
        Insert: {
          daily_enabled?: boolean
          id: number
        }
        Update: {
          daily_enabled?: boolean
          id?: number
        }
        Relationships: []
      }
      offers: {
        Row: {
          created_at: string
          description_bn: string
          description_en: string
          id: string
          image: string
          link: string
          old_price: number | null
          price: number | null
          product_id: string | null
          sort: number
          title_bn: string
          title_en: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          description_bn?: string
          description_en?: string
          id?: string
          image?: string
          link?: string
          old_price?: number | null
          price?: number | null
          product_id?: string | null
          sort?: number
          title_bn?: string
          title_en?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          description_bn?: string
          description_en?: string
          id?: string
          image?: string
          link?: string
          old_price?: number | null
          price?: number | null
          product_id?: string | null
          sort?: number
          title_bn?: string
          title_en?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          id: string
          occurred_at: string
          order_id: string
          status: string
        }
        Insert: {
          id?: string
          occurred_at?: string
          order_id: string
          status: string
        }
        Update: {
          id?: string
          occurred_at?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_tracking_tokens: {
        Row: {
          expires_at: string
          order_id: string
          token_hash: string
        }
        Insert: {
          expires_at?: string
          order_id: string
          token_hash: string
        }
        Update: {
          expires_at?: string
          order_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_tokens_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          area: string
          code: string
          created_at: string
          customer_name: string
          delivery_fee: number
          discount_amount: number
          id: string
          items: Json
          note: string | null
          paid_amount: number | null
          payment_method: string
          payment_status: string
          phone: string
          promo_code: string | null
          status: string
          subtotal: number
          total: number
          tracking: string
          trx_id: string | null
          user_id: string | null
        }
        Insert: {
          address: string
          area: string
          code: string
          created_at?: string
          customer_name: string
          delivery_fee: number
          discount_amount?: number
          id?: string
          items: Json
          note?: string | null
          paid_amount?: number | null
          payment_method: string
          payment_status?: string
          phone: string
          promo_code?: string | null
          status?: string
          subtotal: number
          total: number
          tracking?: string
          trx_id?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string
          area?: string
          code?: string
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          discount_amount?: number
          id?: string
          items?: Json
          note?: string | null
          paid_amount?: number | null
          payment_method?: string
          payment_status?: string
          phone?: string
          promo_code?: string | null
          status?: string
          subtotal?: number
          total?: number
          tracking?: string
          trx_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      outlets: {
        Row: {
          address: string
          address_en: string
          id: string
          map_url: string
          name: string
          name_en: string
          phone: string
          photo: string
          sort: number
          visible: boolean
        }
        Insert: {
          address?: string
          address_en?: string
          id?: string
          map_url?: string
          name: string
          name_en?: string
          phone?: string
          photo?: string
          sort?: number
          visible?: boolean
        }
        Update: {
          address?: string
          address_en?: string
          id?: string
          map_url?: string
          name?: string
          name_en?: string
          phone?: string
          photo?: string
          sort?: number
          visible?: boolean
        }
        Relationships: []
      }
      payment_sessions: {
        Row: {
          amount: number
          created_at: string
          gateway_url: string | null
          id: string
          method: string
          order_id: string
          paid_at: string | null
          provider_session: string | null
          status: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_url?: string | null
          id: string
          method: string
          order_id: string
          paid_at?: string | null
          provider_session?: string | null
          status: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_url?: string | null
          id?: string
          method?: string
          order_id?: string
          paid_at?: string | null
          provider_session?: string | null
          status?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          body_bn: string
          body_en: string
          category: string
          created_at: string
          excerpt_bn: string
          excerpt_en: string
          id: string
          image: string
          kind: string
          reviewed_at: string | null
          sources: string
          status: string
          title_bn: string
          title_en: string
        }
        Insert: {
          body_bn?: string
          body_en?: string
          category?: string
          created_at?: string
          excerpt_bn?: string
          excerpt_en?: string
          id?: string
          image?: string
          kind?: string
          reviewed_at?: string | null
          sources?: string
          status?: string
          title_bn: string
          title_en?: string
        }
        Update: {
          body_bn?: string
          body_en?: string
          category?: string
          created_at?: string
          excerpt_bn?: string
          excerpt_en?: string
          id?: string
          image?: string
          kind?: string
          reviewed_at?: string | null
          sources?: string
          status?: string
          title_bn?: string
          title_en?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          badges: Json
          benefits_bn: string
          benefits_en: string
          best_selling: boolean
          category: string
          category_key: string | null
          caution_bn: string
          caution_en: string
          created_at: string
          desc_bn: string
          desc_en: string
          featured: boolean
          gallery: Json
          id: string
          image: string
          in_stock: boolean
          ingredients_bn: string
          ingredients_en: string
          manual_locked: boolean
          name_bn: string
          name_en: string
          offer_text_bn: string
          offer_text_en: string
          old_price: number | null
          price: number
          purpose_bn: string
          purpose_en: string
          related: Json
          short_bn: string
          short_en: string
          sku: string
          sort: number
          source_url: string
          status: string
          usage_bn: string
          usage_en: string
          variants: Json
        }
        Insert: {
          active?: boolean
          badges?: Json
          benefits_bn?: string
          benefits_en?: string
          best_selling?: boolean
          category?: string
          category_key?: string | null
          caution_bn?: string
          caution_en?: string
          created_at?: string
          desc_bn?: string
          desc_en?: string
          featured?: boolean
          gallery?: Json
          id?: string
          image?: string
          in_stock?: boolean
          ingredients_bn?: string
          ingredients_en?: string
          manual_locked?: boolean
          name_bn: string
          name_en?: string
          offer_text_bn?: string
          offer_text_en?: string
          old_price?: number | null
          price: number
          purpose_bn?: string
          purpose_en?: string
          related?: Json
          short_bn?: string
          short_en?: string
          sku?: string
          sort?: number
          source_url?: string
          status?: string
          usage_bn?: string
          usage_en?: string
          variants?: Json
        }
        Update: {
          active?: boolean
          badges?: Json
          benefits_bn?: string
          benefits_en?: string
          best_selling?: boolean
          category?: string
          category_key?: string | null
          caution_bn?: string
          caution_en?: string
          created_at?: string
          desc_bn?: string
          desc_en?: string
          featured?: boolean
          gallery?: Json
          id?: string
          image?: string
          in_stock?: boolean
          ingredients_bn?: string
          ingredients_en?: string
          manual_locked?: boolean
          name_bn?: string
          name_en?: string
          offer_text_bn?: string
          offer_text_en?: string
          old_price?: number | null
          price?: number
          purpose_bn?: string
          purpose_en?: string
          related?: Json
          short_bn?: string
          short_en?: string
          sku?: string
          sort?: number
          source_url?: string
          status?: string
          usage_bn?: string
          usage_en?: string
          variants?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          avatar?: string
          email?: string
          full_name?: string
          id: string
          phone?: string
          updated_at?: string
        }
        Update: {
          avatar?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          enabled: boolean
          expires_at: string | null
          id: string
          max_discount: number | null
          max_uses: number | null
          min_subtotal: number
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          max_uses?: number | null
          min_subtotal?: number
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          enabled?: boolean
          expires_at?: string | null
          id?: string
          max_discount?: number | null
          max_uses?: number | null
          min_subtotal?: number
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          enabled: boolean
          id: string
          last_attempt_date: string | null
          secret_hash: string
          token: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id: string
          last_attempt_date?: string | null
          secret_hash: string
          token: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          last_attempt_date?: string | null
          secret_hash?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          aspect: string
          created_at: string
          hidden: boolean
          id: string
          media_type: string
          media_url: string
          name: string
          name_en: string
          product_id: string | null
          rating: number | null
          sort: number
          source_url: string
          text_bn: string
          text_en: string
        }
        Insert: {
          aspect?: string
          created_at?: string
          hidden?: boolean
          id?: string
          media_type?: string
          media_url: string
          name?: string
          name_en?: string
          product_id?: string | null
          rating?: number | null
          sort?: number
          source_url?: string
          text_bn?: string
          text_en?: string
        }
        Update: {
          aspect?: string
          created_at?: string
          hidden?: boolean
          id?: string
          media_type?: string
          media_url?: string
          name?: string
          name_en?: string
          product_id?: string | null
          rating?: number | null
          sort?: number
          source_url?: string
          text_bn?: string
          text_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          banner_image: string
          banner_sub_bn: string
          banner_sub_en: string
          banner_title_bn: string
          banner_title_en: string
          bkash: string
          email: string
          facebook: string
          fee_dhaka: number
          fee_outside: number
          free_delivery_min: number | null
          home_sections: Json
          id: number
          imo: string
          instagram: string
          nagad: string
          payments: Json
          phone_auth_enabled: boolean
          play_store_url: string
          support_phone: string
          ticker_bn: string
          ticker_en: string
          ticker_enabled: boolean
          tiktok: string
          whatsapp: string
          youtube: string
        }
        Insert: {
          banner_image?: string
          banner_sub_bn?: string
          banner_sub_en?: string
          banner_title_bn?: string
          banner_title_en?: string
          bkash?: string
          email?: string
          facebook?: string
          fee_dhaka?: number
          fee_outside?: number
          free_delivery_min?: number | null
          home_sections?: Json
          id?: number
          imo?: string
          instagram?: string
          nagad?: string
          payments?: Json
          phone_auth_enabled?: boolean
          play_store_url?: string
          support_phone?: string
          ticker_bn?: string
          ticker_en?: string
          ticker_enabled?: boolean
          tiktok?: string
          whatsapp?: string
          youtube?: string
        }
        Update: {
          banner_image?: string
          banner_sub_bn?: string
          banner_sub_en?: string
          banner_title_bn?: string
          banner_title_en?: string
          bkash?: string
          email?: string
          facebook?: string
          fee_dhaka?: number
          fee_outside?: number
          free_delivery_min?: number | null
          home_sections?: Json
          id?: number
          imo?: string
          instagram?: string
          nagad?: string
          payments?: Json
          phone_auth_enabled?: boolean
          play_store_url?: string
          support_phone?: string
          ticker_bn?: string
          ticker_en?: string
          ticker_enabled?: boolean
          tiktok?: string
          whatsapp?: string
          youtube?: string
        }
        Relationships: []
      }
      spin_awards: {
        Row: {
          campaign: string
          created_at: string
          expires_at: string
          id: string
          order_code: string | null
          prize: Json
          user_id: string
        }
        Insert: {
          campaign: string
          created_at?: string
          expires_at?: string
          id?: string
          order_code?: string | null
          prize: Json
          user_id: string
        }
        Update: {
          campaign?: string
          created_at?: string
          expires_at?: string
          id?: string
          order_code?: string | null
          prize?: Json
          user_id?: string
        }
        Relationships: []
      }
      spin_campaigns: {
        Row: {
          config: Json
          id: number
        }
        Insert: {
          config?: Json
          id?: number
        }
        Update: {
          config?: Json
          id?: number
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
    }
    Views: {
      customer_sms_admin_log: {
        Row: {
          created_at: string | null
          dedupe_key: string | null
          error: string | null
          id: string | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          dedupe_key?: string | null
          error?: string | null
          id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          dedupe_key?: string | null
          error?: string | null
          id?: string | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_business_report: {
        Args: { _from?: string; _to?: string }
        Returns: Json
      }
      admin_customer_product_reviews: {
        Args: { _page?: number; _search?: string; _state?: string }
        Returns: Json
      }
      admin_customers: {
        Args: { _page?: number; _search?: string }
        Returns: Json
      }
      admin_legacy_doctor_bookings: {
        Args: { _ids: string[] }
        Returns: {
          id: string
        }[]
      }
      admin_spin_dashboard: { Args: never; Returns: Json }
      admin_spin_participants: {
        Args: { _page?: number; _search?: string; _state?: string }
        Returns: Json
      }
      admin_translation_claim: {
        Args: { _characters: number }
        Returns: boolean
      }
      attach_guest_spin: { Args: { _token: string }; Returns: boolean }
      cancel_doctor_booking: { Args: { p_booking: string }; Returns: boolean }
      claim_customer_sms: {
        Args: { _order?: string }
        Returns: {
          attempted_at: string | null
          body: string
          booking_id: string | null
          created_at: string
          dedupe_key: string
          error: string
          id: string
          order_id: string | null
          phone: string
          sent_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "customer_sms_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_daily_push_devices: {
        Args: never
        Returns: {
          id: string
          token: string
        }[]
      }
      claim_message_push_devices: {
        Args: { _message_id: string }
        Returns: {
          id: string
          token: string
        }[]
      }
      claim_notification_occurrence_devices: {
        Args: { _message_id: string; _occurrence_key: string }
        Returns: {
          id: string
          token: string
        }[]
      }
      complete_doctor_gateway_payment: {
        Args: { _session_id: string; _transaction_id: string }
        Returns: string
      }
      complete_gateway_payment: {
        Args: { _session_id: string; _transaction_id: string }
        Returns: undefined
      }
      doctor_call_access: { Args: { _doctor: string }; Returns: string }
      draw_guest_spin: {
        Args: { _name: string; _phone: string; _token: string }
        Returns: Json
      }
      draw_spin: { Args: never; Returns: Json }
      ecory_promo_discount: {
        Args: { _code: string; _subtotal: number }
        Returns: number
      }
      get_spin_campaign: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manage_customer_product_review: {
        Args: { _action: string; _id: string }
        Returns: boolean
      }
      my_product_review: { Args: { _product_id: string }; Returns: Json }
      my_spin_wins: { Args: never; Returns: Json }
      next_due_notification_push: {
        Args: never
        Returns: {
          message_id: string
          occurrence_key: string
          scheduled_for: string
        }[]
      }
      place_guest_spin_order: {
        Args: {
          _address: string
          _area: string
          _code: string
          _expected_discount: number
          _items: Json
          _name: string
          _note: string
          _offer_id?: string
          _payment: string
          _phone: string
          _qty?: number
          _token: string
        }
        Returns: string
      }
      place_offer_order: {
        Args: {
          _address: string
          _area: string
          _name: string
          _note: string
          _offer_id: string
          _payment: string
          _phone: string
          _qty: number
        }
        Returns: string
      }
      place_order: {
        Args: {
          _address: string
          _area: string
          _items: Json
          _name: string
          _note: string
          _payment: string
          _phone: string
          _trx: string
        }
        Returns: string
      }
      place_order_with_promo: {
        Args: {
          _address: string
          _area: string
          _expected_discount: number
          _items: Json
          _name: string
          _note: string
          _offer_id?: string
          _payment: string
          _phone: string
          _promo: string
          _qty?: number
        }
        Returns: string
      }
      place_saved_spin_order: {
        Args: {
          _address: string
          _area: string
          _award_id: string
          _code: string
          _expected_discount: number
          _items: Json
          _name: string
          _note: string
          _offer_id?: string
          _payment: string
          _phone: string
          _qty?: number
          _token: string
        }
        Returns: string
      }
      place_spin_order: {
        Args: {
          _address: string
          _area: string
          _award: string
          _expected_discount: number
          _items: Json
          _name: string
          _note: string
          _offer_id?: string
          _payment: string
          _phone: string
          _qty?: number
        }
        Returns: string
      }
      prepare_doctor_checkout: {
        Args: {
          p_doctor: string
          p_id: string
          p_mode: string
          p_patient: Json
        }
        Returns: Json
      }
      product_customer_reviews: {
        Args: { _page?: number; _product_id: string }
        Returns: Json
      }
      public_product_review_stats: {
        Args: never
        Returns: {
          count: number
          product_id: string
          rating: number
        }[]
      }
      quote_guest_spin_coupon: {
        Args: {
          _code: string
          _delivery: number
          _offer_id?: string
          _phone: string
          _subtotal: number
          _token: string
        }
        Returns: Json
      }
      quote_promo: { Args: { _code: string; _subtotal: number }; Returns: Json }
      quote_saved_spin_coupon: {
        Args: {
          _award_id: string
          _code: string
          _delivery: number
          _offer_id?: string
          _phone: string
          _subtotal: number
          _token: string
        }
        Returns: Json
      }
      quote_spin: {
        Args: { _award: string; _delivery: number; _subtotal: number }
        Returns: Json
      }
      register_push_device: {
        Args: {
          _enabled?: boolean
          _id: string
          _secret: string
          _token: string
        }
        Returns: undefined
      }
      request_doctor_booking:
        | {
            Args: {
              p_age: number
              p_concern: string
              p_date: string
              p_doctor: string
              p_name: string
              p_phone: string
              p_time: string
            }
            Returns: string
          }
        | {
            Args: {
              p_address: string
              p_age: number
              p_concern: string
              p_date: string
              p_doctor: string
              p_name: string
              p_phone: string
              p_time: string
            }
            Returns: string
          }
      request_doctor_booking_mode: {
        Args: {
          p_address: string
          p_age: number
          p_concern: string
          p_date: string
          p_doctor: string
          p_mode: string
          p_name: string
          p_phone: string
          p_time: string
        }
        Returns: string
      }
      save_spin_campaign: { Args: { _config: Json }; Returns: undefined }
      spin_normalize_phone: { Args: { v: string }; Returns: string }
      submit_product_review: {
        Args: {
          _body: string
          _name: string
          _product_id: string
          _rating: number
        }
        Returns: string
      }
      track_order: {
        Args: { _code: string; _phone: string }
        Returns: {
          code: string
          created_at: string
          delivery_fee: number
          items: Json
          payment_method: string
          status: string
          total: number
          tracking: string
        }[]
      }
      track_order_details: {
        Args: { _code: string; _phone: string }
        Returns: Json
      }
      track_order_token: {
        Args: { _code: string; _token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
