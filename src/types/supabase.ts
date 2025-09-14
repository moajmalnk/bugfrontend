
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
      bugs: {
        Row: {
          id: string
          name: string
          description: string
          project_id: string
          reporter_id: string
          assignee_id: string | null
          priority: 'high' | 'medium' | 'low'
          status: 'fixed' | 'pending' | 'declined'
          created_at: string
          updated_at: string
          affected_dashboards: string[]
          screenshots: string[]
          files: string[]
        }
        Insert: {
          id?: string
          name: string
          description: string
          project_id: string
          reporter_id: string
          assignee_id?: string | null
          priority: 'high' | 'medium' | 'low'
          status?: 'fixed' | 'pending' | 'declined'
          created_at?: string
          updated_at?: string
          affected_dashboards?: string[]
          screenshots?: string[]
          files?: string[]
        }
        Update: {
          id?: string
          name?: string
          description?: string
          project_id?: string
          reporter_id?: string
          assignee_id?: string | null
          priority?: 'high' | 'medium' | 'low'
          status?: 'fixed' | 'pending' | 'declined'
          created_at?: string
          updated_at?: string
          affected_dashboards?: string[]
          screenshots?: string[]
          files?: string[]
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          is_active?: boolean
          created_at?: string
        }
      }
      dashboards: {
        Row: {
          id: string
          name: string
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          project_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          project_id?: string
          created_at?: string
        }
      }
      activities: {
        Row: {
          id: string
          type: string
          user_id: string
          description: string
          project_id: string
          created_at: string
        }
        Insert: {
          id?: string
          type: string
          user_id: string
          description: string
          project_id: string
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          user_id?: string
          description?: string
          project_id?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          avatar_url: string | null
          role: 'admin' | 'developer' | 'tester'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          avatar_url?: string | null
          role: 'admin' | 'developer' | 'tester'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          avatar_url?: string | null
          role?: 'admin' | 'developer' | 'tester'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
