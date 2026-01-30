import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Shift } from '../types';
import type { Language } from './translations';

const formatDurationForPDF = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getDayNameForPDF = (date: Date): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

export const generatePDF = (shifts: Shift[], employeeName: string, monthYear: string, _lang: Language = 'en'): void => {
  const doc = new jsPDF();
  
  // Title - always in English for proper PDF rendering
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(`Attendance Report`, 105, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee: ${employeeName}`, 105, 30, { align: 'center' });
  
  doc.setFontSize(14);
  doc.text(`Month: ${monthYear}`, 105, 40, { align: 'center' });
  
  // Sort shifts by date descending (newest first, like Home page)
  const sortedShifts = [...shifts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Table data - always formatted in a PDF-friendly way
  const tableData = sortedShifts.map(shift => {
    const date = new Date(shift.date);
    const checkInTime = new Date(shift.checkIn).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    const checkOutTime = shift.checkOut 
      ? new Date(shift.checkOut).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        })
      : '-';
    
    // Clean the note - remove Hebrew text that won't render properly
    const cleanNote = shift.note 
      ? shift.note.replace(/[\u0590-\u05FF]/g, '').trim() || '-'
      : '-';
    
    // Format date as DD/MM/YYYY
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;
    
    return [
      formattedDate,
      getDayNameForPDF(date),
      checkInTime,
      checkOutTime,
      formatDurationForPDF(shift.duration),
      cleanNote
    ];
  });
  
  // Calculate total hours
  const totalMinutes = shifts.reduce((acc, shift) => acc + shift.duration, 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  
  // Generate table
  const headers = [['Date', 'Day', 'Check In', 'Check Out', 'Duration', 'Notes']];
    
  autoTable(doc, {
    head: headers,
    body: tableData,
    startY: 50,
    styles: {
      halign: 'center',
      fontSize: 10,
      font: 'helvetica',
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 11,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 255],
    },
    columnStyles: {
      0: { cellWidth: 28 }, // Date
      1: { cellWidth: 22 }, // Day
      2: { cellWidth: 22 }, // Check In
      3: { cellWidth: 22 }, // Check Out
      4: { cellWidth: 28 }, // Duration
      5: { cellWidth: 'auto' }, // Notes
    },
  });
  
  // Add total
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY || 100;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${totalHours} hours and ${totalMins} minutes`, 105, finalY + 15, { align: 'center' });
  
  // Add generation date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(128);
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-US')}`, 105, finalY + 25, { align: 'center' });
  
  // Save with clean filename
  const cleanName = employeeName.replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
  const cleanMonth = monthYear.replace(/[^\w\s]/g, '').replace(/\s+/g, '_');
  const fileName = `attendance_${cleanName}_${cleanMonth}.pdf`;
  doc.save(fileName);
};
