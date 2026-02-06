import type { Shift, ActiveShift } from '../types';
import { 
  isSupabaseConfigured, 
  supabaseShifts, 
  supabaseActiveShift 
} from './supabase';

const SHIFTS_KEY = 'attendance_shifts';
const ACTIVE_SHIFT_KEY = 'attendance_active_shift';

// Check if we should use Supabase (configured)
const shouldUseSupabase = (): boolean => {
  return isSupabaseConfigured();
};

// Clean up duplicate shifts (keep only the latest one per user per date)
const cleanupDuplicateShifts = (shifts: Shift[]): Shift[] => {
  const shiftMap = new Map<string, Shift>();
  
  // Sort by id (which contains timestamp) to keep the latest
  const sortedShifts = [...shifts].sort((a, b) => a.id.localeCompare(b.id));
  
  for (const shift of sortedShifts) {
    const key = `${shift.userId}-${shift.date}`;
    shiftMap.set(key, shift); // Later shifts overwrite earlier ones
  }
  
  return Array.from(shiftMap.values());
};

// localStorage operations (always used as fallback/cache)
const localGetShifts = (): Shift[] => {
  const data = localStorage.getItem(SHIFTS_KEY);
  if (!data) return [];
  
  const shifts = JSON.parse(data) as Shift[];
  const cleanedShifts = cleanupDuplicateShifts(shifts);
  
  // Save cleaned data back if there were duplicates
  if (cleanedShifts.length !== shifts.length) {
    localStorage.setItem(SHIFTS_KEY, JSON.stringify(cleanedShifts));
  }
  
  return cleanedShifts;
};

const localSaveShifts = (shifts: Shift[]): void => {
  localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts));
};

// Public API - uses Supabase when available, falls back to localStorage
export const getShifts = (): Shift[] => {
  // Always return from localStorage for synchronous access
  // Supabase sync happens in background
  return localGetShifts();
};

export const saveShifts = (shifts: Shift[]): void => {
  localSaveShifts(shifts);
};

export const addShift = (shift: Shift): void => {
  // Always save to localStorage first (immediate)
  const shifts = localGetShifts();
  const existingIndex = shifts.findIndex(
    s => s.userId === shift.userId && s.date === shift.date
  );
  
  if (existingIndex !== -1) {
    shifts[existingIndex] = shift;
  } else {
    shifts.push(shift);
  }
  localSaveShifts(shifts);
  
  // Also save to Supabase if configured (async, non-blocking)
  if (shouldUseSupabase()) {
    supabaseShifts.add(shift).catch(err => 
      console.error('Supabase addShift failed:', err)
    );
  }
};

export const updateShift = (updatedShift: Shift): void => {
  // Always update localStorage first
  const shifts = localGetShifts();
  const index = shifts.findIndex(s => s.id === updatedShift.id);
  if (index !== -1) {
    shifts[index] = updatedShift;
    localSaveShifts(shifts);
  }
  
  // Also update in Supabase if configured
  if (shouldUseSupabase()) {
    supabaseShifts.update(updatedShift).catch(err => 
      console.error('Supabase updateShift failed:', err)
    );
  }
};

export const deleteShift = (shiftId: string): void => {
  // Always delete from localStorage first
  const shifts = localGetShifts();
  const filtered = shifts.filter(s => s.id !== shiftId);
  localSaveShifts(filtered);
  
  // Also delete from Supabase if configured
  if (shouldUseSupabase()) {
    supabaseShifts.delete(shiftId).catch(err => 
      console.error('Supabase deleteShift failed:', err)
    );
  }
};

export const deleteShiftsByDates = (userId: string, dates: string[]): number => {
  // Always delete from localStorage first
  const shifts = localGetShifts();
  const datesSet = new Set(dates);
  const filtered = shifts.filter(s => !(s.userId === userId && datesSet.has(s.date)));
  const deletedCount = shifts.length - filtered.length;
  localSaveShifts(filtered);
  
  // Also delete from Supabase if configured
  if (shouldUseSupabase()) {
    supabaseShifts.deleteByDates(userId, dates).catch(err => 
      console.error('Supabase deleteByDates failed:', err)
    );
  }
  
  return deletedCount;
};

// localStorage operations for active shift
const localGetActiveShift = (): ActiveShift | null => {
  const data = localStorage.getItem(ACTIVE_SHIFT_KEY);
  return data ? JSON.parse(data) : null;
};

const localSetActiveShift = (shift: ActiveShift | null): void => {
  if (shift) {
    localStorage.setItem(ACTIVE_SHIFT_KEY, JSON.stringify(shift));
  } else {
    localStorage.removeItem(ACTIVE_SHIFT_KEY);
  }
};

export const getActiveShift = (): ActiveShift | null => {
  return localGetActiveShift();
};

export const setActiveShift = (shift: ActiveShift | null, userId?: string): void => {
  localSetActiveShift(shift);
  
  // Also save to Supabase if configured
  if (shouldUseSupabase() && userId) {
    supabaseActiveShift.set(shift, userId).catch(err => 
      console.error('Supabase setActiveShift failed:', err)
    );
  }
};

export const getShiftsForMonth = (year: number, month: number): Shift[] => {
  const shifts = localGetShifts();
  return shifts.filter(shift => {
    const shiftDate = new Date(shift.date);
    return shiftDate.getFullYear() === year && shiftDate.getMonth() === month;
  });
};

export const getShiftsForUser = (userId: string, year: number, month: number): Shift[] => {
  return getShiftsForMonth(year, month).filter(shift => shift.userId === userId);
};

// Async functions for Supabase sync (optional, for explicit sync)
export const syncShiftsFromSupabase = async (): Promise<Shift[]> => {
  if (!shouldUseSupabase()) return localGetShifts();
  
  try {
    const remoteShifts = await supabaseShifts.getAll();
    if (remoteShifts.length > 0) {
      // Merge remote shifts with local (remote takes precedence by user+date)
      const localShifts = localGetShifts();
      const mergedMap = new Map<string, Shift>();
      
      // Add local shifts first
      localShifts.forEach(s => mergedMap.set(`${s.userId}-${s.date}`, s));
      
      // Override with remote shifts
      remoteShifts.forEach(s => mergedMap.set(`${s.userId}-${s.date}`, s));
      
      const merged = Array.from(mergedMap.values());
      localSaveShifts(merged);
      return merged;
    }
    return localGetShifts();
  } catch (err) {
    console.error('Sync from Supabase failed:', err);
    return localGetShifts();
  }
};

export const subscribeToShiftChanges = (
  onSync?: (shifts: Shift[]) => void
) => {
  if (!shouldUseSupabase()) return null;

  const subscription = supabaseShifts.subscribeToChanges(async () => {
    const updated = await syncShiftsFromSupabase();
    if (onSync) onSync(updated);
  });

  return subscription;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('he-IL');
};

export const calculateDuration = (checkIn: string, checkOut: string): number => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
};

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours} שעות ו-${mins} דקות`;
};

export const getDayName = (date: Date): string => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[date.getDay()];
};
