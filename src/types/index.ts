export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // In real app, this would be hashed
  createdAt: string;
  profilePicture?: string; // Base64 encoded image
  isAdmin?: boolean; // Admin role flag
  department?: string; // Country/department (e.g., Israel, Cyprus, Russia)
  isDisabled?: boolean; // Soft-delete flag
}

export interface Shift {
  id: string;
  userId: string;
  userName: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  note: string;
  duration: number; // in minutes (net working time after breaks)
  breakMinutes?: number; // Break duration in minutes
}

export interface ActiveShift {
  userId: string;
  userName: string;
  checkIn: string;
  startTime: number; // timestamp
}

export type ViewType = 'home' | 'edit-activity' | 'profile' | 'admin';
