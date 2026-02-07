import type { User } from '../types';
import { supabase, isSupabaseConfigured, supabaseUsers, supabaseShifts, setSupabaseUserId } from './supabase';
import { hashPassword, verifyPassword } from './passwordHash';

const USERS_KEY = 'attendance_users';
const CURRENT_USER_KEY = 'attendance_current_user';
const SESSION_TOKEN_KEY = 'attendance_session_token';

// Safe localStorage wrapper to handle QuotaExceededError (e.g. mobile Safari 5MB limit)
const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error(`localStorage.setItem failed for key "${key}":`, err);
    return false;
  }
};

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
    safeSetItem(SESSION_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  }
};

export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUsers = (users: User[]): void => {
  safeSetItem(USERS_KEY, JSON.stringify(users));
};

/**
 * Sync users from Supabase to localStorage
 * This ensures admin can see all users on any device
 */
export const syncUsersFromSupabase = async (): Promise<User[]> => {
  if (!isSupabaseConfigured() || !supabase) {
    return getUsers();
  }

  try {
    const dbUsers = await supabaseUsers.getAll();
    if (dbUsers.length > 0) {
      // Merge with local users (DB takes precedence)
      const localUsers = getUsers();
      const mergedUsers = [...dbUsers];
      
      // Add any local-only users that don't exist in DB
      for (const localUser of localUsers) {
        if (!mergedUsers.find(u => u.id === localUser.id || u.email === localUser.email)) {
          mergedUsers.push(localUser);
        }
      }
      
      saveUsers(mergedUsers);
      return mergedUsers;
    }
    return getUsers();
  } catch (error) {
    console.error('Failed to sync users from Supabase:', error);
    return getUsers();
  }
};

/**
 * SECURITY: Get current user with validation
 * - Validates session token matches stored token
 * - Returns stored user data (async validateSessionAsync will verify against DB)
 * 
 * Note: We no longer require the user to exist in local getUsers() list
 * because on a new device, localStorage is empty. The async validation
 * in validateSessionAsync() handles the full DB verification.
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
    
    // Check local users list for fresh data (but don't fail if not found)
    const users = getUsers();
    const localUser = users.find(u => u.id === storedUser.id);
    
    // If user is in local list, check if disabled
    if (localUser?.isDisabled) {
      console.warn('User is disabled - clearing session');
      clearSession();
      return null;
    }
    
    // Return the user (prefer local data if available for freshness)
    const userToReturn = localUser || storedUser;
    setSupabaseUserId(userToReturn.id);
    return { ...userToReturn, sessionToken: storedToken } as User;
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
    safeSetItem(CURRENT_USER_KEY, JSON.stringify(userWithToken));
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
      
      safeSetItem(CURRENT_USER_KEY, JSON.stringify(validatedUser));
      
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

      // Verify password (supports both hashed and legacy plain-text)
      const { match, needsUpgrade } = await verifyPassword(password, dbUser.password);
      if (!match) {
        return { success: false, error: 'incorrectPassword' };
      }

      // Auto-upgrade plain-text password to hash on successful login
      if (needsUpgrade) {
        const hashed = await hashPassword(password);
        dbUser.password = hashed;
        try { await supabaseUsers.upsert(dbUser); } catch { /* best effort */ }
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
      } catch (error) {
        console.debug('Local user sync failed:', error);
      }

      // Auto-grant admin to primary admin email locally
      if (isPrimaryAdmin(dbUser.email) && !dbUser.isAdmin) {
        dbUser.isAdmin = true;
        // attempt to update DB copy (best-effort)
        try {
          await supabaseUsers.update(dbUser);
        } catch (error) {
          console.debug('Supabase admin update failed:', error);
        }
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
  
  // Verify password (supports both hashed and legacy plain-text)
  const localVerify = await verifyPassword(password, user.password);
  if (!localVerify.match) {
    return { success: false, error: 'incorrectPassword' };
  }

  // Auto-upgrade plain-text password to hash
  if (localVerify.needsUpgrade) {
    const hashed = await hashPassword(password);
    user.password = hashed;
  }
  
  // Auto-grant admin to primary admin email
  if (isPrimaryAdmin(user.email) && !user.isAdmin) {
    user.isAdmin = true;
  }

  const userIndex = users.findIndex(u => u.id === user.id);
  if (userIndex >= 0) {
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
        const ok = await supabaseUsers.upsert(u);
        if (ok) {
          updated++;
          console.log(`Updated user in Supabase: ${u.email}`);
        } else {
          skipped++;
        }
        continue;
      }

      // Create the user in Supabase (best-effort)
      const ok = await supabaseUsers.upsert(u);
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
export const registerUser = async (name: string, email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
  const users = getUsers();
  
  // Check if email already exists
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { success: false, error: 'emailExists' };
  }

  const hashedPw = await hashPassword(password);
  
  const newUser: User = {
    id: generateUserId(),
    name,
    email,
    password: hashedPw,
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
  
  const hashedPw = await hashPassword(password);

  const newUser: User = {
    id: generateUserId(),
    name,
    email,
    password: hashedPw,
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
  setSupabaseUserId(userId);
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);

  const applyLocalUpdate = (updatedUser: User) => {
    if (userIndex === -1) {
      users.push(updatedUser);
    } else {
      users[userIndex] = updatedUser;
    }
    saveUsers(users);

    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser(updatedUser);
    }
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const sourceUser = userIndex !== -1 ? users[userIndex] : await supabaseUsers.get(userId);
      if (!sourceUser) return false;

      const updatedUser = {
        ...sourceUser,
        name,
        profilePicture: profilePicture !== undefined ? profilePicture : sourceUser.profilePicture,
      };

      const success = await supabaseUsers.upsert(updatedUser);
      if (!success) {
        console.error('Failed to update user profile in Supabase');
        return false;
      }

      // Also update userName in all shifts for this user
      if (sourceUser.name !== name) {
        await supabaseShifts.updateUserName(userId, name);
      }

      applyLocalUpdate(updatedUser);
      return true;
    } catch (error) {
      console.error('Supabase updateUserProfile error:', error);
      return false;
    }
  }

  if (userIndex === -1) return false;

  const updatedUser = {
    ...users[userIndex],
    name,
    profilePicture: profilePicture !== undefined ? profilePicture : users[userIndex].profilePicture,
  };

  applyLocalUpdate(updatedUser);
  return true;
};

// Change user password (user can change their own password)
export const changeUserPassword = async (
  userId: string, 
  currentPassword: string, 
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  // Validate new password
  if (newPassword.length < 6) {
    return { success: false, error: 'passwordTooShort' };
  }

  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  const localUser = userIndex === -1 ? null : users[userIndex];

  // If Supabase is configured, validate against DB for cross-device consistency
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbUser = await supabaseUsers.get(userId);
      if (!dbUser) {
        return { success: false, error: 'userNotFound' };
      }

      const { match } = await verifyPassword(currentPassword, dbUser.password);
      if (!match) {
        return { success: false, error: 'incorrectPassword' };
      }

      const hashedNew = await hashPassword(newPassword);
      const updatedUser = { ...dbUser, password: hashedNew };
      const success = await supabaseUsers.upsert(updatedUser);
      if (!success) {
        return { success: false, error: 'updateFailed' };
      }

      // Sync local users list
      if (localUser) {
        users[userIndex] = updatedUser;
      } else {
        users.push(updatedUser);
      }
      saveUsers(users);

      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        setCurrentUser(updatedUser);
      }

      return { success: true };
    } catch (error) {
      console.error('Supabase changeUserPassword error:', error);
      return { success: false, error: 'updateFailed' };
    }
  }

  // Fallback: local-only password update
  if (!localUser) {
    return { success: false, error: 'userNotFound' };
  }

  // Verify current password (supports hashed and plain-text)
  const localVerify = await verifyPassword(currentPassword, localUser.password);
  if (!localVerify.match) {
    return { success: false, error: 'incorrectPassword' };
  }

  const hashedNewLocal = await hashPassword(newPassword);
  localUser.password = hashedNewLocal;
  users[userIndex] = localUser;
  saveUsers(users);

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(localUser);
  }

  return { success: true };
};

// Admin function: Delete a user permanently (removes user and all their shifts)
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
  
  // Delete from Supabase first (user and their shifts)
  if (isSupabaseConfigured() && supabase) {
    try {
      // Delete user's shifts first
      await supabaseUsers.deleteUserShifts(targetUserId);
      // Then delete the user
      await supabaseUsers.delete(targetUserId);
    } catch (error) {
      console.error('Supabase delete error:', error);
    }
  }
  
  // Delete user's shifts from localStorage
  const shifts = JSON.parse(localStorage.getItem('attendance_shifts') || '[]');
  const filteredShifts = shifts.filter((s: { userId: string }) => s.userId !== targetUserId);
  safeSetItem('attendance_shifts', JSON.stringify(filteredShifts));
  
  // Remove user from localStorage
  users.splice(userIndex, 1);
  saveUsers(users);
  
  return { success: true };
};

const generateUserId = (): string => {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};
