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
  start_time BIGINT NOT NULL,
  note TEXT,
  day_type TEXT
);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_shifts ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
-- Using permissive policies since this is an internal company app
-- with custom user authentication (not Supabase Auth)
CREATE POLICY "Users can view all" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert all" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update all" ON users
  FOR UPDATE USING (true);

CREATE POLICY "Users can delete all" ON users
  FOR DELETE USING (true);

-- Create policies for shifts table
CREATE POLICY "Shifts select all" ON shifts
  FOR SELECT USING (true);

CREATE POLICY "Shifts insert all" ON shifts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Shifts update all" ON shifts
  FOR UPDATE USING (true);

CREATE POLICY "Shifts delete all" ON shifts
  FOR DELETE USING (true);

-- Create policies for active_shifts table
CREATE POLICY "Active shifts select all" ON active_shifts
  FOR SELECT USING (true);

CREATE POLICY "Active shifts insert all" ON active_shifts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Active shifts update all" ON active_shifts
  FOR UPDATE USING (true);

CREATE POLICY "Active shifts manage all" ON active_shifts
  FOR DELETE USING (true);

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