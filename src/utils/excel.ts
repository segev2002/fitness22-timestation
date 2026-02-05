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

// Format date for display
const formatDate = (dateStr: string, language: 'he' | 'en'): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US');
};

// Format time from ISO string
const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
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
    const netDuration = shift.duration - breakMins;
    
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
      formatDate(shift.date, language),
      formatTime(shift.checkIn),
      shift.checkOut ? formatTime(shift.checkOut) : '-',
      breakMins || '',
      formatDuration(Math.max(0, netDuration)),
      displayNote,
      user?.department || '',
    ];
  });
  
  // Calculate totals
  const totalWorkingDays = new Set(shifts.map(s => `${s.userId}-${s.date}`)).size;
  const totalMinutes = shifts.reduce((sum, s) => sum + s.duration - (s.breakMinutes || 0), 0);
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
