-- SmartTask AI Database Schema
-- Phase 2: Database & Auth Integration

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Goals: Groups a set of AI-generated tasks
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks: Individual actionable units
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) > 0),
  is_completed BOOLEAN DEFAULT FALSE,
  est_min INTEGER DEFAULT 15 CHECK (est_min > 0),
  depends_on UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent circular dependencies
  CONSTRAINT no_self_dependency CHECK (depends_on IS NULL OR depends_on != id)
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Goals RLS Policies
CREATE POLICY "Users can only access their own goals"
  ON goals FOR ALL
  USING (user_id = auth.uid());

-- Tasks RLS Policies  
CREATE POLICY "Users can only access their own tasks"
  ON tasks FOR ALL
  USING (user_id = auth.uid());

-- ============================================
-- INDEXES
-- ============================================

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_depends_on ON tasks(depends_on);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- REAL-TIME SUBSCRIPTIONS
-- ============================================

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE goals;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE goals IS 'Stores user goals - each goal contains multiple tasks';
COMMENT ON TABLE tasks IS 'Stores individual tasks with dependency support';
COMMENT ON COLUMN tasks.depends_on IS 'References another task that must be completed first';
COMMENT ON COLUMN tasks.est_min IS 'Estimated time to complete in minutes';
