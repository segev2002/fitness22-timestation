import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { getShifts, addShift, getActiveShift, setActiveShift as saveActiveShift } from '../utils/storage';
import { supabaseShifts, supabaseActiveShift, isSupabaseConfigured } from '../utils/supabase';
import ClockTimer from './ClockTimer';
import ShiftHistory from './ShiftHistory';
import type { User, Shift, ActiveShift } from '../types';

interface HomeProps { user: User; }

const Home = ({ user }: HomeProps) => {
  const { t } = useLanguage();
  
  /**
   * ACTIVE SHIFT RESTORATION
   * On mount, immediately restore from localStorage for instant display,
   * then validate against Supabase in the background.
   * This prevents the timer from resetting when switching views or re-logging in.
   */
  const [activeShift, setActiveShiftState] = useState<ActiveShift | null>(() => {
    // Synchronously restore active shift from localStorage on mount
    const stored = getActiveShift();
    if (stored && stored.userId === user.id) return stored;
    return null;
  });
  
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [note, setNote] = useState('');
  const [dayType, setDayType] = useState('office');
  const [breakMinutes, setBreakMinutes] = useState(0);

  const isInShift = !!activeShift;

  /**
   * Wrapper around setActiveShift that also persists to localStorage immediately.
   * This ensures the active shift survives component unmounts, view switches, and logouts.
   */
  const updateActiveShift = (shift: ActiveShift | null) => {
    setActiveShiftState(shift);
    // Persist to localStorage synchronously so it's available instantly on next mount
    saveActiveShift(shift, user.id);
  };

  const loadShifts = useCallback(async () => {
    const now = new Date();
    if (isSupabaseConfigured()) {
      const dbShifts = await supabaseShifts.getForUser(user.id, now.getFullYear(), now.getMonth());
      setShifts(dbShifts);
    } else {
      const all = getShifts();
      setShifts(all.filter(s => {
        const d = new Date(s.date);
        return s.userId === user.id && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }));
    }
  }, [user.id]);

  useEffect(() => {
    /**
     * BACKGROUND SYNC: Validate active shift against Supabase.
     * The initial state was already set synchronously from localStorage,
     * this only *updates* if the server has a definitive active shift.
     *
     * IMPORTANT: We never clear the local active shift from this sync.
     * Only an explicit user check-out should clear it.  If the server
     * returns null it could be a transient RLS / network issue; wiping
     * the local state here would reset the running timer.
     */
    const loadActive = async () => {
      if (isSupabaseConfigured()) {
        try {
          const active = await supabaseActiveShift.get(user.id);
          if (active) {
            // Server confirms an active shift — update local to stay in sync
            setActiveShiftState(active);
            saveActiveShift(active, user.id);
          }
          // If active is null we intentionally do NOT clear local state.
          // The shift will be cleared only via handleCheckOut.
        } catch (err) {
          console.debug('Background active-shift sync failed (non-critical):', err);
        }
      }
    };
    loadActive();
    loadShifts();
  }, [user.id, loadShifts]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabaseShifts.subscribeToChanges(() => loadShifts());
    return () => { channel?.unsubscribe(); };
  }, [loadShifts]);

  const handleCheckIn = async () => {
    try {
      const now = new Date();
      const active: ActiveShift = { userId: user.id, userName: user.name, checkIn: now.toISOString(), startTime: now.getTime() };
      updateActiveShift(active);
      if (isSupabaseConfigured()) { await supabaseActiveShift.set(active, user.id); }
    } catch (err) {
      console.error('handleCheckIn error:', err);
    }
  };

  const handleCheckOut = async () => {
    if (!activeShift) return;
    try {
      const now = new Date();
      const checkInDate = new Date(activeShift.checkIn);
      const totalMinutes = Math.floor((now.getTime() - checkInDate.getTime()) / 60000);
      const netMinutes = Math.max(totalMinutes - breakMinutes, 0);
      const dateStr = checkInDate.toISOString().split('T')[0];
      const noteWithType = dayType !== 'office' ? `[${dayType}] ${note}`.trim() : note;

      const shift: Shift = {
        id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id, userName: user.name, date: dateStr,
        checkIn: activeShift.checkIn, checkOut: now.toISOString(),
        note: noteWithType, duration: netMinutes, breakMinutes: breakMinutes || undefined,
      };

      addShift(shift);
      updateActiveShift(null);
      if (isSupabaseConfigured()) { await supabaseActiveShift.set(null, user.id); }
      setNote(''); setDayType('office'); setBreakMinutes(0);
      loadShifts();
    } catch (err) {
      console.error('handleCheckOut error:', err);
    }
  };

  const handleSickDay = async () => {
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const shift: Shift = {
        id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id, userName: user.name, date: dateStr,
        checkIn: new Date(today.setHours(9, 0, 0)).toISOString(),
        checkOut: new Date(today.setHours(17, 0, 0)).toISOString(),
        note: `[sickday] ${t.sickDayNote}`, duration: 480,
      };
      addShift(shift);
      loadShifts();
    } catch (err) {
      console.error('handleSickDay error:', err);
    }
  };

  const calculateStats = () => {
    const totalShifts = shifts.length;
    const totalMinutes = shifts.reduce((s, sh) => s + sh.duration, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const avgMinutes = totalShifts > 0 ? Math.round(totalMinutes / totalShifts) : 0;
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMins = avgMinutes % 60;
    return { totalShifts, totalHours, avgShift: `${avgHours}h ${avgMins}m` };
  };
  const stats = calculateStats();

  const dayTypes = [
    { key: 'office', label: t.office },
    { key: 'home', label: t.home },
    { key: 'sickday', label: t.sickDay },
    { key: 'other', label: t.other },
  ];

  const iconStyle = { width: 20, height: 20 };

  return (
    <div className="home">
      {/* Welcome + Clock + Actions */}
      <div className="welcome-section">
        <div className="welcome-title">
          <h2>{t.welcomeBack}, {user.name} 👋</h2>
        </div>

        {/* Status Badge */}
        <div className="status-center">
          <div className={`status-badge ${isInShift ? 'active' : 'inactive'}`}>
            <div className={`status-dot ${isInShift ? 'active' : 'inactive'}`} />
            <span>{isInShift ? t.inShift : t.notInShift}</span>
          </div>
        </div>

        {/* Clock Timer */}
        <ClockTimer isRunning={isInShift} startTime={activeShift?.startTime ?? null} />

        {/* Shift Inputs */}
        <div className="shift-inputs">
          {/* Day Type */}
          <div>
            <span className="label-center">{t.dayType}</span>
            <div className="daytype-grid">
              {dayTypes.map(dt => (
                <button key={dt.key} onClick={() => setDayType(dt.key)} className={`daytype-btn ${dayType === dt.key ? 'active' : ''}`}>{dt.label}</button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <span className="label-center">{t.note} ({t.optional})</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t.addNote} className="form-input resize-none" rows={2} />
          </div>

          {/* Break */}
          {isInShift && (
            <div className="break-row">
              <input type="number" min={0} max={480} value={breakMinutes || ''} onChange={e => setBreakMinutes(Number(e.target.value))} className="break-input" placeholder="0" />
              <span className="break-label">{t.breakMinutes}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {!isInShift ? (
            <>
              <button onClick={handleCheckIn} className="btn-checkin">
                <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                {t.checkIn}
              </button>
              <button onClick={handleSickDay} className="btn-sickday">
                <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {t.sickDayButton}
              </button>
            </>
          ) : (
            <button onClick={handleCheckOut} className="btn-checkout">
              <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              {t.checkOut}
            </button>
          )}
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="stats-section">
        <h3 className="section-heading">
          <span className="section-icon">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </span>
          {t.currentMonthActivity}
        </h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-box">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <div className="stat-value">{stats.totalShifts}</div>
            <div className="stat-label">{t.totalShifts}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div className="stat-value">{stats.totalHours}</div>
            <div className="stat-label">{t.totalHours}</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-box">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div className="stat-value">{stats.avgShift}</div>
            <div className="stat-label">{t.averageShift}</div>
          </div>
        </div>
      </div>

      {/* Shift History */}
      <ShiftHistory shifts={shifts} onUpdate={loadShifts} />
    </div>
  );
};

export default Home;
