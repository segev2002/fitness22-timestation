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

// Expense Report Types
export type Currency = 'NIS' | 'USD' | 'EUR';

export interface ExpenseItem {
  id: string;
  expenseReportId: string;
  currency: Currency;
  quantity: number;
  description: string;
  unitPrice: number;
  lineTotal: number;
  invoiceUrl?: string; // URL to uploaded invoice image
  invoiceBase64?: string; // Base64 encoded invoice for local storage
  createdAt: string;
}

export interface ExpenseReport {
  id: string;
  userId: string;
  userName: string;
  month: string; // Format: "YYYY-MM" (e.g., "2026-02")
  expensePeriod: string; // Display format (e.g., "Feb, 2026")
  checkedBy?: string;
  approvedBy?: string;
  
  // NIS expenses
  itemsNIS: ExpenseItem[];
  totalNIS: number;
  
  // USD expenses
  itemsUSD: ExpenseItem[];
  totalUSD: number;
  exchangeRateUSD: number;
  totalUSDInNIS: number;
  
  // EUR expenses
  itemsEUR: ExpenseItem[];
  totalEUR: number;
  exchangeRateEUR: number;
  totalEURInNIS: number;
  
  // Grand total
  grandTotalNIS: number;
  
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export type ViewType = 'home' | 'edit-activity' | 'profile' | 'admin' | 'expenses';
