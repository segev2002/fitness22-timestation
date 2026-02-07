import { useState } from 'react';
import type { Shift } from '../types';
import { updateShift, deleteShift } from '../utils/storage';
import { useLanguage } from '../context/LanguageContext';

interface ShiftHistoryProps {
  shifts: Shift[];
  onUpdate: () => void;
}

const ShiftHistory = ({ shifts, onUpdate }: ShiftHistoryProps) => {
  const { t, isRTL } = useLanguage();
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState({
    checkInDate: '',
    checkInTime: '',
    checkOutDate: '',
    checkOutTime: '',
    breakMinutes: 0,
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
    const date = new Date(dateStr);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hh = String(hours).padStart(2, '0');
    return `${hh}:${minutes}${suffix}`;
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
      breakMinutes: shift.breakMinutes || 0,
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
      breakMinutes: editForm.breakMinutes,
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

  const handleDayTypeSelect = (value: typeof editForm.dayType) => {
    setEditForm((prev) => {
      if (value === 'sickDay') {
        return {
          ...prev,
          dayType: value,
          checkInTime: '09:00',
          checkOutTime: '18:00',
        };
      }

      return {
        ...prev,
        dayType: value,
      };
    });
  };

  const sortedShifts = [...shifts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const textAlign = isRTL ? 'text-right' : 'text-left';

  return (
    <div className="bg-[var(--f22-surface)] border-t border-[var(--f22-border-subtle)] px-5 sm:px-8 md:px-12 py-10 md:py-12 pb-12 sm:pb-10">
      <div className="flex items-center gap-3 mb-8 md:mb-10">
        <div className="p-2.5 md:p-3 bg-[#39FF14]/10 rounded-xl">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-[var(--f22-text)] tracking-tight">{t.shiftHistory}</h2>
      </div>

      {sortedShifts.length === 0 ? (
        <div className="text-center py-10 md:py-14">
          <div className="w-16 h-16 md:w-18 md:h-18 bg-[var(--f22-surface-light)] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 md:w-8 md:h-8 text-[var(--f22-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-[var(--f22-text-muted)] text-base md:text-lg font-medium">{t.noShiftsToShow}</p>
          <p className="text-[var(--f22-text-muted)] opacity-60 text-sm mt-2">{t.shiftsWillAppear}</p>
        </div>
      ) : (
        <>{/* Mobile Card Layout */}
        <div className="md:hidden space-y-3.5">
          {sortedShifts.map((shift) => {
            const date = new Date(shift.date);
            const checkInTime = formatTime(shift.checkIn);
            const checkOutTime = shift.checkOut ? formatTime(shift.checkOut) : '-';
            const breakMins = shift.breakMinutes || 0;
            let displayNote = shift.note || '';
            if (displayNote === t.workFromOffice || displayNote === 'Work from Office' || displayNote === 'עבודה מהמשרד') {
              displayNote = '';
            }

            return (
              <div key={shift.id} className="bg-[var(--f22-surface-light)] rounded-2xl border border-[var(--f22-border)] p-5 space-y-3.5 hover:border-[var(--f22-green)]/15 transition-colors">
                {/* Top row: Date + Actions */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[var(--f22-text)] font-bold text-[15px]">{formatDate(date)}</div>
                    <div className="text-[var(--f22-text-muted)] text-xs font-medium">{getDayName(date)}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(shift)}
                      className="p-2.5 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                      title={t.edit}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(shift.id)}
                      className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      title={t.delete}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Employee */}
                <div className="flex items-center gap-2">
                  <span className="text-[var(--f22-text-muted)] text-xs font-medium w-16">{t.employee}</span>
                  <span className="bg-[#39FF14] text-[#0D0D0D] px-5 py-2 rounded-lg text-sm font-bold">
                    {shift.userName}
                  </span>
                </div>

                {/* Check-in / Check-out row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--f22-surface)] rounded-xl border border-[var(--f22-border)] p-3.5 text-center">
                    <div className="text-[var(--f22-text-muted)] text-xs font-medium mb-1.5">{t.checkInTime}</div>
                    <span className="text-[#0D0D0D] font-bold bg-[#39FF14] px-5 py-2 rounded-lg text-sm inline-block">{checkInTime}</span>
                  </div>
                  <div className="bg-[var(--f22-surface)] rounded-xl border border-[var(--f22-border)] p-3.5 text-center">
                    <div className="text-[var(--f22-text-muted)] text-xs font-medium mb-1.5">{t.checkOutTime}</div>
                    <span className="text-red-400 font-bold bg-red-500/10 px-5 py-2 rounded-lg text-sm inline-block">{checkOutTime}</span>
                  </div>
                </div>

                {/* Duration + Break row */}
                <div className="flex items-center justify-between border-t border-[var(--f22-border-subtle)] pt-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--f22-text-muted)] text-xs font-medium">{t.duration}:</span>
                    <span className="text-[var(--f22-text)] font-bold text-sm">{formatDuration(shift.duration)}</span>
                  </div>
                  {breakMins > 0 && (
                    <span className="bg-orange-500/10 text-orange-400 px-4 py-1.5 rounded-lg text-xs font-semibold">{t.breakMinutes}: {breakMins}m</span>
                  )}
                </div>

                {/* Note */}
                {displayNote && (
                  <div className="border-t border-[var(--f22-border-subtle)] pt-3.5">
                    <span className="text-[var(--f22-text-muted)] text-xs font-medium">{displayNote}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-[var(--f22-surface-light)] border-b border-[var(--f22-border)]">
                <th className={`${textAlign} py-4 md:py-5 px-5 md:px-6 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.date}</th>
                <th className={`${textAlign} py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.employee}</th>
                <th className={`${textAlign} py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.checkInTime}</th>
                <th className={`${textAlign} py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.checkOutTime}</th>
                <th className={`${textAlign} py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.breakMinutes}</th>
                <th className={`${textAlign} py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.duration}</th>
                <th className={`${textAlign} py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] font-semibold text-xs uppercase tracking-wider`}>{t.note}</th>
                <th className={`${textAlign} py-4 md:py-5 px-5 md:px-6 text-[var(--f22-text-muted)] font-semibold whitespace-nowrap text-xs uppercase tracking-wider`}>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {sortedShifts.map((shift, index) => {
                const date = new Date(shift.date);
                const checkInTime = formatTime(shift.checkIn);
                const checkOutTime = shift.checkOut ? formatTime(shift.checkOut) : '-';
                const breakMins = shift.breakMinutes || 0;
                let displayNote = shift.note || '';
                if (displayNote === t.workFromOffice || displayNote === 'Work from Office' || displayNote === 'עבודה מהמשרד') {
                  displayNote = '';
                }

                return (
                  <tr key={shift.id} className={`border-b border-[var(--f22-border-subtle)] hover:bg-[var(--f22-surface-light)] transition-colors ${index % 2 === 0 ? 'bg-[var(--f22-surface)]' : 'bg-[var(--f22-surface-light)]/30'}`}>
                    <td className="py-4 md:py-5 px-5 md:px-6 whitespace-nowrap">
                      <div className="text-[var(--f22-text)] font-semibold text-sm">{formatDate(date)}</div>
                      <div className="text-[var(--f22-text-muted)] text-xs mt-0.5">{getDayName(date)}</div>
                    </td>
                    <td className="py-4 md:py-5 px-4 md:px-5 whitespace-nowrap">
                      <span className="bg-[#39FF14] text-[#0D0D0D] px-5 py-2 rounded-lg text-xs md:text-sm font-bold">
                        {shift.userName}
                      </span>
                    </td>
                    <td className="py-4 md:py-5 px-4 md:px-5 whitespace-nowrap">
                      <span className="text-[#0D0D0D] font-bold bg-[#39FF14] px-5 py-2 rounded-lg text-sm">{checkInTime}</span>
                    </td>
                    <td className="py-4 md:py-5 px-4 md:px-5 whitespace-nowrap">
                      <span className="text-red-400 font-bold bg-red-500/10 px-5 py-2 rounded-lg text-sm">{checkOutTime}</span>
                    </td>
                    <td className="py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] whitespace-nowrap text-sm">
                      {breakMins > 0 ? (
                        <span className="bg-orange-500/10 text-orange-400 px-4 py-1.5 rounded-lg text-xs font-semibold">{breakMins}m</span>
                      ) : '-'}
                    </td>
                    <td className="py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-secondary)] font-semibold whitespace-nowrap text-sm">{formatDuration(shift.duration)}</td>
                    <td className="py-4 md:py-5 px-4 md:px-5 text-[var(--f22-text-muted)] text-sm max-w-[150px] truncate">{displayNote || '-'}</td>
                    <td className="py-4 md:py-5 px-5 md:px-6 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(shift)}
                          className="p-2.5 text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all"
                          title={t.edit}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(shift.id)}
                          className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
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
        </>
      )}

      {/* Edit Modal */}
      {editingShift && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-6">
          <div className="bg-[var(--f22-surface)] rounded-2xl p-7 md:p-9 lg:p-10 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-[var(--f22-border)]">
            <h3 className="text-xl md:text-2xl font-bold text-[var(--f22-text)] mb-7 md:mb-8 tracking-tight">{t.editShift}</h3>
            
            <div className="space-y-4 md:space-y-6">
              {/* Check In Section */}
              <div className="bg-[var(--f22-surface-light)] rounded-xl p-5 md:p-6 border border-[var(--f22-border)]">
                <label className="block text-[var(--f22-text)] mb-4 md:mb-5 font-bold text-base md:text-lg tracking-tight">{t.checkInTime}</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-semibold text-xs uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={editForm.checkInDate}
                      onChange={(e) => setEditForm({ ...editForm, checkInDate: e.target.value })}
                      className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-xl px-4 md:px-5 py-3 md:py-3.5 min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-semibold text-xs uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      value={editForm.checkInTime}
                      onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                      className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-xl px-4 md:px-5 py-3 md:py-3.5 min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all"
                    />
                  </div>
                </div>
              </div>
              
              {/* Check Out Section */}
              <div className="bg-[var(--f22-surface-light)] rounded-xl p-5 md:p-6 border border-[var(--f22-border)]">
                <label className="block text-[var(--f22-text)] mb-4 md:mb-5 font-bold text-base md:text-lg tracking-tight">{t.checkOutTime}</label>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-semibold text-xs uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={editForm.checkOutDate}
                      onChange={(e) => setEditForm({ ...editForm, checkOutDate: e.target.value })}
                      className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-xl px-4 md:px-5 py-3 md:py-3.5 min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--f22-text-muted)] mb-2 font-semibold text-xs uppercase tracking-wider">Time</label>
                    <input
                      type="time"
                      value={editForm.checkOutTime}
                      onChange={(e) => setEditForm({ ...editForm, checkOutTime: e.target.value })}
                      className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-xl px-4 md:px-5 py-3 md:py-3.5 min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Break Minutes */}
              <div className="bg-[var(--f22-surface-light)] rounded-xl p-5 md:p-6 border border-[var(--f22-border)]">
                <label className="block text-[var(--f22-text)] mb-4 md:mb-5 font-bold text-base md:text-lg tracking-tight">{t.breakMinutes}</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.breakMinutes}
                  onChange={(e) => setEditForm({ ...editForm, breakMinutes: parseInt(e.target.value, 10) || 0 })}
                  className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface)] text-[var(--f22-text)] rounded-xl px-4 md:px-5 py-3 md:py-3.5 min-h-[48px] text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all"
                />
              </div>
              
              {/* Day Type */}
              <div>
                <label className="block text-[var(--f22-text)] mb-4 md:mb-5 font-bold text-base md:text-lg tracking-tight">{t.dayType}</label>
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
                      onClick={() => handleDayTypeSelect(type.value as typeof editForm.dayType)}
                      className={`px-4 md:px-5 py-3 md:py-3.5 min-h-[48px] rounded-xl border transition-all font-semibold text-sm md:text-base ${
                        editForm.dayType === type.value
                          ? 'border-[#39FF14] bg-[#39FF14] text-[#0D0D0D] shadow-[var(--shadow-glow)]'
                          : 'border-[var(--f22-border)] hover:border-[var(--f22-text-muted)] bg-[var(--f22-surface-light)] text-[var(--f22-text-secondary)]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-[var(--f22-text)] mb-3 font-bold text-base md:text-lg tracking-tight">{t.note} ({t.optional})</label>
                <textarea
                  value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-xl px-4 md:px-5 py-3 md:py-3.5 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] resize-none transition-all"
                  rows={3}
                  placeholder={t.addNote}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 md:gap-4 mt-7 md:mt-9">
              <button
                onClick={() => setEditingShift(null)}
                className="flex-1 bg-[var(--f22-surface-light)] text-[var(--f22-text-secondary)] py-3.5 md:py-4 min-h-[48px] rounded-xl hover:bg-[var(--f22-surface-elevated)] transition-all font-semibold text-sm md:text-base border border-[var(--f22-border)]"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-[#39FF14] text-[#0D0D0D] py-3.5 md:py-4 min-h-[48px] rounded-xl hover:brightness-110 transition-all font-bold text-sm md:text-base shadow-[var(--shadow-glow)]"
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
