import { useState } from 'react';
import type { User } from '../types';
import { getShiftsForUser } from '../utils/storage';
import { generatePDF } from '../utils/pdf';
import { useLanguage } from '../context/LanguageContext';

interface PDFExportProps {
  user: User;
}

const PDFExport = ({ user }: PDFExportProps) => {
  const { t, language } = useLanguage();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    
    const shifts = getShiftsForUser(user.id, year, month - 1);
    
    if (shifts.length === 0) {
      alert(t.noShiftsToExport);
      return;
    }

    setIsExporting(true);
    
    try {
      const monthYear = `${t.months[month - 1]} ${year}`;
      generatePDF(shifts, user.name, monthYear, language);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full min-h-[calc(100vh-72px)] px-4 sm:px-6 md:px-8 py-4 sm:py-6" style={{ backgroundColor: 'var(--f22-background)' }}>
      <div className="rounded-lg shadow-lg p-4 sm:p-6" style={{ backgroundColor: 'var(--f22-surface)', border: '1px solid var(--f22-border)' }}>
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="p-2 sm:p-2.5 bg-[#39FF14]/20 rounded-lg">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--f22-text)' }}>{t.pdfExport}</h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block mb-2 font-medium text-sm sm:text-base" style={{ color: 'var(--f22-muted)' }}>{t.month}</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#39FF14] transition-all text-sm sm:text-base"
              style={{ backgroundColor: 'var(--f22-background)', border: '2px solid var(--f22-border)', color: 'var(--f22-text)' }}
            />
          </div>

          <div className="w-full sm:w-auto">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto bg-[#39FF14] text-[#0D0D0D] px-6 sm:px-8 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] rounded-lg hover:bg-[#00D438] transition-all font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isExporting ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {t.exportPDF}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFExport;
