-- Add budget column to channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS budget INTEGER;
