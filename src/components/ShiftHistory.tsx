import { useState } from 'react';
import type { Shift } from '../types';
import { updateShift, deleteShift } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';

interface ShiftHistoryProps {
  shifts: Shift[];
  onUpdate: () => void;
}

const ShiftHistory = ({ shifts, onUpdate }: ShiftHistoryProps) => {
  const { t, language, isRTL } = useLanguage();
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState({
    checkInDate: '',
    checkInTime: '',
    checkOutDate: '',
    checkOutTime: '',
    note: '',
    dayType: 'office' as 'office' | 'home' | 'sickDay' | 'other',
  });

  // Language-aware formatting functions
  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDayName = (date: Date): string => {
    const dayIndex = date.getDay();
    return t.days_full[dayIndex];
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    
    // Try to detect day type from existing note
    let detectedDayType: 'office' | 'home' | 'sickDay' | 'other' = 'office';
    if (shift.note) {
      if (shift.note.includes(t.workFromHome) || shift.note.toLowerCase().includes('home')) {
        detectedDayType = 'home';
      } else if (shift.note.includes(t.workSickDay) || shift.note.toLowerCase().includes('sick')) {
        detectedDayType = 'sickDay';
      } else if (shift.note.includes(t.workOther) || shift.note.toLowerCase().includes('other')) {
        detectedDayType = 'other';
      }
    }
    
    const checkInDate = shift.checkIn ? new Date(shift.checkIn) : new Date();
    const checkOutDate = shift.checkOut ? new Date(shift.checkOut) : new Date();
    
    setEditForm({
      checkInDate: checkInDate.toISOString().split('T')[0],
      checkInTime: checkInDate.toTimeString().slice(0, 5),
      checkOutDate: checkOutDate.toISOString().split('T')[0],
      checkOutTime: checkOutDate.toTimeString().slice(0, 5),
      note: shift.note,
      dayType: detectedDayType,
    });
  };

  const handleSave = () => {
    if (!editingShift) return;

    const checkInDateTime = new Date(`${editForm.checkInDate}T${editForm.checkInTime}`);
    const checkOutDateTime = editForm.checkOutDate && editForm.checkOutTime 
      ? new Date(`${editForm.checkOutDate}T${editForm.checkOutTime}`) 
      : null;
    
    const duration = checkOutDateTime 
      ? Math.round((checkOutDateTime.getTime() - checkInDateTime.getTime()) / (1000 * 60))
      : 0;

    const dayTypeNotes: Record<string, string> = {
      office: t.workFromOffice,
      home: t.workFromHome,
      sickDay: t.workSickDay,
      other: t.workOther,
    };

    // Build note with day type
    const customNote = editForm.note
      .replace(t.workFromOffice, '')
      .replace(t.workFromHome, '')
      .replace(t.workSickDay, '')
      .replace(t.workOther, '')
      .replace(/^\s*\|\s*/, '')
      .replace(/\s*\|\s*$/, '')
      .trim();
    
    const noteText = customNote 
      ? `${dayTypeNotes[editForm.dayType]} | ${customNote}` 
      : dayTypeNotes[editForm.dayType];

    const updatedShift: Shift = {
      ...editingShift,
      checkIn: checkInDateTime.toISOString(),
      checkOut: checkOutDateTime ? checkOutDateTime.toISOString() : null,
      note: noteText,
      duration,
    };

    updateShift(updatedShift);
    setEditingShift(null);
    onUpdate();
  };

  const handleDelete = (shiftId: string) => {
    if (confirm(t.confirmDelete)) {
      deleteShift(shiftId);
      onUpdate();
    }
  };

  const sortedShifts = [...shifts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const textAlign = isRTL ? 'text-right' : 'text-left';

  return (
    <div className="bg-[var(--f22-surface)] border-t border-[var(--f22-border)] px-4 sm:px-6 md:px-8 py-6 md:py-8">
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="p-2 md:p-2.5 bg-[#39FF14]/20 rounded-lg">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg md:text-xl font-bold text-[var(--f22-text)]">{t.shiftHistory}</h2>
      </div>

      {sortedShifts.length === 0 ? (
        <div className="text-center py-8 md:py-12">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-[var(--f22-surface-light)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 md:w-8 md:h-8 text-[var(--f22-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[var(--f22-text-muted)] text-base md:text-lg">{t.noShiftsToShow}</p>
          <p className="text-[var(--f22-text-muted)] opacity-70 text-sm mt-1">{t.shiftsWillAppear}</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[var(--f22-surface-light)] border-b border-[var(--f22-border)]">
                <th className={`${textAlign} py-3 md:py-4 px-4 md:px-6 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.date}</th>
                <th className={`${textAlign} py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.employee}</th>
                <th className={`${textAlign} py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.checkInTime}</th>
                <th className={`${textAlign} py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.checkOutTime}</th>
                <th className={`${textAlign} py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.breakMinutes}</th>
                <th className={`${textAlign} py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.duration}</th>
                <th className={`${textAlign} py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-semibold text-sm`}>{t.note}</th>
                <th className={`${textAlign} py-3 md:py-4 px-4 md:px-6 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-sm`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sortedShifts.map((shift, index) => {
                const date = new Date(shift.date);
                const checkInTime = formatTime(shift.checkIn);
                const checkOutTime = shift.checkOut ? formatTime(shift.checkOut) : '-';
                const breakMins = shift.breakMinutes || 0;
                // Simplify note display: hide "Work from Office" type notes
                let displayNote = shift.note || '';
                if (displayNote === t.workFromOffice || displayNote === 'Work from Office' || displayNote === 'עבודה מהמשרד') {
                  displayNote = '';
                }

                return (
                  <tr key={shift.id} className={`border-b border-[var(--f22-border)] hover:bg-[var(--f22-surface-light)] transition-colors ${index % 2 === 0 ? 'bg-[var(--f22-surface)]' : 'bg-[var(--f22-surface-light)]/50'}`}>
                    <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                      <div className="text-[var(--f22-text)] font-medium text-sm">{formatDate(date)}</div>
                      <div className="text-[var(--f22-text-muted)] text-xs">{getDayName(date)}</div>
                    </td>
                    <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">
                      <span className="bg-[#39FF14]/20 text-[#39FF14] px-3 py-1.5 rounded text-xs md:text-sm font-medium">
                        {shift.userName}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">
                      <span className="text-[#39FF14] font-semibold bg-[#39FF14]/10 px-3 py-1.5 rounded text-sm">{checkInTime}</span>
                    </td>
                    <td className="py-3 md:py-4 px-3 md:px-4 whitespace-nowrap">
                      <span className="text-red-400 font-semibold bg-red-500/10 px-3 py-1.5 rounded text-sm">{checkOutTime}</span>
                    </td>
                    <td className="py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] whitespace-nowrap text-sm">
                      {breakMins > 0 ? (
                        <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-xs">{breakMins}m</span>
                      ) : '-'}
                    </td>
                    <td className="py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] font-medium whitespace-nowrap text-sm">{formatDuration(shift.duration)}</td>
                    <td className="py-3 md:py-4 px-3 md:px-4 text-[var(--f22-text-muted)] text-sm max-w-[150px] truncate">{displayNote || '-'}</td>
                    <td className="py-3 md:py-4 px-4 md:px-6 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="p-2 text-amber-400 hover:bg-amber-500/20 rounded transition-all"
                          title={t.edit}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-all"
                          title={t.delete}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-[var(--f22-surface)] rounded-lg p-6 md:p-8 lg:p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-[var(--f22-border)]">
            <h3 className="text-xl md:text-2xl font-bold text-[var(--f22-text)] mb-6 md:mb-8">{t.editShift}</h3>
            
            <div className="space-y-4 md:space-y-6">
              {/* Check In Section */}
              <div className="bg-[var(--f22-surface-light)] rounded-lg p-4 md:p-5 border border-[var(--f22-border)]">
                <label className="block text-[var(--f22-text)] mb-3 md:mb-4 font-bold text-base md:text-lg">{t.checkInTime}</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-medium text-sm">Date</label>
                    <input
                      type="date"
                      value={editForm.checkInDate}
                      onChange={(e) => setEditForm({ ...editForm, checkInDate: e.target.value })}
                      className="w-full border-2 border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-lg px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] md:min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-medium text-sm">Time</label>
                    <input
                      type="time"
                      value={editForm.checkInTime}
                      onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                      className="w-full border-2 border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-lg px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] md:min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition-all"
                    />
                  </div>
                </div>
              </div>
              
              {/* Check Out Section */}
              <div className="bg-[var(--f22-surface-light)] rounded-lg p-4 md:p-5 border border-[var(--f22-border)]">
                <label className="block text-[var(--f22-text)] mb-3 md:mb-4 font-bold text-base md:text-lg">{t.checkOutTime}</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-medium text-sm">Date</label>
                    <input
                      type="date"
                      value={editForm.checkOutDate}
                      onChange={(e) => setEditForm({ ...editForm, checkOutDate: e.target.value })}
                      className="w-full border-2 border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-lg px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] md:min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-medium text-sm">Time</label>
                    <input
                      type="time"
                      value={editForm.checkOutTime}
                      onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                      className="w-full border-2 border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-lg px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] md:min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] transition-all"
                    />
                  </div>
                </div>
              </div>
              
              {/* Day Type */}
              <div>
                <label className="block text-[var(--f22-text)] mb-3 md:mb-4 font-bold text-base md:text-lg">{t.dayType}</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  {[
                    { value: 'office', label: `🏢 ${t.office}` },
                    { value: 'home', label: `🏠 ${t.home}` },
                    { value: 'sickDay', label: `🤒 ${t.sickDay}` },
                    { value: 'other', label: `📋 ${t.other}` },
                  ].map(type => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, dayType: type.value as typeof editForm.dayType })}
                      className={`px-3 md:px-4 py-2.5 md:py-3 min-h-[44px] md:min-h-[48px] rounded-lg border-2 transition-all font-medium text-sm md:text-base ${
                        editForm.dayType === type.value
                          ? 'border-[#39FF14] bg-[#39FF14]/20 text-[#39FF14]'
                          : 'border-[var(--f22-border)] hover:border-[var(--f22-text-muted)] bg-[var(--f22-surface-light)] text-[var(--f22-text-muted)]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-[var(--f22-text)] mb-3 font-bold text-base md:text-lg">{t.note} ({t.optional})</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full border-2 border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-lg px-3 md:px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] resize-none transition-all"
                  rows={3}
                  placeholder={t.addNote}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 mt-6 md:mt-8">
              <button
                onClick={() => setEditingShift(null)}
                className="flex-1 bg-[var(--f22-surface-light)] text-[var(--f22-text-muted)] py-3 md:py-4 min-h-[44px] md:min-h-[48px] rounded-lg hover:bg-[var(--f22-border)] transition-all font-semibold text-sm md:text-base border border-[var(--f22-border)]"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-[#39FF14] text-[#0D0D0D] py-3 md:py-4 min-h-[44px] md:min-h-[48px] rounded-lg hover:bg-[#00D438] transition-all font-bold text-sm md:text-base shadow-lg shadow-[#39FF14]/30"
              >
                {t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftHistory;
