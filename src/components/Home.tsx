import { useState, useEffect, useCallback } from 'react';
import type { Shift, ActiveShift, User } from '../types';
import { useLanguage } from '../context/LanguageContext';
import {
  addShift,
  getActiveShift,
  setActiveShift,
  generateId,
  getShiftsForMonth,
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

  // Load initial state including persisted note and dayType
  useEffect(() => {
    const active = getActiveShift();
    if (active && active.userId === user.id) {
      setActiveShiftState(active);
      setIsInShift(true);
      // Load persisted note and dayType
      const savedNote = localStorage.getItem(`shift_note_${user.id}`);
      const savedDayType = localStorage.getItem(`shift_dayType_${user.id}`);
      if (savedNote) setNote(savedNote);
      if (savedDayType) setDayType(savedDayType as typeof dayType);
    }
    loadShifts();
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

  const loadShifts = useCallback(() => {
    const now = new Date();
    const monthShifts = getShiftsForMonth(now.getFullYear(), now.getMonth())
      .filter(s => s.userId === user.id);
    setShifts(monthShifts);
  }, [user.id]);

  const handleCheckIn = () => {
    const now = new Date();
    const newActiveShift: ActiveShift = {
      userId: user.id,
      userName: user.name,
      checkIn: now.toISOString(),
      startTime: now.getTime(),
    };

    setActiveShift(newActiveShift);
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
    setActiveShift(null);
    setActiveShiftState(null);
    setIsInShift(false);
    setNote('');
    setDayType('office');
    setBreakMinutes(0);
    // Clear persisted note and dayType
    localStorage.removeItem(`shift_note_${user.id}`);
    localStorage.removeItem(`shift_dayType_${user.id}`);
    loadShifts();
  };

  // Sick Day button: immediately ends shift with 9 working hours and "Sick at home" note
  // Only available when user is checked in (in shift)
  const handleSickDay = () => {
    if (!activeShift) return;
    
    const checkInDate = new Date(activeShift.checkIn);
    const dateStr = checkInDate.toISOString().split('T')[0];
    
    // Create check-out time 9 hours after check-in
    const checkOut = new Date(checkInDate.getTime() + 9 * 60 * 60 * 1000);
    
    const newShift: Shift = {
      id: generateId(),
      userId: activeShift.userId,
      userName: activeShift.userName,
      date: dateStr,
      checkIn: activeShift.checkIn,
      checkOut: checkOut.toISOString(),
      note: t.sickDayNote,
      duration: 9 * 60, // 9 hours in minutes
    };
    
    addShift(newShift);
    setActiveShift(null);
    setActiveShiftState(null);
    setIsInShift(false);
    setNote('');
    setDayType('office');
    setBreakMinutes(0);
    // Clear persisted note and dayType
    localStorage.removeItem(`shift_note_${user.id}`);
    localStorage.removeItem(`shift_dayType_${user.id}`);
    loadShifts();
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
      <div className="bg-[var(--f22-surface)] border-b border-[var(--f22-border)] px-4 sm:px-6 md:px-8 py-6 md:py-8">
        {/* Welcome Message */}
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-[var(--f22-text)]">
            {t.welcomeBack}, {user.name}! 👋
          </h2>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center gap-3 px-6 py-3 rounded ${isInShift ? 'bg-[#39FF14]/20 text-[#39FF14]' : 'bg-[var(--f22-surface-light)] text-[var(--f22-text-muted)]'}`}>
            <div className={`w-3 h-3 rounded-full ${isInShift ? 'bg-[#39FF14] animate-pulse' : 'bg-[var(--f22-text-muted)]'}`}></div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-lg">
              {isInShift ? t.inShift : t.notInShift}
            </span>
          </div>
        </div>

        {/* Day Type & Note Input (visible when in shift) */}
        {isInShift && (
          <div className="mb-10 max-w-lg mx-auto space-y-6">
            {/* Day Type */}
            <div>
              <label className="block text-[var(--f22-text-muted)] mb-3 font-medium text-center">{t.dayType}</label>
              <div className="grid grid-cols-2 gap-4">
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
                    className={`px-4 py-3 min-h-[48px] rounded-lg border-2 transition-all font-medium ${
                      dayType === type.value
                        ? 'border-[#39FF14] bg-[#39FF14]/20 text-[#39FF14]'
                        : 'border-[var(--f22-border)] hover:border-[var(--f22-text-muted)] bg-[var(--f22-surface-light)] text-[var(--f22-text-muted)]'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Note */}
            <div>
              <label className="block text-[var(--f22-text-muted)] mb-3 font-medium text-center">{t.note} ({t.optional})</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.addNote}
                className="w-full border-2 border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-lg px-4 py-3 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] resize-none transition-all"
                rows={2}
              />
            </div>

            {/* Break Duration */}
            <div>
              <label className="block text-[var(--f22-text-muted)] mb-3 font-medium text-center">{t.breakDuration} ({t.optional})</label>
              <div className="flex items-center justify-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={breakMinutes || ''}
                  onChange={(e) => setBreakMinutes(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 border-2 border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-lg px-4 py-3 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-[#39FF14] focus:border-[#39FF14] text-center transition-all"
                />
                <span className="text-[var(--f22-text-muted)]">{t.minutes}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
          {!isInShift ? (
            <button
              onClick={handleCheckIn}
              className="bg-[#39FF14] text-[#0D0D0D] px-10 sm:px-16 md:px-20 py-4 md:py-5 rounded-lg text-xl md:text-2xl font-bold hover:bg-[#00D438] transition-all transform hover:scale-105 shadow-lg hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] flex items-center gap-3 md:gap-4"
            >
              <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              {t.checkIn}
            </button>
          ) : (
            <>
              <button
                onClick={handleCheckOut}
                className="bg-red-500 text-white px-10 sm:px-16 md:px-20 py-4 md:py-5 rounded-lg text-xl md:text-2xl font-bold hover:bg-red-600 transition-all transform hover:scale-105 shadow-lg flex items-center gap-3 md:gap-4"
              >
                <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t.checkOut}
              </button>
              
              {/* Sick Day Button - only visible when checked in */}
              <button
                onClick={handleSickDay}
                className="bg-orange-500 text-white px-6 sm:px-8 py-3 md:py-4 rounded-lg text-lg md:text-xl font-bold hover:bg-orange-600 transition-all transform hover:scale-105 shadow-lg flex items-center gap-2 md:gap-3"
                title={t.sickDayNote}
              >
                🤒 {t.sickDayButton}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="bg-[var(--f22-surface)] border-b border-[var(--f22-border)] px-4 sm:px-6 md:px-8 py-6 md:py-8">
        <h3 className="text-lg md:text-xl font-bold text-[var(--f22-text)] mb-6 md:mb-8 flex items-center gap-3">
          <svg className="w-6 h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {t.currentMonthActivity} - {currentMonth}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          {/* Total Shifts */}
          <div className="bg-[var(--f22-surface-light)] rounded-lg p-4 md:p-6 text-center border border-[var(--f22-border)]">
            <div className="bg-[#39FF14]/20 w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--f22-text)]">{stats.totalShifts}</p>
            <p className="text-xs md:text-sm text-[var(--f22-text-muted)] mt-2">{t.totalShifts}</p>
          </div>

          {/* Total Hours */}
          <div className="bg-[var(--f22-surface-light)] rounded-lg p-4 md:p-6 text-center border border-[var(--f22-border)]">
            <div className="bg-[#39FF14]/20 w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--f22-text)]">{stats.totalHours}</p>
            <p className="text-xs md:text-sm text-[var(--f22-text-muted)] mt-2">{t.totalHours}</p>
          </div>

          {/* Average Shift */}
          <div className="bg-[var(--f22-surface-light)] rounded-lg p-4 md:p-6 text-center border border-[var(--f22-border)]">
            <div className="bg-[#39FF14]/20 w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--f22-text)]">{stats.averageShift}</p>
            <p className="text-xs md:text-sm text-[var(--f22-text-muted)] mt-2">{t.averageShift}</p>
          </div>
        </div>
      </div>

      {/* Recent Shifts */}
      <ShiftHistory shifts={shifts} onUpdate={loadShifts} />
    </div>
  );
};

export default Home;
