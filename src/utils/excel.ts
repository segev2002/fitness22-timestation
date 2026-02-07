import * as XLSX from 'xlsx';
import type { Shift, User } from '../types';

interface ExportOptions {
  shifts: Shift[];
  users?: User[];
  fileName: string;
  monthYear: string;
  language: 'he' | 'en';
}

// Format duration from minutes to HH:MM
const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}:${mins.toString().padStart(2, '0')}`;
};

// Format date for display (DD/MM/YYYY)
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Format time from ISO string (HH:MMAM/PM)
const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hh = String(hours).padStart(2, '0');
  return `${hh}:${minutes}${suffix}`;
};

export const generateExcel = (options: ExportOptions): void => {
  const { shifts, users, fileName, monthYear, language } = options;
  
  const isHebrew = language === 'he';
  
  // Headers based on language
  const headers = isHebrew 
    ? ['שם עובד', 'תאריך', 'כניסה', 'יציאה', 'הפסקה (דקות)', 'משך נטו', 'הערות', 'מחלקה']
    : ['Employee', 'Date', 'Check In', 'Check Out', 'Break (min)', 'Net Duration', 'Notes', 'Department'];
  
  // Map shifts to rows
  const rows = shifts.map(shift => {
    const user = users?.find(u => u.id === shift.userId);
    const breakMins = shift.breakMinutes || 0;
    // shift.duration is already net of breaks (set in Home.tsx as netMinutes),
    // so we use it directly — do NOT subtract breakMinutes again.
    const netDuration = shift.duration;
    
    // Simplify note: if it's just "Work from Office", show empty
    let displayNote = shift.note || '';
    if (displayNote === 'Work from Office' || displayNote === 'עבודה מהמשרד') {
      displayNote = '';
    }
    
    // Use current user name (from users list) instead of stored userName in shift
    // This ensures the Excel always shows the latest name
    const employeeName = user?.name || shift.userName;
    
    return [
      employeeName,
  formatDate(shift.date),
      formatTime(shift.checkIn),
      shift.checkOut ? formatTime(shift.checkOut) : '-',
      breakMins || '',
      formatDuration(Math.max(0, netDuration)),
      displayNote,
      user?.department || '',
    ];
  });
  
  // Calculate totals
  // shift.duration is already net of breaks, so use it directly
  const totalWorkingDays = new Set(shifts.map(s => `${s.userId}-${s.date}`)).size;
  const totalMinutes = shifts.reduce((sum, s) => sum + s.duration, 0);
  const totalHours = formatDuration(totalMinutes);
  
  // Add summary rows
  const summaryLabel = isHebrew ? 'סיכום' : 'Summary';
  const totalDaysLabel = isHebrew ? 'סה"כ ימי עבודה' : 'Total Working Days';
  const totalHoursLabel = isHebrew ? 'סה"כ שעות עבודה' : 'Total Working Hours';
  
  rows.push([]); // Empty row
  rows.push([summaryLabel, '', '', '', '', '', '', '']);
  rows.push([totalDaysLabel, totalWorkingDays.toString(), '', '', '', '', '', '']);
  rows.push([totalHoursLabel, totalHours, '', '', '', '', '', '']);
  
  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // Employee
    { wch: 12 }, // Date
    { wch: 10 }, // Check In
    { wch: 10 }, // Check Out
    { wch: 12 }, // Break
    { wch: 12 }, // Duration
    { wch: 30 }, // Notes
    { wch: 15 }, // Department
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, monthYear);
  
  // Generate and download file
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// Export all shifts for admin (grouped by employee optionally)
export const generateAdminExcel = (
  shifts: Shift[], 
  users: User[], 
  monthYear: string, 
  language: 'he' | 'en'
): void => {
  generateExcel({
    shifts,
    users,
    fileName: `shifts_report_${monthYear.replace(/\s/g, '_')}`,
    monthYear,
    language,
  });
};
