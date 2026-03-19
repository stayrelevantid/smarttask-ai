-- Migration: Add position column and sequential dependencies
-- Run this in Supabase SQL Editor

-- Add position column for drag & drop ordering
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER;

-- Create index for position ordering
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(goal_id, position);

-- Update existing tasks to have sequential positions
UPDATE tasks 
SET position = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY goal_id ORDER BY created_at) as row_num
  FROM tasks
) AS subquery
WHERE tasks.id = subquery.id AND tasks.position IS NULL;

-- Set default position for new tasks
ALTER TABLE tasks ALTER COLUMN position SET DEFAULT 0;

-- Add comment
COMMENT ON COLUMN tasks.position IS 'Order position for drag & drop reordering';

-- Enable realtime for position updates
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
