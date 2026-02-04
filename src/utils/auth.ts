import type { User } from '../types';
import { supabase, isSupabaseConfigured, supabaseUsers, setSupabaseUserId } from './supabase';

const USERS_KEY = 'attendance_users';
const CURRENT_USER_KEY = 'attendance_current_user';
const SESSION_TOKEN_KEY = 'attendance_session_token';

// Primary admin email - this user is always admin and can manage all other admins
// Change this to your desired admin email
export const PRIMARY_ADMIN_EMAIL = 'shiras@fitness22.com';

// List of departments/countries
export const DEPARTMENTS = ['Israel', 'Cyprus', 'Russia', 'USA', 'UK', 'Other'] as const;
export type Department = typeof DEPARTMENTS[number];

// Generate a secure session token
const generateSessionToken = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
};

// Get stored session token
const getSessionToken = (): string | null => {
  return localStorage.getItem(SESSION_TOKEN_KEY);
};

// Set session token
const setSessionToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUsers = (users: User[]): void => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

/**
 * SECURITY: Get current user with validation
 * - Validates session token matches stored token
 * - Validates user still exists and is not disabled
 * - Returns fresh data from users list (not stale cached data)
 */
export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  const storedToken = getSessionToken();
  
  if (!data || !storedToken) {
    // No valid session
    clearSession();
    return null;
  }
  
  try {
    const storedUser = JSON.parse(data) as User & { sessionToken?: string };
    
    // SECURITY: Validate session token matches
    if (storedUser.sessionToken !== storedToken) {
      console.warn('Session token mismatch - clearing session');
      clearSession();
      return null;
    }
    
    // Validate user still exists in the users list
    const users = getUsers();
    const validUser = users.find(u => u.id === storedUser.id);
    
    if (!validUser) {
      console.warn('User no longer exists in system - clearing session');
      clearSession();
      return null;
    }
    
    // SECURITY: Check if user is disabled
    if (validUser.isDisabled) {
      console.warn('User is disabled - clearing session');
      clearSession();
      return null;
    }
    
    // Return the validated user with latest data from users list
    // BUT preserve the session token for this session
    setSupabaseUserId(validUser.id);
    return { ...validUser, sessionToken: storedToken } as User;
  } catch {
    console.error('Failed to parse current user - clearing session');
    clearSession();
    return null;
  }
};

/**
 * SECURITY: Clear all session data
 */
const clearSession = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  setSupabaseUserId(null);
};

export const setCurrentUser = (user: User | null): void => {
  setSupabaseUserId(user ? user.id : null);
  if (user) {
    // Generate new session token for this login
    const sessionToken = generateSessionToken();
    setSessionToken(sessionToken);
    
    // Store user with session token
    const userWithToken = { ...user, sessionToken };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithToken));
  } else {
    clearSession();
  }
};

/**
 * SECURITY: Validate current session against database
 * This should be called on app load to ensure user data is fresh and valid.
 * Returns the validated user from the database, or null if session is invalid.
 */
export const validateSessionAsync = async (): Promise<User | null> => {
  const localUser = getCurrentUser();
  if (!localUser) {
    return null;
  }

  setSupabaseUserId(localUser.id);
  
  // If Supabase is configured, validate against database
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbUser = await supabaseUsers.get(localUser.id);
      
      if (!dbUser) {
        console.warn('User not found in database - clearing session');
        clearSession();
        return null;
      }
      
      // SECURITY: Check if user is disabled in database
      if (dbUser.isDisabled) {
        console.warn('User is disabled in database - clearing session');
        clearSession();
        return null;
      }
      
      // SECURITY: Update local data with fresh database values (especially isAdmin)
      const validatedUser = {
        ...dbUser,
        // Preserve session token
        sessionToken: (localUser as User & { sessionToken?: string }).sessionToken,
      };
      
      // Update localStorage with fresh data but keep session token
      const users = getUsers();
      const userIndex = users.findIndex(u => u.id === dbUser.id);
      if (userIndex >= 0) {
        users[userIndex] = dbUser;
        saveUsers(users);
      }
      
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(validatedUser));
      
      return dbUser;
    } catch (error) {
      console.error('Failed to validate session against database:', error);
      // On network error, fall back to local validation
      return localUser;
    }
  }
  
  // Supabase not configured - use local validation only
  return localUser;
};

/**
 * SECURITY: Force logout current user
 */
export const forceLogout = (): void => {
  clearSession();
};

// Check if a user is the primary admin
export const isPrimaryAdmin = (email: string): boolean => {
  return email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
};

/**
 * SECURITY: Check if user has admin privileges
 * This checks the isAdmin flag and primary admin email.
 * For sensitive operations, always re-validate against the database.
 */
export const isUserAdmin = (user: User): boolean => {
  return user.isAdmin === true || isPrimaryAdmin(user.email);
};

/**
 * SECURITY: Validate admin status against database
 * Use this for sensitive admin operations to ensure admin status hasn't been revoked.
 */
export const validateAdminAsync = async (user: User): Promise<boolean> => {
  // Primary admin is always admin
  if (isPrimaryAdmin(user.email)) {
    return true;
  }
  
  // If Supabase is configured, validate against database
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbUser = await supabaseUsers.get(user.id);
      if (!dbUser) {
        return false;
      }
      return dbUser.isAdmin === true;
    } catch (error) {
      console.error('Failed to validate admin status:', error);
      // On error, fall back to local check
      return user.isAdmin === true;
    }
  }
  
  return user.isAdmin === true;
};

export const loginUser = async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  // If Supabase is configured, try to authenticate against the database first
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbUser = await supabaseUsers.getByEmail(email.toLowerCase());
      if (!dbUser) {
        // Fall back to localStorage if DB user not found
        // but keep the explicit not found response for clarity
        return { success: false, error: 'userNotFound' };
      }

      if (dbUser.isDisabled) {
        return { success: false, error: 'userDisabled' };
      }

      // NOTE: this project stores plain-text passwords by default.
      // If you add hashing later, update this check accordingly.
      if (dbUser.password !== password) {
        return { success: false, error: 'incorrectPassword' };
      }

      // Sync localStorage users list with DB (optional)
      try {
        const users = getUsers();
        const idx = users.findIndex(u => u.id === dbUser.id);
        if (idx === -1) {
          users.push(dbUser);
        } else {
          users[idx] = dbUser;
        }
        saveUsers(users);
      } catch (e) {
        // ignore local sync errors
      }

      // Auto-grant admin to primary admin email locally
      if (isPrimaryAdmin(dbUser.email) && !dbUser.isAdmin) {
        dbUser.isAdmin = true;
        // attempt to update DB copy (best-effort)
        try { await supabaseUsers.update(dbUser); } catch (_) {}
      }

      setCurrentUser(dbUser);
      return { success: true, user: dbUser };
    } catch (error) {
      console.error('Supabase login error:', error);
      // Fall back to localStorage below
    }
  } else {
    console.error("Supabase not configured properly.");
  }

  // Fallback: localStorage-based authentication (legacy)
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return { success: false, error: 'userNotFound' };
  }
  
  // Check if user is disabled
  if (user.isDisabled) {
    return { success: false, error: 'userDisabled' };
  }
  
  if (user.password !== password) {
    return { success: false, error: 'incorrectPassword' };
  }
  
  // Auto-grant admin to primary admin email
  if (isPrimaryAdmin(user.email) && !user.isAdmin) {
    user.isAdmin = true;
    const userIndex = users.findIndex(u => u.id === user.id);
    users[userIndex] = user;
    saveUsers(users);
  }
  
  setCurrentUser(user);
  return { success: true, user };
};

/**
 * Migrate any users currently stored in localStorage into Supabase.
 * This is a convenience migration for projects that started with localStorage.
 * It will create any users that do not already exist in the database,
 * and update existing users with local data.
 */
export const migrateLocalUsersToSupabase = async (): Promise<{ created: number; updated: number; skipped: number }> => {
  if (!isSupabaseConfigured() || !supabase) return { created: 0, updated: 0, skipped: 0 };

  const localUsers = getUsers();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const u of localUsers) {
    try {
      const existing = await supabaseUsers.getByEmail(u.email);
      if (existing) {
        // User exists, try to update with local data
        const ok = await supabaseUsers.update(u);
        if (ok) {
          updated++;
          console.log(`Updated user in Supabase: ${u.email}`);
        } else {
          skipped++;
        }
        continue;
      }

      // Create the user in Supabase (best-effort)
      const ok = await supabaseUsers.create(u);
      if (ok) {
        created++;
        console.log(`Migrated user to Supabase: ${u.email}`);
      } else {
        skipped++;
      }
    } catch (err) {
      console.error('Failed to migrate user to Supabase:', u.email, err);
      skipped++;
    }
  }

  return { created, updated, skipped };
};

// Public registration is disabled - only admins can create users
// This function is kept for backward compatibility but should only be called by admins
export const registerUser = (name: string, email: string, password: string): { success: boolean; user?: User; error?: string } => {
  const users = getUsers();
  
  // Check if email already exists
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { success: false, error: 'emailExists' };
  }
  
  const newUser: User = {
    id: generateUserId(),
    name,
    email,
    password, // In real app, this would be hashed
    createdAt: new Date().toISOString(),
    isAdmin: isPrimaryAdmin(email), // Auto-grant admin to primary admin email
  };
  
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);
  
  return { success: true, user: newUser };
};

// Admin function: Create a new user (only admins can call this)
export const adminCreateUser = async (
  adminUser: User,
  name: string, 
  email: string, 
  password: string,
  department?: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  // Verify caller is admin
  if (!isUserAdmin(adminUser)) {
    return { success: false, error: 'notAuthorized' };
  }
  
  const users = getUsers();
  
  // Check if email already exists locally
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { success: false, error: 'emailExists' };
  }
  
  // Also check if email exists in Supabase
  if (isSupabaseConfigured() && supabase) {
    const dbUser = await supabaseUsers.getByEmail(email.toLowerCase());
    if (dbUser) {
      return { success: false, error: 'emailExists' };
    }
  }
  
  const newUser: User = {
    id: generateUserId(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
    isAdmin: isPrimaryAdmin(email),
    department,
  };
  
  // Save to localStorage
  users.push(newUser);
  saveUsers(users);
  
  // Also save to Supabase if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const success = await supabaseUsers.create(newUser);
      if (!success) {
        console.error('Failed to create user in Supabase');
      }
    } catch (error) {
      console.error('Supabase createUser error:', error);
    }
  }
  
  return { success: true, user: newUser };
};

// Admin function: Update user admin status (only primary admin can do this)
export const adminToggleUserAdmin = async (
  adminUser: User,
  targetUserId: string,
  makeAdmin: boolean
): Promise<{ success: boolean; error?: string }> => {
  // Only primary admin can promote/demote admins
  if (!isPrimaryAdmin(adminUser.email)) {
    return { success: false, error: 'onlyPrimaryAdmin' };
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === targetUserId);
  
  if (userIndex === -1) {
    return { success: false, error: 'userNotFound' };
  }
  
  // Cannot demote primary admin
  if (isPrimaryAdmin(users[userIndex].email) && !makeAdmin) {
    return { success: false, error: 'cannotDemotePrimaryAdmin' };
  }
  
  users[userIndex].isAdmin = makeAdmin;
  saveUsers(users);
  
  // Also update in Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabaseUsers.update(users[userIndex]);
    } catch (error) {
      console.error('Supabase update error:', error);
    }
  }
  
  return { success: true };
};

// Admin function: Update user department (only primary admin can do this)
export const adminUpdateUserDepartment = async (
  adminUser: User,
  targetUserId: string,
  department: string
): Promise<{ success: boolean; error?: string }> => {
  // Only primary admin can change departments
  if (!isPrimaryAdmin(adminUser.email)) {
    return { success: false, error: 'onlyPrimaryAdmin' };
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === targetUserId);
  
  if (userIndex === -1) {
    return { success: false, error: 'userNotFound' };
  }
  
  users[userIndex].department = department;
  saveUsers(users);
  
  // Also update in Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabaseUsers.update(users[userIndex]);
    } catch (error) {
      console.error('Supabase update error:', error);
    }
  }
  
  return { success: true };
};

export const logoutUser = (): void => {
  setCurrentUser(null);
};

export const updateUserProfile = async (userId: string, name: string, profilePicture?: string): Promise<boolean> => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) return false;
  
  users[userIndex].name = name;
  if (profilePicture !== undefined) {
    users[userIndex].profilePicture = profilePicture;
  }
  saveUsers(users);
  
  // Also update in Supabase database if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const success = await supabaseUsers.update(users[userIndex]);
      if (!success) {
        console.error('Failed to update user profile in Supabase');
      }
    } catch (error) {
      console.error('Supabase updateUserProfile error:', error);
    }
  }
  
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(users[userIndex]);
  }
  
  return true;
};

// Change user password (user can change their own password)
export const changeUserPassword = async (
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return { success: false, error: 'userNotFound' };
  }
  
  // Verify current password
  if (users[userIndex].password !== currentPassword) {
    return { success: false, error: 'incorrectPassword' };
  }
  
  // Validate new password
  if (newPassword.length < 6) {
    return { success: false, error: 'passwordTooShort' };
  }
  
  // Update password
  users[userIndex].password = newPassword;
  saveUsers(users);
  
  // Also update in Supabase database if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const success = await supabaseUsers.update(users[userIndex]);
      if (!success) {
        console.error('Failed to update password in Supabase');
      }
    } catch (error) {
      console.error('Supabase changeUserPassword error:', error);
    }
  }
  
  // Update current user session if this is the logged-in user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(users[userIndex]);
  }
  
  return { success: true };
};

// Admin function: Delete/disable a user (soft delete - keeps historical shifts)
export const adminDeleteUser = async (
  adminUser: User,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> => {
  // Verify caller is admin
  if (!isUserAdmin(adminUser)) {
    return { success: false, error: 'notAuthorized' };
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === targetUserId);
  
  if (userIndex === -1) {
    return { success: false, error: 'userNotFound' };
  }
  
  // Cannot delete primary admin
  if (isPrimaryAdmin(users[userIndex].email)) {
    return { success: false, error: 'cannotDeletePrimaryAdmin' };
  }
  
  // Cannot delete yourself
  if (adminUser.id === targetUserId) {
    return { success: false, error: 'cannotDeleteSelf' };
  }
  
  // Soft delete: mark as disabled instead of removing
  // This preserves historical shift data
  users[userIndex].isDisabled = true;
  saveUsers(users);
  
  // Also update in Supabase
  if (isSupabaseConfigured() && supabase) {
    try {
      await supabaseUsers.update(users[userIndex]);
    } catch (error) {
      console.error('Supabase update error:', error);
    }
  }
  
  return { success: true };
};

const generateUserId = (): string => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};
