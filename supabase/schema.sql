-- =============================================
-- PLATAFORMA SAMA - Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUM Types
-- =============================================

CREATE TYPE user_role AS ENUM ('worker', 'admin', 'client');
CREATE TYPE job_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE assignment_status AS ENUM ('pending', 'confirmed', 'completed', 'no_show');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');

-- =============================================
-- Users Table (base para todos os usuários)
-- =============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Workers Table (dados específicos do trabalhador)
-- =============================================

CREATE TABLE workers (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cpf TEXT UNIQUE NOT NULL,
  skills TEXT[] DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  documents_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Worker Availability (disponibilidade do trabalhador)
-- =============================================

CREATE TABLE worker_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  UNIQUE(worker_id, day_of_week)
);

-- =============================================
-- Clients Table (dados específicos do cliente/empresa)
-- =============================================

CREATE TABLE clients (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cnpj TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Jobs Table (vagas de trabalho)
-- =============================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL,
  required_workers INTEGER DEFAULT 1,
  skills_required TEXT[] DEFAULT '{}',
  status job_status DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Job Applications (candidaturas)
-- =============================================

CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  status application_status DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, worker_id)
);

-- =============================================
-- Job Assignments (atribuições de trabalho)
-- =============================================

CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  status assignment_status DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, worker_id)
);

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_client ON jobs(client_id);
CREATE INDEX idx_jobs_date ON jobs(date);
CREATE INDEX idx_job_applications_job ON job_applications(job_id);
CREATE INDEX idx_job_applications_worker ON job_applications(worker_id);
CREATE INDEX idx_job_assignments_job ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_worker ON job_assignments(worker_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_availability ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies - Users
-- =============================================

-- Usuários podem ver seus próprios dados
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Admin pode ver todos os usuários
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- RLS Policies - Workers
-- =============================================

-- Workers podem ver seus próprios dados
CREATE POLICY "Workers can view own data" ON workers
  FOR SELECT USING (auth.uid() = id);

-- Workers podem atualizar seus próprios dados
CREATE POLICY "Workers can update own data" ON workers
  FOR UPDATE USING (auth.uid() = id);

-- Clientes podem ver workers (para contratar)
CREATE POLICY "Clients can view workers" ON workers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client')
  );

-- =============================================
-- RLS Policies - Clients
-- =============================================

-- Clients podem ver seus próprios dados
CREATE POLICY "Clients can view own data" ON clients
  FOR SELECT USING (auth.uid() = id);

-- Clients podem atualizar seus próprios dados
CREATE POLICY "Clients can update own data" ON clients
  FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- RLS Policies - Jobs
-- =============================================

-- Todos podem ver jobs abertos
CREATE POLICY "Anyone can view open jobs" ON jobs
  FOR SELECT USING (status = 'open');

-- Clientes podem ver seus próprios jobs
CREATE POLICY "Clients can view own jobs" ON jobs
  FOR SELECT USING (client_id = auth.uid());

-- Clientes podem criar jobs
CREATE POLICY "Clients can create jobs" ON jobs
  FOR INSERT WITH CHECK (client_id = auth.uid());

-- Clientes podem atualizar seus próprios jobs
CREATE POLICY "Clients can update own jobs" ON jobs
  FOR UPDATE USING (client_id = auth.uid());

-- =============================================
-- RLS Policies - Job Applications
-- =============================================

-- Workers podem ver suas próprias candidaturas
CREATE POLICY "Workers can view own applications" ON job_applications
  FOR SELECT USING (worker_id = auth.uid());

-- Workers podem criar candidaturas
CREATE POLICY "Workers can create applications" ON job_applications
  FOR INSERT WITH CHECK (worker_id = auth.uid());

-- Clientes podem ver candidaturas dos seus jobs
CREATE POLICY "Clients can view applications for own jobs" ON job_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid())
  );

-- Clientes podem atualizar candidaturas dos seus jobs
CREATE POLICY "Clients can update applications for own jobs" ON job_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid())
  );

-- =============================================
-- RLS Policies - Job Assignments
-- =============================================

-- Workers podem ver suas próprias atribuições
CREATE POLICY "Workers can view own assignments" ON job_assignments
  FOR SELECT USING (worker_id = auth.uid());

-- Workers podem atualizar suas próprias atribuições (check-in/out)
CREATE POLICY "Workers can update own assignments" ON job_assignments
  FOR UPDATE USING (worker_id = auth.uid());

-- Clientes podem ver atribuições dos seus jobs
CREATE POLICY "Clients can view assignments for own jobs" ON job_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid())
  );

-- Clientes podem criar atribuições para seus jobs
CREATE POLICY "Clients can create assignments for own jobs" ON job_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM jobs WHERE jobs.id = job_id AND jobs.client_id = auth.uid())
  );

-- =============================================
-- RLS Policies - Worker Availability
-- =============================================

-- Workers podem gerenciar sua própria disponibilidade
CREATE POLICY "Workers can manage own availability" ON worker_availability
  FOR ALL USING (worker_id = auth.uid());

-- Clientes podem ver disponibilidade dos workers
CREATE POLICY "Clients can view worker availability" ON worker_availability
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client')
  );

-- =============================================
-- Functions
-- =============================================

-- Função para criar perfil de usuário automaticamente após signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_job_assignments_updated_at
  BEFORE UPDATE ON job_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
