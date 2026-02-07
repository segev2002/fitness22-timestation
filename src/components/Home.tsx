import { useState, useEffect, useCallback } from 'react';
import type { Shift, ActiveShift, User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  addShift,
  getActiveShift,
  setActiveShift,
  generateId,
  getShiftsForMonth,
  syncShiftsFromSupabase,
  subscribeToShiftChanges,
} from '../utils/storage';
import ShiftHistory from './ShiftHistory';

interface HomeProps {
  user: User;
}

const Home = ({ user }: HomeProps) => {
  const { t, language } = useLanguage();
  const [activeShift, setActiveShiftState] = useState<ActiveShift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [note, setNote] = useState('');
  const [dayType, setDayType] = useState<'office' | 'home' | 'sickDay' | 'other'>('office');
  const [isInShift, setIsInShift] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState(0);

  const loadShifts = useCallback(async () => {
    await syncShiftsFromSupabase();
    const now = new Date();
    const monthShifts = getShiftsForMonth(now.getFullYear(), now.getMonth())
      .filter(s => s.userId === user.id);
    setShifts(monthShifts);
  }, [user.id]);

  // Load initial state including persisted note and dayType
  useEffect(() => {
    const active = getActiveShift();
    if (active && active.userId === user.id) {
      setActiveShiftState(active);
      setIsInShift(true);
      setActiveShift(active, user.id);
      // Load persisted note and dayType
      const savedNote = localStorage.getItem(`shift_note_${user.id}`);
      const savedDayType = localStorage.getItem(`shift_dayType_${user.id}`);
      if (savedNote) setNote(savedNote);
      if (savedDayType) setDayType(savedDayType as typeof dayType);
    }
    void loadShifts();
  }, [user.id, loadShifts]);

  // Realtime sync across devices
  useEffect(() => {
    const subscription = subscribeToShiftChanges((updatedShifts) => {
      const now = new Date();
      const monthShifts = updatedShifts
        .filter(s => s.userId === user.id)
        .filter(s => {
          const shiftDate = new Date(s.date);
          return shiftDate.getFullYear() === now.getFullYear() && shiftDate.getMonth() === now.getMonth();
        });
      setShifts(monthShifts);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [user.id]);

  // Persist note when it changes (only when in shift)
  useEffect(() => {
    if (isInShift) {
      localStorage.setItem(`shift_note_${user.id}`, note);
    }
  }, [note, isInShift, user.id]);

  // Persist dayType when it changes (only when in shift)
  useEffect(() => {
    if (isInShift) {
      localStorage.setItem(`shift_dayType_${user.id}`, dayType);
    }
  }, [dayType, isInShift, user.id]);

  const handleCheckIn = () => {
    const now = new Date();
    const newActiveShift: ActiveShift = {
      userId: user.id,
      userName: user.name,
      checkIn: now.toISOString(),
      startTime: now.getTime(),
    };

  setActiveShift(newActiveShift, user.id);
    setActiveShiftState(newActiveShift);
    setIsInShift(true);
  };

  const handleCheckOut = () => {
    if (!activeShift) return;

    const now = new Date();
    const checkInDate = new Date(activeShift.checkIn);
    const grossDuration = Math.round((now.getTime() - checkInDate.getTime()) / (1000 * 60));
    // Net duration excludes break time
    const netDuration = Math.max(0, grossDuration - breakMinutes);

    // For office days, don't include the type in the note (simplification per requirements)
    const dayTypeNotes: Record<string, string> = {
      office: '', // Empty for office - no note needed
      home: t.workFromHome,
      sickDay: t.workSickDay,
      other: t.workOther,
    };

    // Build note: only include day type if not office, and user note if provided
    let noteText = '';
    if (dayType !== 'office') {
      noteText = dayTypeNotes[dayType];
    }
    if (note) {
      noteText = noteText ? `${noteText} | ${note}` : note;
    }

    const newShift: Shift = {
      id: generateId(),
      userId: activeShift.userId,
      userName: activeShift.userName,
      date: checkInDate.toISOString().split('T')[0],
      checkIn: activeShift.checkIn,
      checkOut: now.toISOString(),
      note: noteText,
      duration: netDuration,
      breakMinutes: breakMinutes > 0 ? breakMinutes : undefined,
    };

    addShift(newShift);
  setActiveShift(null, user.id);
    setActiveShiftState(null);
    setIsInShift(false);
    setNote('');
    setDayType('office');
    setBreakMinutes(0);
    // Clear persisted note and dayType
    localStorage.removeItem(`shift_note_${user.id}`);
    localStorage.removeItem(`shift_dayType_${user.id}`);
    void loadShifts();
  };

  // Sick Day button: immediately ends shift with 9 working hours and "Sick at home" note
  // Only available when user is checked in (in shift)
  const handleSickDay = () => {
    if (!activeShift) return;
    
    const checkInDate = new Date(activeShift.checkIn);
    const dateStr = checkInDate.toISOString().split('T')[0];
    const checkIn = new Date(`${dateStr}T09:00:00`);
    const checkOut = new Date(`${dateStr}T18:00:00`);
    
    const newShift: Shift = {
      id: generateId(),
      userId: activeShift.userId,
      userName: activeShift.userName,
      date: dateStr,
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      note: t.sickDayNote,
      duration: 9 * 60, // 9 hours in minutes
    };
    
    addShift(newShift);
  setActiveShift(null, user.id);
    setActiveShiftState(null);
    setIsInShift(false);
    setNote('');
    setDayType('office');
    setBreakMinutes(0);
    // Clear persisted note and dayType
    localStorage.removeItem(`shift_note_${user.id}`);
    localStorage.removeItem(`shift_dayType_${user.id}`);
    void loadShifts();
    alert(t.sickDayAdded);
  };

  // Calculate stats for current month
  const calculateStats = () => {
    const totalMinutes = shifts.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const averageMinutes = shifts.length > 0 ? Math.round(totalMinutes / shifts.length) : 0;
    const avgHours = Math.floor(averageMinutes / 60);
    const avgMins = averageMinutes % 60;

    return {
      totalShifts: shifts.length,
      totalHours: `${totalHours}:${remainingMinutes.toString().padStart(2, '0')}`,
      averageShift: shifts.length > 0 ? `${avgHours}:${avgMins.toString().padStart(2, '0')}` : '0:00',
    };
  };

  const stats = calculateStats();
  const currentMonth = new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="w-full min-h-[calc(100vh-72px)]">
      {/* Welcome & Status Card */}
      <div className="bg-[var(--f22-surface)] border-b border-[var(--f22-border-subtle)] px-5 sm:px-8 md:px-12 py-10 md:py-14">
        {/* Welcome Message */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--f22-text)] tracking-tight">
            {t.welcomeBack}, {user.name}! 👋
          </h2>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center mb-10">
          <div className={`flex items-center gap-3 px-7 py-3.5 rounded-full font-semibold text-base tracking-wide ${isInShift ? 'bg-[#39FF14]/15 text-[#39FF14] border border-[#39FF14]/30' : 'bg-[var(--f22-surface-light)] text-[var(--f22-text-muted)] border border-[var(--f22-border)]'}`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isInShift ? 'bg-[#39FF14] animate-pulse shadow-[0_0_8px_rgba(57,255,20,.5)]' : 'bg-[var(--f22-text-muted)]'}`}></div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {isInShift ? t.inShift : t.notInShift}
            </span>
          </div>
        </div>

        {/* Day Type & Note Input (visible when in shift) */}
        {isInShift && (
          <div className="mb-10 max-w-lg mx-auto space-y-5">
            {/* Day Type */}
            <div>
              <label className="block text-[var(--f22-text-muted)] mb-3 text-sm font-semibold uppercase tracking-wider text-center">{t.dayType}</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'office', label: `🏢 ${t.office}` },
                  { value: 'home', label: `🏠 ${t.home}` },
                  { value: 'sickDay', label: `🤒 ${t.sickDay}` },
                  { value: 'other', label: `📋 ${t.other}` },
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setDayType(type.value as typeof dayType)}
                    className={`px-5 py-3.5 min-h-[52px] rounded-xl border transition-all font-semibold text-[15px] ${
                      dayType === type.value
                        ? 'border-[#39FF14] bg-[#39FF14] text-[#0D0D0D] shadow-[var(--shadow-glow)]'
                        : 'border-[var(--f22-border)] hover:border-[var(--f22-text-muted)] bg-[var(--f22-surface-light)] text-[var(--f22-text-secondary)] hover:text-[var(--f22-text)]'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Note */}
            <div>
              <label className="block text-[var(--f22-text-muted)] mb-3 text-sm font-semibold uppercase tracking-wider text-center">{t.note} ({t.optional})</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.addNote}
                className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-xl px-5 py-3.5 min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] resize-none transition-all text-[15px]"
                rows={2}
              />
            </div>

            {/* Break Duration */}
            <div>
              <label className="block text-[var(--f22-text-muted)] mb-3 text-sm font-semibold uppercase tracking-wider text-center">{t.breakDuration} ({t.optional})</label>
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={breakMinutes || ''}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 border border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-xl px-4 py-3.5 min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] text-center transition-all text-[15px] font-medium"
                />
                <span className="text-[var(--f22-text-muted)] text-sm font-medium">{t.minutes}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4 px-2">
          {!isInShift ? (
            <button
              onClick={handleCheckIn}
              className="w-full sm:w-auto bg-[#39FF14] text-[#0D0D0D] px-16 sm:px-20 md:px-24 py-5 sm:py-6 md:py-6 rounded-2xl text-xl sm:text-2xl md:text-2xl font-extrabold hover:brightness-110 transition-all transform hover:scale-[1.03] active:scale-[0.98] shadow-[var(--shadow-glow-strong)] hover:shadow-[0_0_40px_rgba(57,255,20,0.35)] flex items-center justify-center gap-4 tracking-tight"
            >
              <svg className="w-7 h-7 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {t.checkIn}
            </button>
          ) : (
            <>
              <button
                onClick={handleCheckOut}
                className="bg-red-500/90 hover:bg-red-500 text-white px-12 sm:px-16 md:px-18 py-5 md:py-6 rounded-2xl text-lg md:text-xl font-bold transition-all transform hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-red-500/20 flex items-center gap-3 md:gap-4 tracking-tight"
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t.checkOut}
              </button>
              
              {/* Sick Day Button - only visible when checked in */}
              <button
                onClick={handleSickDay}
                className="bg-orange-500/80 hover:bg-orange-500 text-white px-8 sm:px-10 py-4 md:py-5 rounded-2xl text-base md:text-lg font-bold transition-all transform hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-orange-500/15 flex items-center gap-2.5 md:gap-3 tracking-tight"
                title={t.sickDayNote}
              >
                🤒 {t.sickDayButton}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="bg-[var(--f22-surface)] border-b border-[var(--f22-border-subtle)] px-5 sm:px-8 md:px-12 py-10 md:py-12">
        <h3 className="text-xl md:text-2xl font-bold text-[var(--f22-text)] mb-8 md:mb-10 flex items-center gap-3 tracking-tight">
          <div className="p-2 bg-[#39FF14]/10 rounded-lg">
            <svg className="w-5 h-5 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          {t.currentMonthActivity} - {currentMonth}
        </h3>

        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {/* Total Shifts */}
          <div className="bg-[var(--f22-surface-light)] rounded-2xl p-4 sm:p-5 md:p-7 text-center border border-[var(--f22-border)] hover:border-[var(--f22-green)]/20 transition-colors">
            <div className="bg-[#39FF14] w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5 shadow-[var(--shadow-glow)]">
              <svg className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#0D0D0D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--f22-text)] tracking-tight">{stats.totalShifts}</p>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--f22-text-muted)] mt-1.5 sm:mt-2 font-medium">{t.totalShifts}</p>
          </div>

          {/* Total Hours */}
          <div className="bg-[var(--f22-surface-light)] rounded-2xl p-4 sm:p-5 md:p-7 text-center border border-[var(--f22-border)] hover:border-[var(--f22-green)]/20 transition-colors">
            <div className="bg-[#39FF14] w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5 shadow-[var(--shadow-glow)]">
              <svg className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#0D0D0D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--f22-text)] tracking-tight">{stats.totalHours}</p>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--f22-text-muted)] mt-1.5 sm:mt-2 font-medium">{t.totalHours}</p>
          </div>

          {/* Average Shift */}
          <div className="bg-[var(--f22-surface-light)] rounded-2xl p-4 sm:p-5 md:p-7 text-center border border-[var(--f22-border)] hover:border-[var(--f22-green)]/20 transition-colors">
            <div className="bg-[#39FF14] w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 md:mb-5 shadow-[var(--shadow-glow)]">
              <svg className="w-5 h-5 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#0D0D0D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[var(--f22-text)] tracking-tight">{stats.averageShift}</p>
            <p className="text-[11px] sm:text-xs md:text-sm text-[var(--f22-text-muted)] mt-1.5 sm:mt-2 font-medium">{t.averageShift}</p>
          </div>
        </div>
      </div>

      {/* Recent Shifts — extra top spacing */}
      <div className="mt-2">
        <ShiftHistory shifts={shifts} onUpdate={loadShifts} />
      </div>
    </div>
  );
};

export default Home;
