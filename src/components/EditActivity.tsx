import { useState, useCallback, useEffect } from 'react';
import type { Shift, User } from '../types';
import { getShiftsForMonth, addShift, generateId, deleteShiftsByDates } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

interface EditActivityProps {
  user: User;
  onShiftsUpdated: () => void;
}

interface DayInfo {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  hasShift: boolean;
  isSelected: boolean;
  isToday: boolean;
}

interface BulkFormData {
  checkInTime: string;
  checkOutTime: string;
  breakMinutes: number;
  dayType: 'office' | 'home' | 'sickDay' | 'other';
  note: string;
}

const EditActivity = ({ user, onShiftsUpdated }: EditActivityProps) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [existingShifts, setExistingShifts] = useState<Shift[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [formData, setFormData] = useState<BulkFormData>({
    checkInTime: '09:00',
    checkOutTime: '17:00',
    breakMinutes: 0,
    dayType: 'office',
    note: '',
  });

  // Load existing shifts for the current month
  useEffect(() => {
    const shifts = getShiftsForMonth(currentDate.getFullYear(), currentDate.getMonth())
      .filter(s => s.userId === user.id);
    setExistingShifts(shifts);
  }, [currentDate, user.id]);

  // Generate calendar days
  const generateCalendarDays = useCallback((): DayInfo[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    
    const days: DayInfo[] = [];
    
    // Days from previous month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        dayNumber: date.getDate(),
        isCurrentMonth: false,
        hasShift: false,
        isSelected: false,
        isToday: false,
      });
    }
    
    // Days of current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const hasShift = existingShifts.some(s => s.date === dateStr);
      
      days.push({
        date,
        dayNumber: day,
        isCurrentMonth: true,
        hasShift,
        isSelected: selectedDays.has(dateStr),
        isToday: date.toDateString() === today.toDateString(),
      });
    }
    
    // Days from next month to fill the grid
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        dayNumber: i,
        isCurrentMonth: false,
        hasShift: false,
        isSelected: false,
        isToday: false,
      });
    }
    
    return days;
  }, [currentDate, existingShifts, selectedDays]);

  const handleDayMouseDown = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    
    // Prevent selecting future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (date > today) return;
    
    setIsDragging(true);
    const dateStr = date.toISOString().split('T')[0];
    
    setSelectedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateStr)) {
        newSet.delete(dateStr);
      } else {
        newSet.add(dateStr);
      }
      return newSet;
    });
  };

  const handleDayMouseEnter = (date: Date, isCurrentMonth: boolean) => {
    if (!isDragging || !isCurrentMonth) return;
    
    // Prevent selecting future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    if (date > today) return;
    
    const dateStr = date.toISOString().split('T')[0];
    setSelectedDays(prev => {
      const newSet = new Set(prev);
      newSet.add(dateStr);
      return newSet;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDays(new Set());
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDays(new Set());
  };

  const handleClearSelection = () => {
    setSelectedDays(new Set());
  };

  const handleBulkFill = () => {
    if (selectedDays.size === 0) {
      alert(t.selectAtLeastOne);
      return;
    }
    setShowBulkModal(true);
  };

  const handleApplyBulk = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // Create shifts for all selected days (excluding future dates)
    selectedDays.forEach(dateStr => {
      const shiftDate = new Date(dateStr);
      
      // Skip future dates (safety check)
      if (shiftDate > today) {
        console.warn('Skipping future date:', dateStr);
        return;
      }
      
      const checkInDateTime = new Date(`${dateStr}T${formData.checkInTime}:00`);
      const checkOutDateTime = new Date(`${dateStr}T${formData.checkOutTime}:00`);
      
      // Calculate duration
      const duration = Math.round((checkOutDateTime.getTime() - checkInDateTime.getTime()) / (1000 * 60));

      const dayTypeNotes: Record<string, string> = {
        office: t.workFromOffice,
        home: t.workFromHome,
        sickDay: t.workSickDay,
        other: t.workOther,
      };

      const noteText = formData.note 
        ? `${dayTypeNotes[formData.dayType]} | ${formData.note}` 
        : dayTypeNotes[formData.dayType];

      const newShift: Shift = {
        id: generateId(),
        userId: user.id,
        userName: user.name,
        date: dateStr,
        checkIn: checkInDateTime.toISOString(),
        checkOut: checkOutDateTime.toISOString(),
        note: noteText,
        duration: Math.max(0, duration),
        breakMinutes: formData.breakMinutes || 0,
      };

      addShift(newShift);
    });

    // Reset and refresh
    setSelectedDays(new Set());
    setShowBulkModal(false);
    setFormData({
      checkInTime: '09:00',
      checkOutTime: '17:00',
      breakMinutes: 0,
      dayType: 'office',
      note: '',
    });
    
    // Refresh shifts
    const shifts = getShiftsForMonth(currentDate.getFullYear(), currentDate.getMonth())
      .filter(s => s.userId === user.id);
    setExistingShifts(shifts);
    onShiftsUpdated();
  };

  const handleDeleteSelected = () => {
    if (selectedDays.size === 0) {
      return;
    }
    
    const datesArray = Array.from(selectedDays);
    const shiftsToDelete = existingShifts.filter(s => datesArray.includes(s.date));
    
    if (shiftsToDelete.length === 0) {
      alert('No shifts found on selected dates');
      return;
    }
    
    const confirmMessage = `${t.confirmDelete} ${shiftsToDelete.length} shift(s)?`;
    
    if (!confirm(confirmMessage)) {
      return;
    }
    
    deleteShiftsByDates(user.id, datesArray);
    
    // Reset and refresh
    setSelectedDays(new Set());
    
    // Refresh shifts
    const shifts = getShiftsForMonth(currentDate.getFullYear(), currentDate.getMonth())
      .filter(s => s.userId === user.id);
    setExistingShifts(shifts);
    onShiftsUpdated();
  };

  const days = generateCalendarDays();

  return (
    <div className="w-full min-h-[calc(100vh-72px)]" style={{ backgroundColor: 'var(--f22-background)' }}>
      <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 min-h-[calc(100vh-72px)]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-[#39FF14]/20 rounded-lg">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--f22-text)' }}>{t.bulkCalendar}</h2>
          </div>
          
          {/* Month Navigation */}
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-end">
            <button
              onClick={handlePrevMonth}
              className="p-2 sm:p-2.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--f22-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--f22-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-base sm:text-lg font-semibold min-w-[140px] sm:min-w-[160px] text-center" style={{ color: 'var(--f22-text)' }}>
              {t.months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 sm:p-2.5 rounded-lg transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--f22-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--f22-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md" style={{ backgroundColor: '#6B7280' }}></div>
            <span style={{ color: 'var(--f22-text-muted)' }}>{t.selected}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-md" style={{ backgroundColor: isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.3)' }}></div>
            <span style={{ color: 'var(--f22-text-muted)' }}>{t.hasShift}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-amber-400 rounded-full"></div>
            <span style={{ color: 'var(--f22-text-muted)' }}>{t.today}</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="select-none flex-1">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
            {t.days_short.map((day: string) => (
              <div key={day} className="text-center py-1 sm:py-2 font-medium text-xs sm:text-sm" style={{ color: 'var(--f22-muted)' }}>
                {day}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {days.map((day, index) => {
              const isWeekend = day.date.getDay() === 5 || day.date.getDay() === 6;
              // Selected days: use gray in both modes for visibility
              const selectedBgColor = isDark ? '#6B7280' : '#6B7280';
              
              // Check if date is in the future
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              const isFutureDate = day.date > today;
              
              // Determine background color
              let bgColor: string;
              if (day.isSelected) {
                bgColor = selectedBgColor;
              } else if (!day.isCurrentMonth || isFutureDate) {
                // Days NOT in current month or future dates - use body background
                bgColor = 'var(--f22-bg)';
              } else if (day.hasShift) {
                // Days with shifts - light green
                bgColor = isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.3)';
              } else if (isWeekend) {
                // Weekend days without shifts - slightly different
                bgColor = 'var(--f22-bg)';
              } else {
                // Regular weekdays in current month - use surface
                bgColor = 'var(--f22-surface)';
              }
              
              return (
                <div
                  key={index}
                  onMouseDown={() => handleDayMouseDown(day.date, day.isCurrentMonth)}
                  onMouseEnter={() => handleDayMouseEnter(day.date, day.isCurrentMonth)}
                  className={`
                    relative min-h-[40px] sm:min-h-[calc((100vh-280px)/6)] flex items-center justify-center rounded-lg transition-all
                    ${day.isSelected ? 'shadow-lg scale-105' : ''}
                    ${!day.isCurrentMonth || isFutureDate ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}
                  `}
                  style={{
                    backgroundColor: bgColor,
                    color: !day.isCurrentMonth || isFutureDate ? 'var(--f22-text-muted)' : 'var(--f22-text)'
                  }}
                >
                  <span className={`text-sm sm:text-base font-bold ${
                    day.isToday && !day.isSelected 
                      ? 'bg-amber-400 text-black w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center' 
                      : day.isSelected 
                        ? 'text-white'
                        : day.hasShift && day.isCurrentMonth
                          ? 'text-[var(--f22-green)]' 
                          : ''
                  }`}>
                    {day.dayNumber}
                  </span>
                  {day.hasShift && !day.isSelected && day.isCurrentMonth && (
                    <div className="absolute bottom-1 sm:bottom-2 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--f22-green)] rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center mt-6 sm:mt-8 pt-4 sm:pt-6" style={{ borderTop: '1px solid var(--f22-border)' }}>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4">
            {selectedDays.size > 0 && (
              <span className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium" style={{ backgroundColor: 'var(--f22-background)', border: '1px solid var(--f22-border)', color: 'var(--f22-text)' }}>
                {selectedDays.size} {t.daysSelected}
              </span>
            )}
            {selectedDays.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="px-3 sm:px-5 py-2 sm:py-3 min-h-[40px] sm:min-h-[48px] rounded-lg transition-colors font-medium text-sm"
                style={{ color: 'var(--f22-muted)' }}
              >
                {t.clear}
              </button>
            )}
            {selectedDays.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="px-4 sm:px-6 py-2 sm:py-3 min-h-[40px] sm:min-h-[48px] bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold shadow-lg hover:shadow-xl flex items-center gap-2 sm:gap-3 text-sm"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t.delete}
              </button>
            )}
            <button
              onClick={handleBulkFill}
              disabled={selectedDays.size === 0}
              className="px-4 sm:px-6 py-2 sm:py-3 min-h-[40px] sm:min-h-[48px] bg-[#39FF14] text-[#0D0D0D] rounded-lg hover:bg-[var(--f22-green)] transition-all font-bold disabled:bg-[#333333] disabled:text-gray-600 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center gap-2 sm:gap-3 text-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {t.bulkFill}
            </button>
          </div>
        </div>

        {/* Bulk Fill Modal */}
        {showBulkModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6">
            <div className="rounded-lg p-4 sm:p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--f22-surface)', border: '1px solid var(--f22-border)' }}>
              <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--f22-text)' }}>{t.bulkFillTitle}</h3>
              <p className="mb-6 sm:mb-8 text-sm sm:text-base" style={{ color: 'var(--f22-muted)' }}>
                {t.detailsWillApply} {selectedDays.size} {t.selectedDays}
              </p>
              
              <div className="space-y-4 sm:space-y-6">
                {/* Time Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-medium text-sm sm:text-base" style={{ color: 'var(--f22-text)' }}>{t.checkInTimeLabel}</label>
                    <input
                      type="time"
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                      className="w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] transition-all"
                      style={{ backgroundColor: 'var(--f22-background)', border: '2px solid var(--f22-border)', color: 'var(--f22-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm sm:text-base" style={{ color: 'var(--f22-text)' }}>{t.checkOutTimeLabel}</label>
                    <input
                      type="time"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                      className="w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] transition-all"
                      style={{ backgroundColor: 'var(--f22-background)', border: '2px solid var(--f22-border)', color: 'var(--f22-text)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm sm:text-base" style={{ color: 'var(--f22-text)' }}>{t.breakMinutes}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.breakMinutes}
                      onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value, 10) || 0 })}
                      className="w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] transition-all"
                      style={{ backgroundColor: 'var(--f22-background)', border: '2px solid var(--f22-border)', color: 'var(--f22-text)' }}
                    />
                  </div>
                </div>

                {/* Day Type */}
                <div>
                  <label className="block mb-3 font-medium text-sm sm:text-base" style={{ color: 'var(--f22-text)' }}>{t.dayType}</label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    {[
                      { value: 'office', label: `🏢 ${t.office}` },
                      { value: 'home', label: `🏠 ${t.home}` },
                      { value: 'sickDay', label: `🤒 ${t.sickDay}` },
                      { value: 'other', label: `📋 ${t.other}` },
                    ].map(type => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, dayType: type.value as BulkFormData['dayType'] })}
                        className={`px-3 sm:px-4 py-2.5 sm:py-3 min-h-[44px] sm:min-h-[48px] rounded-lg border-2 transition-all font-medium text-sm sm:text-base ${
                          formData.dayType === type.value
                            ? 'border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14]'
                            : ''
                        }`}
                        style={formData.dayType !== type.value ? { borderColor: 'var(--f22-border)', color: 'var(--f22-text)' } : {}}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block mb-2 font-medium text-sm sm:text-base" style={{ color: 'var(--f22-text)' }}>{t.note} ({t.optional})</label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] resize-none transition-all placeholder:opacity-50"
                    style={{ backgroundColor: 'var(--f22-background)', border: '2px solid var(--f22-border)', color: 'var(--f22-text)' }}
                    rows={3}
                    placeholder={t.addNote}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 py-3 sm:py-4 min-h-[44px] sm:min-h-[48px] rounded-lg transition-all font-semibold text-sm sm:text-base"
                  style={{ backgroundColor: 'var(--f22-border)', color: 'var(--f22-text)' }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleApplyBulk}
                  className="flex-1 bg-[#39FF14] text-[#0D0D0D] py-3 sm:py-4 min-h-[44px] sm:min-h-[48px] rounded-lg hover:bg-[var(--f22-green)] transition-all font-bold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 sm:gap-3"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {t.applyTo} {selectedDays.size} {t.days}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditActivity;
