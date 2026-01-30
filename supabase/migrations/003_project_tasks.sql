-- =============================================
-- Project Tasks - Sistema de Gestão de Tarefas do Projeto
-- =============================================

-- ENUM para status da tarefa
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'cancelled');

-- ENUM para categoria da tarefa
CREATE TYPE task_category AS ENUM ('feature', 'bug', 'improvement', 'documentation', 'other');

-- Tabela de tarefas do projeto
CREATE TABLE project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status task_status DEFAULT 'todo',
  category task_category DEFAULT 'other',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_project_tasks_status ON project_tasks(status);
CREATE INDEX idx_project_tasks_category ON project_tasks(category);
CREATE INDEX idx_project_tasks_created_at ON project_tasks(created_at DESC);

-- RLS
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar tarefas do projeto
CREATE POLICY "Admin can manage project tasks" ON project_tasks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger para updated_at
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
