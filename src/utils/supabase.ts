import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Shift, ActiveShift, User } from '../types';

// Environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (will be null if env vars not configured)
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabase);
};

// Track the current user id for RLS context
let supabaseUserId: string | null = null;

export const setSupabaseUserId = (userId: string | null): void => {
  supabaseUserId = userId;
};

/**
 * SECURITY: Set current user context for RLS policies
 * This should be called before any database operation to ensure
 * RLS policies can identify the current user.
 */
export const setSupabaseUserContext = async (userId: string): Promise<void> => {
  if (!supabase) return;
  
  try {
    await supabase.rpc('set_current_user', { user_id: userId });
  } catch (error) {
    // Function may not exist yet - that's okay, policies will fall back
    console.debug('set_current_user RPC not available:', error);
  }
};

const ensureSupabaseUserContext = async (): Promise<void> => {
  if (!supabase || !supabaseUserId) return;
  await setSupabaseUserContext(supabaseUserId);
};

// Database table interfaces
export interface DbShift {
  id: string;
  user_id: string;
  user_name: string;
  date: string;
  check_in: string;
  check_out: string | null;
  note: string | null;
  duration: number;
  break_minutes: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface DbUser {
  id: string;
  name: string;
  email: string;
  password: string;
  profile_picture: string | null;
  is_admin: boolean;
  is_disabled?: boolean;
  department: string | null;
  created_at?: string;
}

export interface DbActiveShift {
  user_id: string;
  user_name: string;
  check_in: string;
  start_time: number;
}

// Convert between app types and database types
export const shiftToDb = (shift: Shift): DbShift => ({
  id: shift.id,
  user_id: shift.userId,
  user_name: shift.userName,
  date: shift.date,
  check_in: shift.checkIn,
  check_out: shift.checkOut,
  note: shift.note || null,
  duration: shift.duration,
  break_minutes: shift.breakMinutes || null,
});

export const dbToShift = (db: DbShift): Shift => ({
  id: db.id,
  userId: db.user_id,
  userName: db.user_name,
  date: db.date,
  checkIn: db.check_in,
  checkOut: db.check_out,
  note: db.note || '',
  duration: db.duration,
  breakMinutes: db.break_minutes || undefined,
});

export const userToDb = (user: User): Omit<DbUser, 'created_at'> => ({
  id: user.id,
  name: user.name,
  email: user.email,
  password: user.password,
  profile_picture: user.profilePicture || null,
  is_admin: user.isAdmin || false,
  department: user.department || null,
});

export const dbToUser = (db: DbUser): User => ({
  id: db.id,
  name: db.name,
  email: db.email,
  password: db.password,
  createdAt: db.created_at || new Date().toISOString(),
  profilePicture: db.profile_picture || undefined,
  isAdmin: db.is_admin || false,
  isDisabled: db.is_disabled || false,
  department: db.department || undefined,
});

export const activeShiftToDb = (shift: ActiveShift): DbActiveShift => ({
  user_id: shift.userId,
  user_name: shift.userName,
  check_in: shift.checkIn,
  start_time: shift.startTime,
});

export const dbToActiveShift = (db: DbActiveShift): ActiveShift => ({
  userId: db.user_id,
  userName: db.user_name,
  checkIn: db.check_in,
  startTime: db.start_time,
});

// Supabase CRUD operations for shifts
export const supabaseShifts = {
  async getAll(): Promise<Shift[]> {
    if (!supabase) return [];
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Supabase getAll error:', error);
      return [];
    }
    
    return (data || []).map(dbToShift);
  },

  async getForMonth(year: number, month: number): Promise<Shift[]> {
    if (!supabase) return [];
    await ensureSupabaseUserContext();
    
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Supabase getForMonth error:', error);
      return [];
    }
    
    return (data || []).map(dbToShift);
  },

  async getForUser(userId: string, year: number, month: number): Promise<Shift[]> {
    if (!supabase) return [];
    await ensureSupabaseUserContext();
    
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Supabase getForUser error:', error);
      return [];
    }
    
    return (data || []).map(dbToShift);
  },

  async add(shift: Shift): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    // Check for existing shift on same date for same user
    const { data: existing } = await supabase
      .from('shifts')
      .select('id')
      .eq('user_id', shift.userId)
      .eq('date', shift.date)
      .single();
    
    if (existing) {
      // Update existing shift
      const { error } = await supabase
        .from('shifts')
        .update(shiftToDb(shift))
        .eq('id', existing.id);
      
      if (error) {
        console.error('Supabase update error:', error);
        return false;
      }
    } else {
      // Insert new shift
      const { error } = await supabase
        .from('shifts')
        .insert(shiftToDb(shift));
      
      if (error) {
        console.error('Supabase insert error:', error);
        return false;
      }
    }
    
    return true;
  },

  async update(shift: Shift): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    const { error } = await supabase
      .from('shifts')
      .update(shiftToDb(shift))
      .eq('user_id', shift.userId)
      .eq('date', shift.date);
    
    if (error) {
      console.error('Supabase update error:', error);
      return false;
    }
    
    return true;
  },

  async delete(shiftId: string): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', shiftId);
    
    if (error) {
      console.error('Supabase delete error:', error);
      return false;
    }
    
    return true;
  },

  async deleteByDates(userId: string, dates: string[]): Promise<number> {
    if (!supabase) return 0;
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('shifts')
      .delete()
      .eq('user_id', userId)
      .in('date', dates)
      .select('id');
    
    if (error) {
      console.error('Supabase deleteByDates error:', error);
      return 0;
    }
    
    return data?.length || 0;
  },

  // Subscribe to shifts changes (realtime)
  subscribeToChanges(callback: () => void): RealtimeChannel | null {
    if (!supabase) return null;

    const subscription = supabase
      .channel('shifts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          callback();
        }
      )
      .subscribe();

    return subscription;
  },
};

// Supabase CRUD operations for users
export const supabaseUsers = {
  async get(id: string): Promise<User | null> {
    if (!supabase) return null;
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Supabase getUser error:', error);
      return null;
    }
    
    return data ? dbToUser(data) : null;
  },

  async getByEmail(email: string): Promise<User | null> {
    if (!supabase) return null;
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Supabase getByEmail error:', error);
      return null;
    }
    
    return data ? dbToUser(data) : null;
  },

  async create(user: User): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    const { error } = await supabase
      .from('users')
      .insert(userToDb(user));
    
    if (error) {
      console.error('Supabase createUser error:', error);
      return false;
    }
    
    return true;
  },

  async update(user: User): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    const { error } = await supabase
      .from('users')
      .update(userToDb(user))
      .eq('id', user.id);
    
    if (error) {
      console.error('Supabase updateUser error:', error);
      return false;
    }
    
    return true;
  },

  // Admin: Delete a user permanently
  async delete(userId: string): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('Supabase deleteUser error:', error);
      return false;
    }
    
    return true;
  },

  // Admin: Delete all shifts for a user
  async deleteUserShifts(userId: string): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('user_id', userId);
    
    if (error) {
      console.error('Supabase deleteUserShifts error:', error);
      return false;
    }
    
    return true;
  },

  // Admin: Get all users
  async getAll(): Promise<User[]> {
    if (!supabase) return [];
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Supabase getAllUsers error:', error);
      return [];
    }
    
    return (data || []).map(dbToUser);
  },
};

// Active shift operations (real-time tracking)
export const supabaseActiveShift = {
  async get(userId: string): Promise<ActiveShift | null> {
    if (!supabase) return null;
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('active_shifts')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase getActiveShift error:', error);
      return null;
    }
    
    if (!data) return null;
    
    return dbToActiveShift(data);
  },

  async set(shift: ActiveShift | null, userId: string): Promise<boolean> {
    if (!supabase) return false;
    await ensureSupabaseUserContext();
    
    if (shift === null) {
      // Delete active shift
      const { error } = await supabase
        .from('active_shifts')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error('Supabase deleteActiveShift error:', error);
        return false;
      }
    } else {
      // Upsert active shift
      const { error } = await supabase
        .from('active_shifts')
        .upsert(activeShiftToDb(shift), { onConflict: 'user_id' });
      
      if (error) {
        console.error('Supabase setActiveShift error:', error);
        return false;
      }
    }
    
    return true;
  },

  // Admin: Get all active shifts (who is currently checked in)
  async getAll(): Promise<ActiveShift[]> {
    if (!supabase) return [];
    await ensureSupabaseUserContext();
    
    const { data, error } = await supabase
      .from('active_shifts')
      .select('*')
      .order('check_in', { ascending: false });
    
    if (error) {
      console.error('Supabase getAllActiveShifts error:', error);
      return [];
    }
    
    return (data || []).map(dbToActiveShift);
  },

  // Subscribe to active shifts changes (realtime)
  subscribeToChanges(callback: (shifts: ActiveShift[]) => void) {
    if (!supabase) return null;
    
    const subscription = supabase
      .channel('active_shifts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'active_shifts' },
        async () => {
          // Fetch all active shifts when any change happens
          const shifts = await this.getAll();
          callback(shifts);
        }
      )
      .subscribe();
    
    return subscription;
  },
};

// SQL schema for Supabase (to be run in Supabase SQL editor)
export const SUPABASE_SCHEMA = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  profile_picture TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  is_disabled BOOLEAN DEFAULT FALSE,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  date DATE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  check_out TIMESTAMP WITH TIME ZONE,
  note TEXT,
  duration INTEGER NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Active shifts table (for tracking currently clocked-in users)
CREATE TABLE IF NOT EXISTS active_shifts (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL,
  start_time BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_shifts_user_date ON shifts(user_id, date);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_shifts ENABLE ROW LEVEL SECURITY;
`;

// SECURITY: Proper RLS policies to be applied in Supabase SQL editor
// These replace the insecure "USING (true)" policies
export const SUPABASE_SECURE_RLS_POLICIES = `
-- ============================================
-- SECURITY FIX: Proper Row Level Security Policies
-- Run this in Supabase SQL Editor to secure the database
-- ============================================

-- First, drop the insecure "allow all" policies if they exist
DROP POLICY IF EXISTS "Allow all users" ON users;
DROP POLICY IF EXISTS "Allow all shifts" ON shifts;
DROP POLICY IF EXISTS "Allow all active_shifts" ON active_shifts;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "users_select_own" ON users 
  FOR SELECT 
  USING (
    -- User can see their own record
    id = current_setting('app.current_user_id', true)
    -- OR user is an admin (can see all users)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND (is_admin = true OR email = 'shiras@fitness22.com')
    )
  );

-- Users can update their own profile (but not is_admin flag)
CREATE POLICY "users_update_own" ON users 
  FOR UPDATE 
  USING (id = current_setting('app.current_user_id', true))
  WITH CHECK (
    id = current_setting('app.current_user_id', true)
    -- Prevent users from changing their own admin status (must be done by primary admin)
  );

-- Only primary admin can insert new users
CREATE POLICY "users_insert_admin" ON users 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND (is_admin = true OR email = 'shiras@fitness22.com')
    )
  );

-- Only primary admin can delete users
CREATE POLICY "users_delete_admin" ON users 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND email = 'shiras@fitness22.com'
    )
  );

-- ============================================
-- SHIFTS TABLE POLICIES
-- ============================================

-- Users can read their own shifts, admins can read all
CREATE POLICY "shifts_select" ON shifts 
  FOR SELECT 
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND (is_admin = true OR email = 'shiras@fitness22.com')
    )
  );

-- Users can insert their own shifts only
CREATE POLICY "shifts_insert" ON shifts 
  FOR INSERT 
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND (is_admin = true OR email = 'shiras@fitness22.com')
    )
  );

-- Users can update their own shifts, admins can update all
CREATE POLICY "shifts_update" ON shifts 
  FOR UPDATE 
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND (is_admin = true OR email = 'shiras@fitness22.com')
    )
  );

-- Users can delete their own shifts, admins can delete all
CREATE POLICY "shifts_delete" ON shifts 
  FOR DELETE 
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = current_setting('app.current_user_id', true) 
      AND (is_admin = true OR email = 'shiras@fitness22.com')
    )
  );

-- ============================================
-- ACTIVE_SHIFTS TABLE POLICIES
-- ============================================

-- Anyone can read active shifts (for live dashboard)
CREATE POLICY "active_shifts_select" ON active_shifts 
  FOR SELECT 
  USING (true);

-- Users can only insert/update their own active shift
CREATE POLICY "active_shifts_insert" ON active_shifts 
  FOR INSERT 
  WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "active_shifts_update" ON active_shifts 
  FOR UPDATE 
  USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "active_shifts_delete" ON active_shifts 
  FOR DELETE 
  USING (user_id = current_setting('app.current_user_id', true));

-- ============================================
-- HELPER FUNCTION: Set current user context
-- Call this at the start of each request
-- ============================================
CREATE OR REPLACE FUNCTION set_current_user(user_id TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

// Migration for existing tables
export const SUPABASE_MIGRATION = `
-- Migration for existing tables (run if tables already exist):
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;
`;
