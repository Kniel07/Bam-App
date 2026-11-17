/**
 * Database types matching supabase/migrations 0001–0007.
 *
 * Hand-written until the Supabase project exists; then regenerate with
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts
 * and diff against this file (they must agree).
 */

export type MemberRole = 'owner' | 'partner'
export type ContentStatus = 'draft' | 'published'
export type UnlockType = 'on_demand' | 'scheduled'

type Timestamps = { created_at: string; updated_at: string }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string; welcomed_at: string | null } & Timestamps
        Insert: never
        Update: { display_name?: string }
        Relationships: []
      }
      relationship: {
        Row: {
          id: string
          start_at: string
          timezone: string
          counter_message: string
          welcome_message: string
          intro_story: string
        } & Timestamps
        Insert: never
        Update: {
          start_at?: string
          timezone?: string
          counter_message?: string
          welcome_message?: string
          intro_story?: string
        }
        Relationships: []
      }
      relationship_members: {
        Row: { user_id: string; relationship_id: string; role: MemberRole } & Timestamps
        Insert: never
        Update: never
        Relationships: []
      }
      story_milestones: {
        Row: {
          id: string
          title: string
          caption: string
          occurred_on: string
          photo_path: string | null
          is_highlighted: boolean
          sort_order: number
          status: ContentStatus
          created_by: string | null
        } & Timestamps
        Insert: {
          id?: string
          title: string
          caption?: string
          occurred_on: string
          photo_path?: string | null
          is_highlighted?: boolean
          sort_order?: number
          status?: ContentStatus
        }
        Update: {
          title?: string
          caption?: string
          occurred_on?: string
          photo_path?: string | null
          is_highlighted?: boolean
          sort_order?: number
          status?: ContentStatus
        }
        Relationships: []
      }
      letters: {
        Row: {
          id: string
          label: string
          unlock_type: UnlockType
          unlock_at: string | null
          status: ContentStatus
          sort_order: number
          first_opened_at: string | null
          created_by: string | null
        } & Timestamps
        Insert: {
          id?: string
          label: string
          unlock_type?: UnlockType
          unlock_at?: string | null
          status?: ContentStatus
          sort_order?: number
        }
        Update: {
          label?: string
          unlock_type?: UnlockType
          unlock_at?: string | null
          status?: ContentStatus
          sort_order?: number
        }
        Relationships: []
      }
      letter_contents: {
        Row: {
          letter_id: string
          body: string
          photo_path: string | null
          audio_path: string | null
        } & Timestamps
        Insert: { letter_id: string; body: string; photo_path?: string | null; audio_path?: string | null }
        Update: { body?: string; photo_path?: string | null; audio_path?: string | null }
        Relationships: []
      }
      memories: {
        Row: {
          id: string
          caption: string
          taken_on: string
          photo_path: string
          status: ContentStatus
          created_by: string | null
        } & Timestamps
        Insert: {
          id: string
          caption?: string
          taken_on?: string
          photo_path: string
          status?: ContentStatus
          created_by: string
        }
        Update: { caption?: string; taken_on?: string; photo_path?: string; status?: ContentStatus }
        Relationships: []
      }
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string } & Timestamps
        Insert: { endpoint: string; p256dh: string; auth: string }
        Update: { endpoint?: string; p256dh?: string; auth?: string }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      open_letter: {
        Args: { p_letter_id: string }
        Returns: {
          letter_id: string
          label: string
          body: string
          photo_path: string | null
          audio_path: string | null
          first_opened_at: string | null
          author_id: string | null
        }[]
      }
      mark_welcomed: { Args: Record<never, never>; Returns: undefined }
      get_server_time: { Args: Record<never, never>; Returns: string }
      keepalive: { Args: Record<never, never>; Returns: number }
      is_member: { Args: Record<never, never>; Returns: boolean }
      is_owner: { Args: Record<never, never>; Returns: boolean }
    }
    Enums: {
      member_role: MemberRole
      content_status: ContentStatus
      unlock_type: UnlockType
    }
    CompositeTypes: Record<never, never>
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
