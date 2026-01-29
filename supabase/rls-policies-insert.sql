-- =============================================
-- RLS Policies for INSERT (Workers and Clients)
-- Execute this in Supabase SQL Editor
-- =============================================

-- Allow users to create their own worker profile
CREATE POLICY "Users can create own worker profile" ON workers
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to create their own client profile
CREATE POLICY "Users can create own client profile" ON clients
  FOR INSERT WITH CHECK (auth.uid() = id);
