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
      users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'worker' | 'admin' | 'client'
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          role?: 'worker' | 'admin' | 'client'
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'worker' | 'admin' | 'client'
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      workers: {
        Row: {
          id: string
          cpf: string
          skills: string[]
          rating: number
          total_jobs: number
          documents_verified: boolean
          is_active: boolean
          deactivation_reason: string | null
          deactivated_at: string | null
          approval_status: 'pending' | 'approved' | 'rejected'
          approval_date: string | null
          approval_notes: string | null
          rejected_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          cpf: string
          skills?: string[]
          rating?: number
          total_jobs?: number
          documents_verified?: boolean
          is_active?: boolean
          deactivation_reason?: string | null
          deactivated_at?: string | null
          approval_status?: 'pending' | 'approved' | 'rejected'
          approval_date?: string | null
          approval_notes?: string | null
          rejected_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cpf?: string
          skills?: string[]
          rating?: number
          total_jobs?: number
          documents_verified?: boolean
          is_active?: boolean
          deactivation_reason?: string | null
          deactivated_at?: string | null
          approval_status?: 'pending' | 'approved' | 'rejected'
          approval_date?: string | null
          approval_notes?: string | null
          rejected_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      worker_availability: {
        Row: {
          id: string
          worker_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Insert: {
          id?: string
          worker_id: string
          day_of_week: number
          start_time: string
          end_time: string
        }
        Update: {
          id?: string
          worker_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
      }
      clients: {
        Row: {
          id: string
          cnpj: string
          company_name: string
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          cnpj: string
          company_name: string
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cnpj?: string
          company_name?: string
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          location: string
          date: string
          start_time: string
          end_time: string
          daily_rate: number
          required_workers: number
          skills_required: string[]
          status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          location: string
          date: string
          start_time: string
          end_time: string
          daily_rate: number
          required_workers?: number
          skills_required?: string[]
          status?: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          location?: string
          date?: string
          start_time?: string
          end_time?: string
          hourly_rate?: number
          required_workers?: number
          skills_required?: string[]
          status?: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      job_applications: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          status: 'pending' | 'approved' | 'rejected'
          applied_at: string
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          status?: 'pending' | 'approved' | 'rejected'
          applied_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          applied_at?: string
        }
      }
      job_assignments: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'withdrawn'
          check_in_time: string | null
          check_out_time: string | null
          rating: number | null
          feedback: string | null
          withdrawal_reason: string | null
          withdrawn_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          worker_id: string
          status?: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'withdrawn'
          check_in_time?: string | null
          check_out_time?: string | null
          rating?: number | null
          feedback?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          worker_id?: string
          status?: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'withdrawn'
          check_in_time?: string | null
          check_out_time?: string | null
          rating?: number | null
          feedback?: string | null
          withdrawal_reason?: string | null
          withdrawn_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Enums: {
      user_role: 'worker' | 'admin' | 'client'
      job_status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
      assignment_status: 'pending' | 'confirmed' | 'completed' | 'no_show' | 'withdrawn'
      application_status: 'pending' | 'approved' | 'rejected'
      worker_approval_status: 'pending' | 'approved' | 'rejected'
    }
  }
}
