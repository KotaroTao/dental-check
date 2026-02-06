-- Create invitation_tokens table
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL DEFAULT 'invitation',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on token for fast lookups
CREATE INDEX IF NOT EXISTS invitation_tokens_token_idx ON invitation_tokens(token);

-- Create index on clinic_id for fast lookups
CREATE INDEX IF NOT EXISTS invitation_tokens_clinic_id_idx ON invitation_tokens(clinic_id);
