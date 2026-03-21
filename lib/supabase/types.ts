// Auto-generated Supabase types stub
// Run: npx supabase gen types typescript --linked > lib/supabase/types.ts
// after linking your Supabase project

export type UserRole = 'admin' | 'author' | 'user'
export type ContentType = 'article' | 'video' | 'podcast' | 'pill' | 'course'
export type ContentStatus = 'draft' | 'published'
export type ApplicationStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          slug: string
          display_name: string
          role: UserRole
          bio: string | null
          location: string | null
          website: string | null
          avatar_url: string | null
          followers_count: number
          following_count: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'followers_count' | 'following_count'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      content: {
        Row: {
          id: string
          type: ContentType
          author_id: string
          slug: string
          source_locale: string
          status: ContentStatus
          is_featured: boolean
          cover_image_url: string | null
          likes_count: number
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['content']['Row'], 'id' | 'likes_count' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['content']['Insert']>
      }
      content_translations: {
        Row: {
          id: string
          content_id: string
          locale: string
          title: string
          excerpt: string | null
          description: string | null
          body: Record<string, unknown> | null
          is_auto_translated: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['content_translations']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['content_translations']['Insert']>
      }
      video_meta: {
        Row: {
          content_id: string
          embed_url: string
          thumbnail_url: string | null
          duration: string | null
        }
        Insert: Database['public']['Tables']['video_meta']['Row']
        Update: Partial<Database['public']['Tables']['video_meta']['Insert']>
      }
      podcast_meta: {
        Row: {
          content_id: string
          embed_url: string
          cover_image_url: string | null
          duration: string | null
          episode_number: string | null
        }
        Insert: Database['public']['Tables']['podcast_meta']['Row']
        Update: Partial<Database['public']['Tables']['podcast_meta']['Insert']>
      }
      pill_meta: {
        Row: {
          content_id: string
          accent_color: string
          image_url: string | null
        }
        Insert: Database['public']['Tables']['pill_meta']['Row']
        Update: Partial<Database['public']['Tables']['pill_meta']['Insert']>
      }
      course_meta: {
        Row: {
          content_id: string
          price: number
          currency: string
          duration: string | null
          stripe_product_id: string | null
          students_count: number
          rating: number | null
        }
        Insert: Database['public']['Tables']['course_meta']['Row']
        Update: Partial<Database['public']['Tables']['course_meta']['Insert']>
      }
      categories: {
        Row: {
          id: string
          slug: string
          names: Record<string, string>
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      tags: {
        Row: {
          id: string
          slug: string
          names: Record<string, string>
        }
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['tags']['Insert']>
      }
      likes: {
        Row: {
          user_id: string
          content_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['likes']['Row'], 'created_at'>
        Update: never
      }
      bookmarks: {
        Row: {
          user_id: string
          content_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookmarks']['Row'], 'created_at'>
        Update: never
      }
      follows: {
        Row: {
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'created_at'>
        Update: never
      }
      creator_applications: {
        Row: {
          id: string
          user_id: string
          message: string
          status: ApplicationStatus
          admin_notes: string | null
          created_at: string
          reviewed_at: string | null
          reviewed_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['creator_applications']['Row'], 'id' | 'status' | 'created_at'>
        Update: Partial<Database['public']['Tables']['creator_applications']['Insert']>
      }
      content_categories: {
        Row: { content_id: string; category_id: string }
        Insert: Database['public']['Tables']['content_categories']['Row']
        Update: never
      }
      content_tags: {
        Row: { content_id: string; tag_id: string }
        Insert: Database['public']['Tables']['content_tags']['Row']
        Update: never
      }
    }
    Views: {
      homepage_feed: {
        Row: Database['public']['Tables']['content']['Row']
      }
    }
    Functions: {
      current_user_role: {
        Args: Record<never, never>
        Returns: UserRole
      }
    }
  }
}
