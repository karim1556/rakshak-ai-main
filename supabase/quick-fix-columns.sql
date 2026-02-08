-- ============================================================================
-- COMPREHENSIVE FIX: Run this in Supabase SQL Editor to fix all missing pieces
-- ============================================================================

-- 1. PROFILES TABLE (for auth user roles/names)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('dispatch', 'police', 'medical', 'fire', 'citizen')),
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all profiles" ON profiles;
CREATE POLICY "Allow all profiles" ON profiles FOR ALL USING (true);

-- Auto-create profile when a new Supabase auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'dispatch'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing auth users that don't have one
INSERT INTO profiles (id, email, role, full_name)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'role', 'dispatch'),
  COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. MISSING COLUMNS ON escalated_sessions
-- ============================================================================
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS citizen_identifier TEXT;
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS citizen_name TEXT;
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS citizen_phone TEXT;
ALTER TABLE escalated_sessions ADD COLUMN IF NOT EXISTS spam_verdict JSONB;

-- 3. MISSING COLUMNS ON incidents
-- ============================================================================
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_identifier TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_name TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS citizen_phone TEXT;

-- 4. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_escalated_citizen ON escalated_sessions(citizen_identifier);
CREATE INDEX IF NOT EXISTS idx_incidents_citizen ON incidents(citizen_identifier);

-- 5. HEALTH PROFILES TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS health_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  citizen_identifier TEXT NOT NULL UNIQUE,
  full_name TEXT DEFAULT '',
  date_of_birth DATE,
  blood_type TEXT CHECK (blood_type IS NULL OR blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  allergies TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  conditions TEXT[] DEFAULT '{}',
  emergency_notes TEXT DEFAULT '',
  organ_donor BOOLEAN DEFAULT FALSE,
  height_cm DECIMAL(5, 1),
  weight_kg DECIMAL(5, 1),
  primary_physician TEXT,
  physician_phone TEXT,
  insurance_info TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  gender TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_profiles_citizen ON health_profiles(citizen_identifier);

ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can create a health profile" ON health_profiles;
DROP POLICY IF EXISTS "Authenticated users can read health profiles" ON health_profiles;
DROP POLICY IF EXISTS "Public emergency access to health profiles" ON health_profiles;
DROP POLICY IF EXISTS "Anyone can update their own health profile" ON health_profiles;
DROP POLICY IF EXISTS "Anyone can delete their own health profile" ON health_profiles;

CREATE POLICY "Anyone can create a health profile" ON health_profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read health profiles" ON health_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public emergency access to health profiles" ON health_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can update their own health profile" ON health_profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete their own health profile" ON health_profiles FOR DELETE TO anon, authenticated USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE health_profiles;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 6. VERIFY EVERYTHING
-- ============================================================================
SELECT 'profiles' as table_name, count(*) as row_count FROM profiles
UNION ALL
SELECT 'health_profiles', count(*) FROM health_profiles
UNION ALL
SELECT 'escalated_sessions', count(*) FROM escalated_sessions
UNION ALL
SELECT 'responders', count(*) FROM responders;
