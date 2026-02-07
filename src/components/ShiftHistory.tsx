import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { updateShift, deleteShift } from '../utils/storage';
import type { Shift } from '../types';

interface ShiftHistoryProps {
  shifts: Shift[];
  onUpdate: () => void;
  showEmployee?: boolean;
}

const ShiftHistory = ({ shifts, onUpdate, showEmployee }: ShiftHistoryProps) => {
  const { t } = useLanguage();
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', note: '', dayType: 'office', breakMinutes: 0 });

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return t.days_full[d.getDay()];
  };

  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const getDayTypeFromNote = (note: string): string => {
    if (note.startsWith('[home]')) return 'home';
    if (note.startsWith('[sickday]')) return 'sickday';
    if (note.startsWith('[other]')) return 'other';
    return 'office';
  };

  const cleanNote = (note: string): string => note.replace(/^\[(home|sickday|other|office)\]\s*/, '');

  const handleEdit = (shift: Shift) => {
    const dt = getDayTypeFromNote(shift.note);
    setEditForm({
      checkIn: formatTime(shift.checkIn),
      checkOut: shift.checkOut ? formatTime(shift.checkOut) : '',
      note: cleanNote(shift.note),
      dayType: dt,
      breakMinutes: shift.breakMinutes || 0,
    });
    setEditingShift(shift);
  };

  const handleSave = () => {
    if (!editingShift) return;
    const d = new Date(editingShift.date + 'T00:00:00');
    const [h1, m1] = editForm.checkIn.split(':').map(Number);
    const [h2, m2] = editForm.checkOut ? editForm.checkOut.split(':').map(Number) : [0, 0];
    const checkInDate = new Date(d); checkInDate.setHours(h1, m1, 0);
    const checkOutDate = editForm.checkOut ? new Date(d) : null;
    if (checkOutDate) checkOutDate.setHours(h2, m2, 0);
    const totalMin = checkOutDate ? Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / 60000) : 0;
    const netMin = Math.max(totalMin - editForm.breakMinutes, 0);
    const noteWithType = editForm.dayType !== 'office' ? `[${editForm.dayType}] ${editForm.note}`.trim() : editForm.note;

    const updated: Shift = {
      ...editingShift,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate?.toISOString() ?? null,
      note: noteWithType,
      duration: netMin,
      breakMinutes: editForm.breakMinutes || undefined,
    };
    updateShift(updated);
    setEditingShift(null);
    onUpdate();
  };

  const handleDelete = (shiftId: string) => {
    if (!confirm(t.confirmDelete)) return;
    deleteShift(shiftId);
    onUpdate();
  };

  const handleDayTypeSelect = (key: string) => setEditForm(f => ({ ...f, dayType: key }));

  const dayTypes = [
    { key: 'office', label: t.office },
    { key: 'home', label: t.home },
    { key: 'sickday', label: t.sickDay },
    { key: 'other', label: t.other },
  ];

  const getDayTypeBadge = (note: string) => {
    const dt = getDayTypeFromNote(note);
    if (dt === 'sickday') return <span className="badge-orange">{t.sickDay}</span>;
    if (dt === 'home') return <span className="badge-orange" style={{ background: 'rgba(59,130,246,.1)', color: '#60a5fa' }}>{t.home}</span>;
    return null;
  };

  const iconStyle = { width: 20, height: 20 };

  if (shifts.length === 0) {
    return (
      <div className="history-section">
        <h3 className="section-heading">
          <span className="section-icon">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </span>
          {t.shiftHistory}
        </h3>
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg style={{ width: 28, height: 28 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p>{t.noShiftsToShow}</p>
          <p className="sub">{t.shiftsWillAppear}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-section">
      <h3 className="section-heading">
        <span className="section-icon">
          <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </span>
        {t.shiftHistory}
      </h3>

      {/* Mobile Cards */}
      <div className="shift-cards">
        {shifts.map(shift => (
          <div key={shift.id} className="shift-card">
            <div className="shift-card-row">
              <div>
                <div className="shift-card-date">{formatDate(shift.date)}</div>
                <div className="shift-card-day">{getDayName(shift.date)}</div>
              </div>
              <div className="shift-card-actions">
                {getDayTypeBadge(shift.note)}
                <button onClick={() => handleEdit(shift)} className="shift-action-btn edit" title={t.edit}>
                  <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDelete(shift.id)} className="shift-action-btn delete" title={t.delete}>
                  <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            {showEmployee && (
              <div className="shift-card-employee">
                <span className="elabel">{t.employee}:</span>
                <span style={{ fontWeight: 600, color: 'var(--f22-text)' }}>{shift.userName}</span>
              </div>
            )}
            <div className="shift-times">
              <div className="shift-time-box">
                <div className="stlabel">{t.checkInTime}</div>
                <span className="badge-green">{formatTime(shift.checkIn)}</span>
              </div>
              <div className="shift-time-box">
                <div className="stlabel">{t.checkOutTime}</div>
                <span className={shift.checkOut ? 'badge-red' : 'badge-orange'}>{formatTime(shift.checkOut)}</span>
              </div>
            </div>
            <div className="shift-card-footer">
              <div className="shift-duration">
                <span className="dlabel">{t.duration}:</span>
                <span className="dvalue">{formatDuration(shift.duration)}</span>
              </div>
              {shift.breakMinutes ? <span className="badge-orange">{t.breakMinutes}: {shift.breakMinutes}</span> : null}
            </div>
            {cleanNote(shift.note) && <div className="shift-card-note">📝 {cleanNote(shift.note)}</div>}
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="shift-table-wrap">
        <table className="shift-table">
          <thead>
            <tr>
              <th>{t.date}</th>
              {showEmployee && <th>{t.employee}</th>}
              <th>{t.checkInTime}</th>
              <th>{t.checkOutTime}</th>
              <th>{t.duration}</th>
              <th>{t.breakMinutes}</th>
              <th>{t.note}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift, i) => (
              <tr key={shift.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                <td>
                  <div className="date-main">{formatDate(shift.date)}</div>
                  <div className="date-sub">{getDayName(shift.date)}</div>
                </td>
                {showEmployee && <td style={{ fontWeight: 600 }}>{shift.userName}</td>}
                <td><span className="badge-green">{formatTime(shift.checkIn)}</span></td>
                <td><span className={shift.checkOut ? 'badge-red' : 'badge-orange'}>{formatTime(shift.checkOut)}</span></td>
                <td className="col-duration">{formatDuration(shift.duration)}</td>
                <td>{shift.breakMinutes || '-'}</td>
                <td className="col-note">{cleanNote(shift.note) || '-'}</td>
                <td>
                  <div className="actions-cell">
                    <button onClick={() => handleEdit(shift)} className="shift-action-btn edit" title={t.edit}>
                      <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(shift.id)} className="shift-action-btn delete" title={t.delete}>
                      <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingShift && (
        <div className="modal-overlay">
          <div className="modal-bg-blur" style={{ position: 'absolute', inset: 0 }} onClick={() => setEditingShift(null)} />
          <div className="modal-card" style={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
            <h3>{t.editShift} — {formatDate(editingShift.date)}</h3>
            <div className="modal-form">
              {/* Day Type */}
              <div>
                <label className="form-label">{t.dayType}</label>
                <div className="daytype-grid">
                  {dayTypes.map(dt => (
                    <button key={dt.key} type="button" onClick={() => handleDayTypeSelect(dt.key)} className={`daytype-btn ${editForm.dayType === dt.key ? 'active' : ''}`}>{dt.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">{t.checkInTimeLabel}</label>
                  <input type="time" value={editForm.checkIn} onChange={e => setEditForm(f => ({ ...f, checkIn: e.target.value }))} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">{t.checkOutTimeLabel}</label>
                  <input type="time" value={editForm.checkOut} onChange={e => setEditForm(f => ({ ...f, checkOut: e.target.value }))} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t.breakMinutes}</label>
                <input type="number" min={0} max={480} value={editForm.breakMinutes || ''} onChange={e => setEditForm(f => ({ ...f, breakMinutes: Number(e.target.value) }))} className="form-input" placeholder="0" />
              </div>

              <div className="form-group">
                <label className="form-label">{t.note}</label>
                <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} className="form-input resize-none" rows={2} placeholder={t.addNote} />
              </div>

              <div className="modal-actions">
                <button onClick={handleSave} className="btn-green">{t.save}</button>
                <button onClick={() => setEditingShift(null)} className="btn-secondary">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftHistory;
