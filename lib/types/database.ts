/**
 * TypeScript types for Supabase database schema
 * Auto-generated types based on database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          credits_remaining: number
          credits_reset_time: string
          total_credits_earned: number
          is_premium: boolean
          premium_expires: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          total_comparisons: number
          comparisons_this_month: number
          last_comparison_at: string | null
          referral_code: string
          referred_by: string | null
          referral_credits_earned: number
          is_founder: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          credits_remaining?: number
          credits_reset_time?: string
          total_credits_earned?: number
          is_premium?: boolean
          premium_expires?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_comparisons?: number
          comparisons_this_month?: number
          last_comparison_at?: string | null
          referral_code?: string
          referred_by?: string | null
          referral_credits_earned?: number
          is_founder?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          credits_remaining?: number
          credits_reset_time?: string
          total_credits_earned?: number
          is_premium?: boolean
          premium_expires?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          total_comparisons?: number
          comparisons_this_month?: number
          last_comparison_at?: string | null
          referral_code?: string
          referred_by?: string | null
          referral_credits_earned?: number
          is_founder?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      comparisons_cache: {
        Row: {
          id: string
          object1_name: string
          object2_name: string
          object1_dimensions: Json
          object2_dimensions: Json
          object1_model_url: string | null
          object2_model_url: string | null
          object1_thumbnail_url: string | null
          object2_thumbnail_url: string | null
          comparison_image_url: string | null
          generation_cost: number
          times_served: number
          quality_tier: 'free' | 'premium'
          created_at: string
          last_served_at: string
        }
        Insert: {
          id?: string
          object1_name: string
          object2_name: string
          object1_dimensions: Json
          object2_dimensions: Json
          object1_model_url?: string | null
          object2_model_url?: string | null
          object1_thumbnail_url?: string | null
          object2_thumbnail_url?: string | null
          comparison_image_url?: string | null
          generation_cost?: number
          times_served?: number
          quality_tier?: 'free' | 'premium'
          created_at?: string
          last_served_at?: string
        }
        Update: {
          id?: string
          object1_name?: string
          object2_name?: string
          object1_dimensions?: Json
          object2_dimensions?: Json
          object1_model_url?: string | null
          object2_model_url?: string | null
          object1_thumbnail_url?: string | null
          object2_thumbnail_url?: string | null
          comparison_image_url?: string | null
          generation_cost?: number
          times_served?: number
          quality_tier?: 'free' | 'premium'
          created_at?: string
          last_served_at?: string
        }
      }
      comparison_history: {
        Row: {
          id: string
          user_id: string
          object1_name: string
          object2_name: string
          object1_dimensions: Json
          object2_dimensions: Json
          from_cache: boolean
          cache_entry_id: string | null
          cost: number
          was_premium_at_time: boolean
          views: number
          shares: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          object1_name: string
          object2_name: string
          object1_dimensions: Json
          object2_dimensions: Json
          from_cache?: boolean
          cache_entry_id?: string | null
          cost?: number
          was_premium_at_time?: boolean
          views?: number
          shares?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          object1_name?: string
          object2_name?: string
          object1_dimensions?: Json
          object2_dimensions?: Json
          from_cache?: boolean
          cache_entry_id?: string | null
          cost?: number
          was_premium_at_time?: boolean
          views?: number
          shares?: number
          created_at?: string
        }
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_user_id: string
          credits_awarded: number
          reward_claimed: boolean
          created_at: string
          claimed_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_user_id: string
          credits_awarded?: number
          reward_claimed?: boolean
          created_at?: string
          claimed_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_user_id?: string
          credits_awarded?: number
          reward_claimed?: boolean
          created_at?: string
          claimed_at?: string | null
        }
      }
      social_shares: {
        Row: {
          id: string
          user_id: string
          comparison_history_id: string | null
          platform: 'twitter' | 'facebook' | 'linkedin' | 'other'
          share_url: string | null
          credits_awarded: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          comparison_history_id?: string | null
          platform: 'twitter' | 'facebook' | 'linkedin' | 'other'
          share_url?: string | null
          credits_awarded?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          comparison_history_id?: string | null
          platform?: 'twitter' | 'facebook' | 'linkedin' | 'other'
          share_url?: string | null
          credits_awarded?: number
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          event_name: string
          event_data: Json | null
          session_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_name: string
          event_data?: Json | null
          session_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_name?: string
          event_data?: Json | null
          session_id?: string | null
          created_at?: string
        }
      }
      payment_transactions: {
        Row: {
          id: string
          user_id: string
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          amount: number
          currency: string
          status: 'pending' | 'succeeded' | 'failed' | 'refunded'
          plan_type: 'monthly' | 'yearly' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          amount: number
          currency?: string
          status: 'pending' | 'succeeded' | 'failed' | 'refunded'
          plan_type?: 'monthly' | 'yearly' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          amount?: number
          currency?: string
          status?: 'pending' | 'succeeded' | 'failed' | 'refunded'
          plan_type?: 'monthly' | 'yearly' | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credit: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      add_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_reason?: string
        }
        Returns: void
      }
      reset_daily_credits: {
        Args: {}
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier use
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type ComparisonCache = Database['public']['Tables']['comparisons_cache']['Row']
export type ComparisonHistory = Database['public']['Tables']['comparison_history']['Row']
export type Referral = Database['public']['Tables']['referrals']['Row']
export type SocialShare = Database['public']['Tables']['social_shares']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']
export type PaymentTransaction = Database['public']['Tables']['payment_transactions']['Row']
