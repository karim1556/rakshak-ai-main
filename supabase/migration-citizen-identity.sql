-- Migration: Add citizen identity columns to escalated_sessions and incidents
-- Run this in Supabase SQL Editor if tables already exist

-- Add citizen identity columns to escalated_sessions
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS citizen_identifier TEXT;
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS citizen_name TEXT;
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS citizen_phone TEXT;
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS spam_verdict JSONB;

-- Add citizen identity columns to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_identifier TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_phone TEXT;

-- Create indexes for citizen lookups
CREATE INDEX IF NOT EXISTS idx_escalated_citizen ON escalated_sessions(citizen_identifier);
CREATE INDEX IF NOT EXISTS idx_incidents_citizen ON incidents(citizen_identifier);
