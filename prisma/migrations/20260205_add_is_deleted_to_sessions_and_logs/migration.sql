-- Add isDeleted column to diagnosis_sessions table
ALTER TABLE diagnosis_sessions ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Add isDeleted column to access_logs table
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Create index for isDeleted filtering on diagnosis_sessions
CREATE INDEX IF NOT EXISTS diagnosis_sessions_clinic_id_is_deleted_idx ON diagnosis_sessions(clinic_id, is_deleted);

-- Create index for isDeleted filtering on access_logs
CREATE INDEX IF NOT EXISTS access_logs_clinic_id_is_deleted_idx ON access_logs(clinic_id, is_deleted);
