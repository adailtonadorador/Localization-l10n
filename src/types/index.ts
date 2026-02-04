// User types
export type UserRole = 'worker' | 'admin' | 'client';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

// Worker specific
export interface Worker extends User {
  role: 'worker';
  cpf: string;
  skills: string[];
  availability: Availability[];
  rating: number;
  total_jobs: number;
  documents_verified: boolean;
}

export interface Availability {
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string;  // HH:mm
  end_time: string;    // HH:mm
}

// Client/Company specific
export interface Client extends User {
  role: 'client';
  cnpj: string;
  company_name: string;
  address: string;
}

// Job types
export type JobStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  client_id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  daily_rate: number;
  required_workers: number;
  skills_required: string[];
  status: JobStatus;
  created_at: string;
}

export interface JobAssignment {
  id: string;
  job_id: string;
  worker_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'no_show';
  check_in_time?: string;
  check_out_time?: string;
  rating?: number;
  feedback?: string;
}

// Application types
export interface JobApplication {
  id: string;
  job_id: string;
  worker_id: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_at: string;
}

// Project Task types
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';
export type TaskCategory = 'feature' | 'bug' | 'improvement' | 'documentation' | 'other';

export interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  created_by?: string;
  created_at: string;
  updated_at: string;
}
