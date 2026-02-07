import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { addShift, deleteShift } from '../utils/storage';
import { supabaseShifts, isSupabaseConfigured } from '../utils/supabase';
import type { User, Shift } from '../types';

interface EditActivityProps {
  user: User;
  onShiftsUpdated?: () => void;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  hasShift: boolean;
}

const EditActivity = ({ user, onShiftsUpdated }: EditActivityProps) => {
  const { t } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [existingShifts, setExistingShifts] = useState<Shift[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [formData, setFormData] = useState({
    checkIn: '09:00', checkOut: '17:00', dayType: 'office', note: '', breakMinutes: 0,
  });

  const loadShifts = useCallback(async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    if (isSupabaseConfigured()) {
      const shifts = await supabaseShifts.getForUser(user.id, year, month);
      setExistingShifts(shifts);
    } else {
      const { getShifts } = await import('../utils/storage');
      const all = getShifts();
      setExistingShifts(all.filter(s => {
        const d = new Date(s.date);
        return s.userId === user.id && d.getFullYear() === year && d.getMonth() === month;
      }));
    }
  }, [currentDate, user.id]);

  useEffect(() => { loadShifts(); }, [loadShifts]);

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const shiftDates = new Set(existingShifts.map(s => s.date));

    const days: CalendarDay[] = [];
    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonth.getDate() - i);
      days.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false, isToday: false, isFuture: d > today, hasShift: false });
    }
    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: d, dateStr, isCurrentMonth: true, isToday: dateStr === todayStr, isFuture: dateStr > todayStr, hasShift: shiftDates.has(dateStr) });
    }
    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, dateStr: d.toISOString().split('T')[0], isCurrentMonth: false, isToday: false, isFuture: true, hasShift: false });
    }
    return days;
  };

  const handleDayMouseDown = (dateStr: string, isCurrentMonth: boolean, isFuture: boolean) => {
    if (!isCurrentMonth || isFuture) return;
    setIsDragging(true);
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr); else next.add(dateStr);
      return next;
    });
  };

  const handleDayMouseEnter = (dateStr: string, isCurrentMonth: boolean, isFuture: boolean) => {
    if (!isDragging || !isCurrentMonth || isFuture) return;
    setSelectedDays(prev => new Set([...prev, dateStr]));
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const handleBulkFill = () => {
    if (selectedDays.size === 0) { alert(t.selectAtLeastOne); return; }
    setShowBulkModal(true);
  };

  const handleApplyBulk = async () => {
    const [h1, m1] = formData.checkIn.split(':').map(Number);
    const [h2, m2] = formData.checkOut.split(':').map(Number);
    const noteWithType = formData.dayType !== 'office' ? `[${formData.dayType}] ${formData.note}`.trim() : formData.note;

    for (const dateStr of selectedDays) {
      const d = new Date(dateStr + 'T00:00:00');
      const checkIn = new Date(d); checkIn.setHours(h1, m1, 0);
      const checkOut = new Date(d); checkOut.setHours(h2, m2, 0);
      const totalMin = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
      const netMin = Math.max(totalMin - formData.breakMinutes, 0);

      const shift: Shift = {
        id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id, userName: user.name, date: dateStr,
        checkIn: checkIn.toISOString(), checkOut: checkOut.toISOString(),
        note: noteWithType, duration: netMin, breakMinutes: formData.breakMinutes || undefined,
      };
      addShift(shift);
    }
    setShowBulkModal(false);
    setSelectedDays(new Set());
    await loadShifts();
    onShiftsUpdated?.();
  };

  const handleDeleteSelected = async () => {
    if (selectedDays.size === 0) return;
    if (!confirm(t.confirmDelete)) return;
    for (const dateStr of selectedDays) {
      const existing = existingShifts.find(s => s.date === dateStr);
      if (existing) deleteShift(existing.id);
    }
    setSelectedDays(new Set());
    await loadShifts();
    onShiftsUpdated?.();
  };

  const handleDayTypeSelect = (key: string) => setFormData(f => ({ ...f, dayType: key }));

  const calendarDays = generateCalendarDays();
  const monthYear = `${t.months[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  const dayTypes = [
    { key: 'office', label: t.office },
    { key: 'home', label: t.home },
    { key: 'sickday', label: t.sickDay },
    { key: 'other', label: t.other },
  ];

  const iconStyle = { width: 20, height: 20 };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)' }}>
      <div className="page-section">
        <h3 className="section-heading">
          <span className="section-icon">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </span>
          {t.bulkCalendar}
        </h3>

        {/* Month Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={handlePrevMonth} className="btn-sm ghost">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--f22-text)' }}>{monthYear}</span>
          <button onClick={handleNextMonth} className="btn-sm ghost">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 24, userSelect: 'none' }}>
          {t.days_short.map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: 12, color: 'var(--f22-text-muted)', padding: '8px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
          ))}
          {calendarDays.map(day => {
            const isSelected = selectedDays.has(day.dateStr);
            const isDisabled = !day.isCurrentMonth || day.isFuture;
            return (
              <div
                key={day.dateStr}
                onMouseDown={() => handleDayMouseDown(day.dateStr, day.isCurrentMonth, day.isFuture)}
                onMouseEnter={() => handleDayMouseEnter(day.dateStr, day.isCurrentMonth, day.isFuture)}
                style={{
                  position: 'relative',
                  padding: '10px 4px',
                  borderRadius: 12,
                  textAlign: 'center',
                  fontSize: 14,
                  fontWeight: day.isToday ? 700 : 500,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  opacity: isDisabled ? 0.3 : 1,
                  color: isSelected ? '#0D0D0D' : day.isToday ? '#39FF14' : 'var(--f22-text)',
                  background: isSelected ? '#39FF14' : day.hasShift ? 'rgba(57,255,20,.1)' : 'transparent',
                  border: day.isToday && !isSelected ? '2px solid #39FF14' : '2px solid transparent',
                  boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                  transition: 'all .15s ease',
                }}
              >
                {day.date.getDate()}
                {day.hasShift && !isSelected && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#39FF14', margin: '4px auto 0' }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', fontSize: 12, color: 'var(--f22-text-muted)', marginBottom: 24 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#39FF14' }} /> {t.selected}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(57,255,20,.1)', border: '1px solid rgba(57,255,20,.3)' }} /> {t.hasShift}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, border: '2px solid #39FF14' }} /> {t.today}
          </span>
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {selectedDays.size > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--f22-text-muted)', fontSize: 14, fontWeight: 500 }}>
              {selectedDays.size} {t.daysSelected}
            </span>
          )}
          <button onClick={handleBulkFill} disabled={selectedDays.size === 0} className="btn-sm green">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t.bulkFill}
          </button>
          <button onClick={handleDeleteSelected} disabled={selectedDays.size === 0} className="btn-sm danger">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {t.delete}
          </button>
          <button onClick={() => setSelectedDays(new Set())} disabled={selectedDays.size === 0} className="btn-sm ghost">{t.clear}</button>
        </div>
      </div>

      {/* Bulk Fill Modal */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-bg-blur" style={{ position: 'absolute', inset: 0 }} onClick={() => setShowBulkModal(false)} />
          <div className="modal-card" style={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
            <h3>{t.bulkFillTitle}</h3>
            <p style={{ color: 'var(--f22-text-muted)', marginBottom: 20, fontSize: 14 }}>
              {t.detailsWillApply} <strong style={{ color: '#39FF14' }}>{selectedDays.size}</strong> {t.selectedDays}
            </p>
            <div className="modal-form">
              <div>
                <label className="form-label">{t.dayType}</label>
                <div className="daytype-grid">
                  {dayTypes.map(dt => (
                    <button key={dt.key} type="button" onClick={() => handleDayTypeSelect(dt.key)} className={`daytype-btn ${formData.dayType === dt.key ? 'active' : ''}`}>{dt.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{t.checkInTimeLabel}</label>
                  <input type="time" value={formData.checkIn} onChange={e => setFormData(f => ({ ...f, checkIn: e.target.value }))} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.checkOutTimeLabel}</label>
                  <input type="time" value={formData.checkOut} onChange={e => setFormData(f => ({ ...f, checkOut: e.target.value }))} className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t.breakMinutes}</label>
                <input type="number" min={0} value={formData.breakMinutes || ''} onChange={e => setFormData(f => ({ ...f, breakMinutes: Number(e.target.value) }))} className="form-input" placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.note} ({t.optional})</label>
                <textarea value={formData.note} onChange={e => setFormData(f => ({ ...f, note: e.target.value }))} className="form-input resize-none" rows={2} placeholder={t.addNote} />
              </div>
              <div className="modal-actions">
                <button onClick={handleApplyBulk} className="btn-green">{t.applyTo} {selectedDays.size} {t.days}</button>
                <button onClick={() => setShowBulkModal(false)} className="btn-secondary">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditActivity;
