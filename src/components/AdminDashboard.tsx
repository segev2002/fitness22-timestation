import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { validateAdminAsync, DEPARTMENTS, isPrimaryAdmin, adminCreateUser } from '../utils/auth';
import { supabaseShifts, supabaseUsers, supabaseActiveShift, isSupabaseConfigured } from '../utils/supabase';
import { generateAdminExcel } from '../utils/excel';
import { updateShift, deleteShift } from '../utils/storage';
import AdminExpenseReports from './AdminExpenseReports';
import type { User, Shift, ActiveShift } from '../types';

interface AdminDashboardProps { user: User; }

type AdminTab = 'users' | 'shifts' | 'live' | 'expenses';

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [now, setNow] = useState<number>(0);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Add user modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDept, setNewUserDept] = useState('');

  // Edit shift modal
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editForm, setEditForm] = useState({ checkIn: '', checkOut: '', note: '', breakMinutes: 0 });

  // Expanded users in shifts view
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const loadUsers = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const all = await supabaseUsers.getAll();
      setUsers(all.filter(u => !u.isDisabled));
    }
  }, []);

  const loadShifts = useCallback(async () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    if (isSupabaseConfigured()) {
      const all = await supabaseShifts.getForMonth(year, month - 1);
      setShifts(all);
    }
  }, [selectedMonth]);

  const loadActiveShifts = useCallback(async () => {
    if (isSupabaseConfigured()) {
      const all = await supabaseActiveShift.getAll();
      setActiveShifts(all);
    }
  }, []);

  useEffect(() => {
    const verify = async () => {
      const valid = await validateAdminAsync(user);
      setIsAdminVerified(valid);
    };
    verify();
  }, [user]);

  useEffect(() => {
    if (!isAdminVerified) return;
    loadUsers();
    loadShifts();
    loadActiveShifts();
  }, [isAdminVerified, loadUsers, loadShifts, loadActiveShifts]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const channel = supabaseActiveShift.subscribeToChanges((shifts) => setActiveShifts(shifts));
    return () => { channel?.unsubscribe(); };
  }, []);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) return;
    try {
      const result = await adminCreateUser(user, newUserName, newUserEmail, newUserPassword, newUserDept || undefined);
      if (!result.success) {
        alert(result.error === 'emailExists' ? t.emailExists : (result.error || t.profileSaveFailed));
        return;
      }
      setShowAddUser(false);
      setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserDept('');
      loadUsers();
    } catch (err) {
      console.error('handleCreateUser error:', err);
      alert(t.profileSaveFailed);
    }
  };

  const handleToggleAdmin = async (u: User) => {
    if (isPrimaryAdmin(u.email)) return;
    try {
      const updated = { ...u, isAdmin: !u.isAdmin };
      await supabaseUsers.upsert(updated);
      loadUsers();
    } catch (err) {
      console.error('handleToggleAdmin error:', err);
    }
  };

  const handleUpdateDepartment = async (u: User, dept: string) => {
    try {
      const updated = { ...u, department: dept || undefined };
      await supabaseUsers.upsert(updated);
      loadUsers();
    } catch (err) {
      console.error('handleUpdateDepartment error:', err);
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (isPrimaryAdmin(u.email)) return;
    if (u.id === user.id) return;
    if (!confirm(t.confirmDeleteUser)) return;
    try {
      await supabaseUsers.deleteUserShifts(u.id);
      await supabaseUsers.delete(u.id);
      loadUsers();
    } catch (err) {
      console.error('handleDeleteUser error:', err);
      alert(t.profileSaveFailed);
    }
  };

  const handleExportExcel = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthYear = `${t.months[month - 1]} ${year}`;
    if (shifts.length === 0) { alert(t.noShiftsToExport); return; }
    generateAdminExcel(shifts, users, monthYear, language);
  };

  const openEditShift = (shift: Shift) => {
    const fmt = (iso: string | null) => {
      if (!iso) return '';
      const d = new Date(iso);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };
    setEditForm({ checkIn: fmt(shift.checkIn), checkOut: fmt(shift.checkOut), note: shift.note, breakMinutes: shift.breakMinutes || 0 });
    setEditingShift(shift);
  };

  const handleSaveShift = () => {
    if (!editingShift) return;
    const d = new Date(editingShift.date + 'T00:00:00');
    const [h1, m1] = editForm.checkIn.split(':').map(Number);
    const [h2, m2] = editForm.checkOut ? editForm.checkOut.split(':').map(Number) : [0, 0];
    const checkInDate = new Date(d); checkInDate.setHours(h1, m1, 0);
    const checkOutDate = editForm.checkOut ? new Date(d) : null;
    if (checkOutDate) checkOutDate.setHours(h2, m2, 0);
    const totalMin = checkOutDate ? Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / 60000) : 0;
    const netMin = Math.max(totalMin - editForm.breakMinutes, 0);

    const updated: Shift = {
      ...editingShift,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate?.toISOString() ?? null,
      note: editForm.note,
      duration: netMin,
      breakMinutes: editForm.breakMinutes || undefined,
    };
    updateShift(updated);
    setEditingShift(null);
    loadShifts();
  };

  const handleDeleteShift = (shiftId: string) => {
    if (!confirm(t.confirmDelete)) return;
    deleteShift(shiftId);
    loadShifts();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };

  const formatTime = (isoStr: string | null) => {
    if (!isoStr) return '--:--';
    const d = new Date(isoStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  const toggleExpandUser = (userId: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId); else next.add(userId);
      return next;
    });
  };

  // Group shifts by user
  const shiftsByUser = shifts.reduce<Record<string, Shift[]>>((acc, shift) => {
    if (!acc[shift.userId]) acc[shift.userId] = [];
    acc[shift.userId].push(shift);
    return acc;
  }, {});

  const iconStyle = { width: 20, height: 20 };

  if (!isAdminVerified) {
    return (
      <div className="page-section">
        <div className="empty-state">
          <svg style={{ width: 48, height: 48 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <p>{t.notAuthorized}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)' }}>
      {/* Tabs */}
      <div className="page-section" style={{ paddingBottom: 0 }}>
        <h3 className="section-heading">
          <span className="section-icon">
            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </span>
          {t.adminDashboard}
        </h3>
        <div className="tabs">
          {(['users', 'shifts', 'live', 'expenses'] as AdminTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`tab ${activeTab === tab ? 'active' : ''}`}>
              {tab === 'users' ? t.allEmployees : tab === 'shifts' ? t.allShifts : tab === 'live' ? t.liveCheckIns : t.expenseReports}
            </button>
          ))}
        </div>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="page-section">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
            <button onClick={() => setShowAddUser(true)} className="btn-sm green">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t.addUser}
            </button>
          </div>

          {users.length === 0 ? (
            <div className="empty-state"><p>{t.noUsersFound}</p></div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t.fullName}</th>
                    <th>{t.email}</th>
                    <th>{t.department}</th>
                    <th>{t.admin}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                            {u.profilePicture ? <img src={u.profilePicture} alt={u.name} /> : u.name.charAt(0).toUpperCase()}
                          </div>
                          {u.name}
                          {isPrimaryAdmin(u.email) && <span className="status-chip green">{t.primaryAdmin}</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--f22-text-muted)' }}>{u.email}</td>
                      <td>
                        <select value={u.department || ''} onChange={e => handleUpdateDepartment(u, e.target.value)} className="form-select" style={{ minWidth: 120 }}>
                          <option value="">{t.selectDepartment}</option>
                          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </td>
                      <td>
                        {isPrimaryAdmin(u.email) ? (
                          <span className="status-chip green">{t.admin}</span>
                        ) : (
                          <button onClick={() => handleToggleAdmin(u)} className={`btn-sm ${u.isAdmin ? 'danger' : 'green'}`}>
                            {u.isAdmin ? t.removeAdmin : t.makeAdmin}
                          </button>
                        )}
                      </td>
                      <td>
                        {!isPrimaryAdmin(u.email) && u.id !== user.id && (
                          <button onClick={() => handleDeleteUser(u)} className="btn-sm danger">
                            <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            {t.deleteUser}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="page-section">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="form-input" style={{ width: 'auto' }} />
            <button onClick={handleExportExcel} className="btn-sm green">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {t.exportExcel}
            </button>
          </div>

          {Object.keys(shiftsByUser).length === 0 ? (
            <div className="empty-state"><p>{t.noShiftsToShow}</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(shiftsByUser).map(([userId, userShifts]) => {
                const u = users.find(u => u.id === userId);
                const isExpanded = expandedUsers.has(userId);
                const totalHours = (userShifts.reduce((s, sh) => s + sh.duration, 0) / 60).toFixed(1);
                return (
                  <div key={userId} style={{ background: 'var(--f22-surface-light)', borderRadius: 16, border: '1px solid var(--f22-border)', overflow: 'hidden' }}>
                    <button onClick={() => toggleExpandUser(userId)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--f22-text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {u?.profilePicture ? <img src={u.profilePicture} alt="" /> : (u?.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 700 }}>{u?.name || t.unknownUser}</span>
                        <span style={{ color: 'var(--f22-text-muted)', fontSize: 13 }}>({userShifts.length} {t.shifts} · {totalHours}h)</span>
                      </div>
                      <svg style={{ ...iconStyle, transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {isExpanded && (
                      <div style={{ padding: '0 12px 12px' }}>
                        <div className="data-table-wrap">
                          <table className="data-table">
                            <thead>
                              <tr><th>{t.date}</th><th>{t.checkInTime}</th><th>{t.checkOutTime}</th><th>{t.duration}</th><th>{t.note}</th><th>{t.actions}</th></tr>
                            </thead>
                            <tbody>
                              {userShifts.map(shift => (
                                <tr key={shift.id}>
                                  <td style={{ fontWeight: 600 }}>{formatDate(shift.date)}</td>
                                  <td><span className="badge-green">{formatTime(shift.checkIn)}</span></td>
                                  <td><span className={shift.checkOut ? 'badge-red' : 'badge-orange'}>{formatTime(shift.checkOut)}</span></td>
                                  <td style={{ fontWeight: 600 }}>{formatDuration(shift.duration)}</td>
                                  <td style={{ color: 'var(--f22-text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shift.note || '-'}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button onClick={() => openEditShift(shift)} className="shift-action-btn edit"><svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                      <button onClick={() => handleDeleteShift(shift.id)} className="shift-action-btn delete"><svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live Check-ins Tab */}
      {activeTab === 'live' && (
        <div className="page-section">
          <h4 style={{ fontWeight: 700, fontSize: 18, color: 'var(--f22-text)', marginBottom: 20 }}>{t.checkedInToday}</h4>
          {activeShifts.length === 0 ? (
            <div className="empty-state"><p>{t.noOneCheckedIn}</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {activeShifts.map(as => {
                const u = users.find(u => u.id === as.userId);
                const elapsed = now ? Math.floor((now - as.startTime) / 60000) : 0;
                return (
                  <div key={as.userId} style={{ background: 'var(--f22-surface-light)', border: '1px solid rgba(57,255,20,.2)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ width: 40, height: 40 }}>
                        {u?.profilePicture ? <img src={u.profilePicture} alt="" /> : as.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--f22-text)' }}>{as.userName}</div>
                        <div style={{ fontSize: 12, color: 'var(--f22-text-muted)' }}>{u?.department || ''}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--f22-text-muted)' }}>{t.checkInTime}:</span>
                      <span className="badge-green" style={{ fontSize: 12, padding: '4px 12px' }}>{formatTime(as.checkIn)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: 'var(--f22-text-muted)' }}>{t.workingFor}:</span>
                      <span style={{ fontWeight: 700, color: '#39FF14' }}>{Math.floor(elapsed / 60)}h {elapsed % 60}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && <AdminExpenseReports user={user} />}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay">
          <div className="modal-bg-blur" style={{ position: 'absolute', inset: 0 }} onClick={() => setShowAddUser(false)} />
          <div className="modal-card" style={{ maxWidth: 448, position: 'relative', zIndex: 1 }}>
            <h3>{t.addUser}</h3>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">{t.fullName}</label>
                <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="form-input" placeholder={t.enterName} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.email}</label>
                <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} className="form-input" placeholder={t.enterEmail} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.password}</label>
                <input type="password" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="form-input" placeholder={t.enterPassword} />
              </div>
              <div className="form-group">
                <label className="form-label">{t.department}</label>
                <select value={newUserDept} onChange={e => setNewUserDept(e.target.value)} className="form-select">
                  <option value="">{t.selectDepartment}</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="modal-actions">
                <button onClick={handleCreateUser} className="btn-green">{t.save}</button>
                <button onClick={() => setShowAddUser(false)} className="btn-secondary">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shift Modal */}
      {editingShift && (
        <div className="modal-overlay">
          <div className="modal-bg-blur" style={{ position: 'absolute', inset: 0 }} onClick={() => setEditingShift(null)} />
          <div className="modal-card" style={{ maxWidth: 480, position: 'relative', zIndex: 1 }}>
            <h3>{t.editShift} — {formatDate(editingShift.date)}</h3>
            <div className="modal-form">
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
                <input type="number" value={editForm.breakMinutes || ''} onChange={e => setEditForm(f => ({ ...f, breakMinutes: Number(e.target.value) }))} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.note}</label>
                <textarea value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} className="form-input resize-none" rows={2} />
              </div>
              <div className="modal-actions">
                <button onClick={handleSaveShift} className="btn-green">{t.save}</button>
                <button onClick={() => setEditingShift(null)} className="btn-secondary">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
