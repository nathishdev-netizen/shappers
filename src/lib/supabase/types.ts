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
      attendance_events: {
        Row: {
          checked_in_at: string
          id: string
          local_date: string | null
          member_id: string
          source: Database["public"]["Enums"]["attendance_source"]
          tenant_id: string
        }
        Insert: {
          checked_in_at?: string
          id?: string
          local_date?: string | null
          member_id: string
          source?: Database["public"]["Enums"]["attendance_source"]
          tenant_id: string
        }
        Update: {
          checked_in_at?: string
          id?: string
          local_date?: string | null
          member_id?: string
          source?: Database["public"]["Enums"]["attendance_source"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      body_measurements: {
        Row: {
          arm_cm: number | null
          body_fat_percent: number | null
          chest_cm: number | null
          hips_cm: number | null
          id: string
          member_id: string
          notes: string | null
          recorded_at: string
          tenant_id: string
          thigh_cm: number | null
          waist_cm: number | null
          weight_kg: number | null
        }
        Insert: {
          arm_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          hips_cm?: number | null
          id?: string
          member_id: string
          notes?: string | null
          recorded_at?: string
          tenant_id: string
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Update: {
          arm_cm?: number | null
          body_fat_percent?: number | null
          chest_cm?: number | null
          hips_cm?: number | null
          id?: string
          member_id?: string
          notes?: string | null
          recorded_at?: string
          tenant_id?: string
          thigh_cm?: number | null
          waist_cm?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_measurements_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "body_measurements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          gym_class_id: string
          id: string
          member_id: string
          tenant_id: string
          trainer_id: string | null
        }
        Insert: {
          created_at?: string
          gym_class_id: string
          id?: string
          member_id: string
          tenant_id: string
          trainer_id?: string | null
        }
        Update: {
          created_at?: string
          gym_class_id?: string
          id?: string
          member_id?: string
          tenant_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_gym_class_id_fkey"
            columns: ["gym_class_id"]
            isOneToOne: false
            referencedRelation: "gym_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address_line: string | null
          city: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          opening_hours: string | null
          phone: string | null
          tenant_id: string
        }
        Insert: {
          address_line?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          opening_hours?: string | null
          phone?: string | null
          tenant_id: string
        }
        Update: {
          address_line?: string | null
          city?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          opening_hours?: string | null
          phone?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      diet_plans: {
        Row: {
          carbs_g: number | null
          created_at: string
          daily_calories: number | null
          end_date: string | null
          fat_g: number | null
          goal: Database["public"]["Enums"]["diet_goal"]
          id: string
          is_active: boolean
          meals: Json
          member_id: string
          notes: string | null
          protein_g: number | null
          start_date: string
          tenant_id: string
          title: string
          trainer_id: string | null
        }
        Insert: {
          carbs_g?: number | null
          created_at?: string
          daily_calories?: number | null
          end_date?: string | null
          fat_g?: number | null
          goal?: Database["public"]["Enums"]["diet_goal"]
          id?: string
          is_active?: boolean
          meals: Json
          member_id: string
          notes?: string | null
          protein_g?: number | null
          start_date?: string
          tenant_id: string
          title: string
          trainer_id?: string | null
        }
        Update: {
          carbs_g?: number | null
          created_at?: string
          daily_calories?: number | null
          end_date?: string | null
          fat_g?: number | null
          goal?: Database["public"]["Enums"]["diet_goal"]
          id?: string
          is_active?: boolean
          meals?: Json
          member_id?: string
          notes?: string | null
          protein_g?: number | null
          start_date?: string
          tenant_id?: string
          title?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diet_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diet_plans_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gym_classes: {
        Row: {
          branch_id: string | null
          capacity: number
          created_at: string
          description: string | null
          ends_at: string
          id: string
          name: string
          starts_at: string
          tenant_id: string
          trainer_id: string | null
        }
        Insert: {
          branch_id?: string | null
          capacity?: number
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          name: string
          starts_at: string
          tenant_id: string
          trainer_id?: string | null
        }
        Update: {
          branch_id?: string | null
          capacity?: number
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          name?: string
          starts_at?: string
          tenant_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gym_classes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gym_classes_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_trainer_id: string | null
          branch_id: string | null
          converted_member_id: string | null
          created_at: string
          email: string | null
          first_name: string
          follow_up_at: string | null
          id: string
          interested_plan_id: string | null
          last_name: string
          notes: string | null
          phone: string
          source: Database["public"]["Enums"]["lead_source"]
          status: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assigned_trainer_id?: string | null
          branch_id?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          follow_up_at?: string | null
          id?: string
          interested_plan_id?: string | null
          last_name: string
          notes?: string | null
          phone: string
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assigned_trainer_id?: string | null
          branch_id?: string | null
          converted_member_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          follow_up_at?: string | null
          id?: string
          interested_plan_id?: string | null
          last_name?: string
          notes?: string | null
          phone?: string
          source?: Database["public"]["Enums"]["lead_source"]
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_trainer_id_fkey"
            columns: ["assigned_trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_interested_plan_id_fkey"
            columns: ["interested_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      member_notes: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          member_id: string
          pinned: boolean
          tenant_id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          member_id: string
          pinned?: boolean
          tenant_id: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          member_id?: string
          pinned?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_notes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          access_blocked: boolean
          access_card_number: string | null
          address_line: string | null
          allergies: string | null
          alternate_phone: string | null
          assigned_trainer_id: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          height_cm: number | null
          id: string
          id_proof_doc_url: string | null
          id_proof_last4: string | null
          id_proof_type: Database["public"]["Enums"]["id_proof_type"] | null
          injuries: string | null
          last_name: string
          medical_conditions: string | null
          medications: string | null
          member_code: string | null
          notes: string | null
          occupation: string | null
          parq_completed_at: string | null
          phone: string | null
          photo_url: string | null
          physician_clearance: boolean
          physician_clearance_date: string | null
          postal_code: string | null
          preferred_contact: Database["public"]["Enums"]["contact_method"]
          primary_goal: Database["public"]["Enums"]["fitness_goal"] | null
          state: string | null
          tenant_id: string
          updated_at: string
          waiver_signed_at: string | null
        }
        Insert: {
          access_blocked?: boolean
          access_card_number?: string | null
          address_line?: string | null
          allergies?: string | null
          alternate_phone?: string | null
          assigned_trainer_id?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          height_cm?: number | null
          id?: string
          id_proof_doc_url?: string | null
          id_proof_last4?: string | null
          id_proof_type?: Database["public"]["Enums"]["id_proof_type"] | null
          injuries?: string | null
          last_name: string
          medical_conditions?: string | null
          medications?: string | null
          member_code?: string | null
          notes?: string | null
          occupation?: string | null
          parq_completed_at?: string | null
          phone?: string | null
          photo_url?: string | null
          physician_clearance?: boolean
          physician_clearance_date?: string | null
          postal_code?: string | null
          preferred_contact?: Database["public"]["Enums"]["contact_method"]
          primary_goal?: Database["public"]["Enums"]["fitness_goal"] | null
          state?: string | null
          tenant_id: string
          updated_at?: string
          waiver_signed_at?: string | null
        }
        Update: {
          access_blocked?: boolean
          access_card_number?: string | null
          address_line?: string | null
          allergies?: string | null
          alternate_phone?: string | null
          assigned_trainer_id?: string | null
          branch_id?: string | null
          city?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          emergency_name?: string | null
          emergency_phone?: string | null
          emergency_relationship?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          height_cm?: number | null
          id?: string
          id_proof_doc_url?: string | null
          id_proof_last4?: string | null
          id_proof_type?: Database["public"]["Enums"]["id_proof_type"] | null
          injuries?: string | null
          last_name?: string
          medical_conditions?: string | null
          medications?: string | null
          member_code?: string | null
          notes?: string | null
          occupation?: string | null
          parq_completed_at?: string | null
          phone?: string | null
          photo_url?: string | null
          physician_clearance?: boolean
          physician_clearance_date?: string | null
          postal_code?: string | null
          preferred_contact?: Database["public"]["Enums"]["contact_method"]
          primary_goal?: Database["public"]["Enums"]["fitness_goal"] | null
          state?: string | null
          tenant_id?: string
          updated_at?: string
          waiver_signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_assigned_trainer_id_fkey"
            columns: ["assigned_trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          created_at: string
          currency: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price_cents: number
          pt_sessions_included: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price_cents: number
          pt_sessions_included?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          pt_sessions_included?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          note: string | null
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          tenant_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_at?: string | null
          id?: string
          invoice_number?: string | null
          method?: Database["public"]["Enums"]["payment_method"] | null
          note?: string | null
          paid_at?: string | null
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          specialty: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          is_active?: boolean
          last_name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          specialty?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          specialty?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_packages: {
        Row: {
          currency: string
          expires_at: string | null
          id: string
          member_id: string
          price_cents: number
          purchased_at: string
          sessions_purchased: number
          tenant_id: string
          trainer_id: string | null
        }
        Insert: {
          currency?: string
          expires_at?: string | null
          id?: string
          member_id: string
          price_cents: number
          purchased_at?: string
          sessions_purchased: number
          tenant_id: string
          trainer_id?: string | null
        }
        Update: {
          currency?: string
          expires_at?: string | null
          id?: string
          member_id?: string
          price_cents?: number
          purchased_at?: string
          sessions_purchased?: number
          tenant_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_packages_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_packages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_packages_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_sessions: {
        Row: {
          completed_at: string | null
          duration_minutes: number
          focus: string | null
          id: string
          member_id: string
          notes: string | null
          package_id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["pt_session_status"]
          tenant_id: string
          trainer_id: string | null
        }
        Insert: {
          completed_at?: string | null
          duration_minutes?: number
          focus?: string | null
          id?: string
          member_id: string
          notes?: string | null
          package_id: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["pt_session_status"]
          tenant_id: string
          trainer_id?: string | null
        }
        Update: {
          completed_at?: string | null
          duration_minutes?: number
          focus?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          package_id?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["pt_session_status"]
          tenant_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pt_sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "pt_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pt_sessions_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_freezes: {
        Row: {
          created_at: string
          end_date: string
          id: string
          note: string | null
          reason: Database["public"]["Enums"]["freeze_reason"]
          start_date: string
          subscription_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["freeze_reason"]
          start_date: string
          subscription_id: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          note?: string | null
          reason?: Database["public"]["Enums"]["freeze_reason"]
          start_date?: string
          subscription_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_freezes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_freezes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string
          id: string
          member_id: string
          membership_plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end: string
          id?: string
          member_id: string
          membership_plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string
          id?: string
          member_id?: string
          membership_plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_membership_plan_id_fkey"
            columns: ["membership_plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          code: string | null
          colors: Json | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          subdomain: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          colors?: Json | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          subdomain: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          colors?: Json | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          subdomain?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      mrr_by_tenant: {
        Row: {
          mrr_cents: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      book_class: {
        Args: {
          p_gym_class_id: string
          p_member_id: string
          p_trainer_id?: string
        }
        Returns: {
          created_at: string
          gym_class_id: string
          id: string
          member_id: string
          tenant_id: string
          trainer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      book_pt_session: {
        Args: {
          p_duration_minutes?: number
          p_focus?: string
          p_notes?: string
          p_package_id: string
          p_scheduled_at: string
        }
        Returns: {
          completed_at: string | null
          duration_minutes: number
          focus: string | null
          id: string
          member_id: string
          notes: string | null
          package_id: string
          scheduled_at: string
          status: Database["public"]["Enums"]["pt_session_status"]
          tenant_id: string
          trainer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "pt_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      checkin_member: {
        Args: {
          p_member_id: string
          p_source?: Database["public"]["Enums"]["attendance_source"]
        }
        Returns: {
          checked_in_at: string
          id: string
          local_date: string | null
          member_id: string
          source: Database["public"]["Enums"]["attendance_source"]
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attendance_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_diet_plan: {
        Args: { p_plan: Json }
        Returns: {
          carbs_g: number | null
          created_at: string
          daily_calories: number | null
          end_date: string | null
          fat_g: number | null
          goal: Database["public"]["Enums"]["diet_goal"]
          id: string
          is_active: boolean
          meals: Json
          member_id: string
          notes: string | null
          protein_g: number | null
          start_date: string
          tenant_id: string
          title: string
          trainer_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "diet_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_member_with_subscription: {
        Args: {
          p_current_period_end: string
          p_member: Json
          p_membership_plan_id: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_paid_cents: number
          p_total_cents: number
        }
        Returns: {
          access_blocked: boolean
          access_card_number: string | null
          address_line: string | null
          allergies: string | null
          alternate_phone: string | null
          assigned_trainer_id: string | null
          branch_id: string | null
          city: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          emergency_name: string | null
          emergency_phone: string | null
          emergency_relationship: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          first_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          height_cm: number | null
          id: string
          id_proof_doc_url: string | null
          id_proof_last4: string | null
          id_proof_type: Database["public"]["Enums"]["id_proof_type"] | null
          injuries: string | null
          last_name: string
          medical_conditions: string | null
          medications: string | null
          member_code: string | null
          notes: string | null
          occupation: string | null
          parq_completed_at: string | null
          phone: string | null
          photo_url: string | null
          physician_clearance: boolean
          physician_clearance_date: string | null
          postal_code: string | null
          preferred_contact: Database["public"]["Enums"]["contact_method"]
          primary_goal: Database["public"]["Enums"]["fitness_goal"] | null
          state: string | null
          tenant_id: string
          updated_at: string
          waiver_signed_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      record_payment: {
        Args: {
          p_amount_cents: number
          p_member_id: string
          p_method?: Database["public"]["Enums"]["payment_method"]
          p_note?: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          due_at: string | null
          id: string
          invoice_number: string | null
          method: Database["public"]["Enums"]["payment_method"] | null
          note: string | null
          paid_at: string | null
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          subscription_id: string
          tenant_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "payments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      staff_role: {
        Args: never
        Returns: Database["public"]["Enums"]["staff_role"]
      }
      staff_tenant: { Args: never; Returns: string }
    }
    Enums: {
      attendance_source: "QR" | "RFID" | "BIOMETRIC" | "MANUAL"
      billing_cycle: "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME"
      contact_method: "PHONE" | "EMAIL" | "SMS" | "WHATSAPP"
      diet_goal: "FAT_LOSS" | "MUSCLE_GAIN" | "MAINTENANCE" | "PERFORMANCE"
      experience_level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
      fitness_goal:
        | "WEIGHT_LOSS"
        | "MUSCLE_GAIN"
        | "STRENGTH"
        | "ENDURANCE"
        | "REHAB"
        | "GENERAL_FITNESS"
      freeze_reason: "MEDICAL" | "TRAVEL" | "PERSONAL" | "OTHER"
      gender: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY"
      id_proof_type:
        | "AADHAAR"
        | "PASSPORT"
        | "DRIVING_LICENSE"
        | "VOTER_ID"
        | "OTHER"
      lead_source:
        | "WALK_IN"
        | "WEBSITE"
        | "INSTAGRAM"
        | "REFERRAL"
        | "PHONE"
        | "OTHER"
      lead_status: "NEW" | "CONTACTED" | "TRIAL" | "CONVERTED" | "LOST"
      payment_method: "CARD" | "UPI" | "CASH" | "BANK_TRANSFER" | "OTHER"
      payment_status: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED"
      pt_session_status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW"
      staff_role: "OWNER" | "ADMIN" | "STAFF" | "TRAINER"
      subscription_status: "ACTIVE" | "PAST_DUE" | "CANCELLED" | "FROZEN"
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
      attendance_source: ["QR", "RFID", "BIOMETRIC", "MANUAL"],
      billing_cycle: ["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"],
      contact_method: ["PHONE", "EMAIL", "SMS", "WHATSAPP"],
      diet_goal: ["FAT_LOSS", "MUSCLE_GAIN", "MAINTENANCE", "PERFORMANCE"],
      experience_level: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      fitness_goal: [
        "WEIGHT_LOSS",
        "MUSCLE_GAIN",
        "STRENGTH",
        "ENDURANCE",
        "REHAB",
        "GENERAL_FITNESS",
      ],
      freeze_reason: ["MEDICAL", "TRAVEL", "PERSONAL", "OTHER"],
      gender: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
      id_proof_type: [
        "AADHAAR",
        "PASSPORT",
        "DRIVING_LICENSE",
        "VOTER_ID",
        "OTHER",
      ],
      lead_source: [
        "WALK_IN",
        "WEBSITE",
        "INSTAGRAM",
        "REFERRAL",
        "PHONE",
        "OTHER",
      ],
      lead_status: ["NEW", "CONTACTED", "TRIAL", "CONVERTED", "LOST"],
      payment_method: ["CARD", "UPI", "CASH", "BANK_TRANSFER", "OTHER"],
      payment_status: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"],
      pt_session_status: ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"],
      staff_role: ["OWNER", "ADMIN", "STAFF", "TRAINER"],
      subscription_status: ["ACTIVE", "PAST_DUE", "CANCELLED", "FROZEN"],
    },
  },
} as const
