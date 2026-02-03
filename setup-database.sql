-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE,
  is_disabled BOOLEAN DEFAULT FALSE,
  department TEXT
);

-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  check_out TIMESTAMPTZ,
  note TEXT,
  duration INTEGER NOT NULL, -- minutes
  break_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create active_shifts table
CREATE TABLE IF NOT EXISTS active_shifts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  check_in TIMESTAMPTZ NOT NULL,
  note TEXT,
  day_type TEXT
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view own record" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own record" ON users
  FOR UPDATE USING (auth.uid()::text = id);

-- Create policies for shifts table
CREATE POLICY "Users can view own shifts" ON shifts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own shifts" ON shifts
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own shifts" ON shifts
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Create policies for active_shifts table
CREATE POLICY "Users can view own active shift" ON active_shifts
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can manage own active shift" ON active_shifts
  FOR ALL USING (auth.uid()::text = user_id);

-- Insert your admin user (replace with your actual values)
INSERT INTO users (id, name, email, password, is_admin, department)
VALUES (
  '8452b4ad-3293-4379-8121-6f0b13d738a5',
  'Shiras',
  'shiras@fitness22.com',
  'admin123',
  true,
  'Israel'
) ON CONFLICT (id) DO NOTHING;