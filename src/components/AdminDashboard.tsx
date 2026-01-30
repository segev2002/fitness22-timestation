import { useState, useEffect, useCallback } from 'react';
import type { Shift, User, ActiveShift } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { 
  getUsers, 
  adminCreateUser, 
  adminToggleUserAdmin, 
  adminUpdateUserDepartment,
  adminDeleteUser,
  isUserAdmin,
  isPrimaryAdmin,
  DEPARTMENTS,
  saveUsers,
  validateAdminAsync,
} from '../utils/auth';
import { getShifts, updateShift, deleteShift, getActiveShift } from '../utils/storage';
import { supabaseActiveShift, isSupabaseConfigured } from '../utils/supabase';
import { generateAdminExcel } from '../utils/excel';

interface AdminDashboardProps {
  user: User;
}

type AdminTab = 'users' | 'shifts' | 'live';

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShifts, setActiveShifts] = useState<ActiveShift[]>([]);
  const [isAdminVerified, setIsAdminVerified] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // New user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [formError, setFormError] = useState('');
  
  // Edit shift modal
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editBreakMinutes, setEditBreakMinutes] = useState(0);

  // SECURITY: Verify admin status on mount and periodically
  useEffect(() => {
    const verifyAdmin = async () => {
      const isAdmin = await validateAdminAsync(user);
      setIsAdminVerified(isAdmin);
      
      if (!isAdmin) {
        console.error('SECURITY: User attempted to access admin dashboard without admin privileges');
        // The parent component should handle the redirect, but we block rendering
      }
    };
    
    verifyAdmin();
    
    // Re-verify every 30 seconds
    const interval = setInterval(verifyAdmin, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load data
  const loadUsers = useCallback(() => {
    setUsers(getUsers());
  }, []);

  const loadShifts = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const allShifts = getShifts().filter(s => {
      const shiftDate = new Date(s.date);
      return shiftDate.getFullYear() === year && shiftDate.getMonth() === month - 1;
    });
    setShifts(allShifts);
  }, [selectedMonth]);

  const loadActiveShifts = useCallback(async () => {
    // Try Supabase first for all active shifts
    if (isSupabaseConfigured()) {
      const active = await supabaseActiveShift.getAll();
      setActiveShifts(active);
    } else {
      // Fallback: Check localStorage for current user's active shift
      // Note: In localStorage mode, we can only see our own active shift
      const localActive = getActiveShift();
      setActiveShifts(localActive ? [localActive] : []);
    }
  }, []);

  useEffect(() => {
    // Only load data if admin is verified
    if (!isAdminVerified) return;
    
    loadUsers();
    loadShifts();
    loadActiveShifts();
    
    // Subscribe to realtime active shifts changes
    const subscription = supabaseActiveShift.subscribeToChanges((newShifts) => {
      setActiveShifts(newShifts);
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, [loadUsers, loadShifts, loadActiveShifts, isAdminVerified]);

  useEffect(() => {
    if (isAdminVerified) {
      loadShifts();
    }
  }, [selectedMonth, loadShifts, isAdminVerified]);

  // SECURITY: Early return if not verified admin - show nothing
  if (!isAdminVerified) {
    // First check synchronously as a fast path
    if (!isUserAdmin(user)) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center text-[var(--f22-text-muted)]">
            <p>{t.notAuthorized}</p>
          </div>
        </div>
      );
    }
    // Show loading while async verification completes
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#39FF14] border-t-transparent"></div>
      </div>
    );
  }

  // Check if current user is primary admin
  const isPrimary = isPrimaryAdmin(user.email);

  // Create new user
  const handleCreateUser = () => {
    setFormError('');
    
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setFormError(t.nameRequired);
      return;
    }
    
    if (newUserPassword.length < 6) {
      setFormError(t.passwordTooShort);
      return;
    }
    
    const result = adminCreateUser(user, newUserName, newUserEmail, newUserPassword, newUserDepartment);
    
    if (result.success) {
      setShowAddUser(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserDepartment('');
      loadUsers();
      alert(t.userCreated);
    } else {
      setFormError(result.error === 'emailExists' ? t.emailExists : t.notAuthorized);
    }
  };

  // Toggle admin status
  const handleToggleAdmin = (targetUserId: string, makeAdmin: boolean) => {
    const result = adminToggleUserAdmin(user, targetUserId, makeAdmin);
    if (result.success) {
      loadUsers();
    } else {
      alert(result.error === 'onlyPrimaryAdmin' ? t.onlyPrimaryAdmin : t.notAuthorized);
    }
  };

  // Update department
  const handleUpdateDepartment = (targetUserId: string, department: string) => {
    const result = adminUpdateUserDepartment(user, targetUserId, department);
    if (result.success) {
      loadUsers();
    } else {
      alert(t.onlyPrimaryAdmin);
    }
  };

  // Delete/disable user (soft delete)
  const handleDeleteUser = (targetUserId: string) => {
    if (!confirm(t.confirmDeleteUser)) return;
    
    const result = adminDeleteUser(user, targetUserId);
    if (result.success) {
      loadUsers();
    } else {
      if (result.error === 'cannotDeletePrimaryAdmin') {
        alert(t.cannotDeletePrimaryAdmin);
      } else if (result.error === 'cannotDeleteSelf') {
        alert(t.cannotDeleteSelf);
      } else {
        alert(t.notAuthorized);
      }
    }
  };

  // Re-enable a disabled user
  const handleEnableUser = (targetUserId: string) => {
    const allUsers = getUsers();
    const userIndex = allUsers.findIndex(u => u.id === targetUserId);
    if (userIndex !== -1) {
      allUsers[userIndex].isDisabled = false;
      saveUsers(allUsers);
      loadUsers();
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (shifts.length === 0) {
      alert(t.noShiftsToExport);
      return;
    }
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthNames = language === 'he' 
      ? ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const monthYear = `${monthNames[month - 1]} ${year}`;
    generateAdminExcel(shifts, users, monthYear, language);
  };

  // Edit shift
  const openEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setEditCheckIn(new Date(shift.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    setEditCheckOut(shift.checkOut ? new Date(shift.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    setEditNote(shift.note);
    setEditBreakMinutes(shift.breakMinutes || 0);
  };

  const handleSaveShift = () => {
    if (!editingShift) return;
    
    const checkInDate = new Date(`${editingShift.date}T${editCheckIn}:00`);
    const checkOutDate = editCheckOut ? new Date(`${editingShift.date}T${editCheckOut}:00`) : null;
    
    const duration = checkOutDate 
      ? Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60))
      : 0;
    
    const updatedShift: Shift = {
      ...editingShift,
      checkIn: checkInDate.toISOString(),
      checkOut: checkOutDate?.toISOString() || null,
      note: editNote,
      duration: Math.max(0, duration),
      breakMinutes: editBreakMinutes,
    };
    
    updateShift(updatedShift);
    setEditingShift(null);
    loadShifts();
  };

  const handleDeleteShift = (shiftId: string) => {
    if (confirm(t.confirmDelete)) {
      deleteShift(shiftId);
      loadShifts();
    }
  };

  // Format time for display
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full min-h-[calc(100vh-72px)] px-4 sm:px-6 md:px-8 py-4 sm:py-6">
      {/* Header */}
      <div className="bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg p-4 sm:p-6 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--f22-text)] flex items-center gap-3">
          <svg className="w-6 h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t.adminDashboard}
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          { id: 'users' as AdminTab, label: t.allEmployees },
          { id: 'shifts' as AdminTab, label: t.allShifts },
          { id: 'live' as AdminTab, label: t.liveCheckIns },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-[#39FF14] text-[#0D0D0D]'
                : 'bg-[var(--f22-surface)] text-[var(--f22-text-muted)] border border-[var(--f22-border)] hover:border-[#39FF14]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[var(--f22-text)]">{t.userManagement}</h3>
            <button
              onClick={() => setShowAddUser(true)}
              className="bg-[#39FF14] text-[#0D0D0D] px-4 py-2 rounded-lg font-medium hover:bg-[#00D438] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t.addUser}
            </button>
          </div>

          {/* Add User Modal */}
          {showAddUser && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--f22-surface)] rounded-lg p-6 w-full max-w-md border border-[var(--f22-border)]">
                <h4 className="text-lg font-bold text-[var(--f22-text)] mb-4">{t.addUser}</h4>
                
                {formError && (
                  <div className="bg-red-500/20 text-red-500 px-4 py-2 rounded-lg mb-4">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t.fullName}
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                  />
                  <input
                    type="email"
                    placeholder={t.email}
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                  />
                  <input
                    type="password"
                    placeholder={t.password}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                  />
                  <select
                    value={newUserDepartment}
                    onChange={(e) => setNewUserDepartment(e.target.value)}
                    className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                  >
                    <option value="">{t.selectDepartment}</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCreateUser}
                    className="flex-1 bg-[#39FF14] text-[#0D0D0D] py-3 rounded-lg font-medium hover:bg-[#00D438]"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => { setShowAddUser(false); setFormError(''); }}
                    className="flex-1 bg-[var(--f22-surface-light)] text-[var(--f22-text)] py-3 rounded-lg font-medium border border-[var(--f22-border)]"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--f22-border)]">
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.fullName}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.email}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.department}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.admin}</th>
                  {isPrimary && <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.actions}</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={`border-b border-[var(--f22-border)] ${u.isDisabled ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-2 text-[var(--f22-text)]">
                      {u.name}
                      {u.isDisabled && (
                        <span className="ml-2 bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs">{t.userDisabledLabel}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-[var(--f22-text-muted)]">{u.email}</td>
                    <td className="py-3 px-2">
                      {isPrimary ? (
                        <select
                          value={u.department || ''}
                          onChange={(e) => handleUpdateDepartment(u.id, e.target.value)}
                          className="bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded px-2 py-1 text-sm"
                          disabled={u.isDisabled}
                        >
                          <option value="">-</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-[var(--f22-text-muted)]">{u.department || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {isPrimaryAdmin(u.email) ? (
                        <span className="bg-[#39FF14]/20 text-[#39FF14] px-2 py-1 rounded text-sm">{t.primaryAdmin}</span>
                      ) : isUserAdmin(u) ? (
                        <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm">{t.admin}</span>
                      ) : (
                        <span className="text-[var(--f22-text-muted)]">-</span>
                      )}
                    </td>
                    {isPrimary && (
                      <td className="py-3 px-2">
                        <div className="flex gap-2 flex-wrap">
                          {!isPrimaryAdmin(u.email) && !u.isDisabled && (
                            <button
                              onClick={() => handleToggleAdmin(u.id, !u.isAdmin)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                u.isAdmin 
                                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                                  : 'bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14]/30'
                              }`}
                            >
                              {u.isAdmin ? t.removeAdmin : t.makeAdmin}
                            </button>
                          )}
                          {!isPrimaryAdmin(u.email) && u.id !== user.id && (
                            u.isDisabled ? (
                              <button
                                onClick={() => handleEnableUser(u.id)}
                                className="px-3 py-1 rounded text-sm font-medium bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              >
                                {t.enableUser}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-3 py-1 rounded text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              >
                                {t.disableUser}
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h3 className="text-lg font-bold text-[var(--f22-text)]">{t.allShifts}</h3>
            <div className="flex gap-3">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-2"
              />
              <button
                onClick={handleExportExcel}
                className="bg-[#39FF14] text-[#0D0D0D] px-4 py-2 rounded-lg font-medium hover:bg-[#00D438] flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t.exportExcel}
              </button>
            </div>
          </div>

          {/* Edit Shift Modal */}
          {editingShift && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-[var(--f22-surface)] rounded-lg p-6 w-full max-w-md border border-[var(--f22-border)]">
                <h4 className="text-lg font-bold text-[var(--f22-text)] mb-4">{t.editShift}</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[var(--f22-text-muted)] mb-1">{t.checkInTime}</label>
                    <input
                      type="time"
                      value={editCheckIn}
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--f22-text-muted)] mb-1">{t.checkOutTime}</label>
                    <input
                      type="time"
                      value={editCheckOut}
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--f22-text-muted)] mb-1">{t.breakMinutes}</label>
                    <input
                      type="number"
                      min="0"
                      value={editBreakMinutes}
                      onChange={(e) => setEditBreakMinutes(parseInt(e.target.value) || 0)}
                      className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[var(--f22-text-muted)] mb-1">{t.note}</label>
                    <textarea
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                      className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-lg px-4 py-3 resize-none"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveShift}
                    className="flex-1 bg-[#39FF14] text-[#0D0D0D] py-3 rounded-lg font-medium hover:bg-[#00D438]"
                  >
                    {t.save}
                  </button>
                  <button
                    onClick={() => setEditingShift(null)}
                    className="flex-1 bg-[var(--f22-surface-light)] text-[var(--f22-text)] py-3 rounded-lg font-medium border border-[var(--f22-border)]"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shifts Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--f22-border)]">
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.employee}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.date}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.checkInTime}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.checkOutTime}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.breakMinutes}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.duration}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.note}</th>
                  <th className="text-left py-3 px-2 text-[var(--f22-text-muted)] font-medium">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[var(--f22-text-muted)]">
                      {t.noShiftsToShow}
                    </td>
                  </tr>
                ) : (
                  shifts.map(shift => {
                    const breakMins = shift.breakMinutes || 0;
                    const netDuration = shift.duration - breakMins;
                    // Simplify note display
                    let displayNote = shift.note || '';
                    if (displayNote === 'Work from Office' || displayNote === 'עבודה מהמשרד') {
                      displayNote = '';
                    }
                    
                    return (
                      <tr key={shift.id} className="border-b border-[var(--f22-border)]">
                        <td className="py-3 px-2 text-[var(--f22-text)]">{shift.userName}</td>
                        <td className="py-3 px-2 text-[var(--f22-text-muted)]">
                          {new Date(shift.date).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                        </td>
                        <td className="py-3 px-2 text-[var(--f22-text)]">{formatTime(shift.checkIn)}</td>
                        <td className="py-3 px-2 text-[var(--f22-text)]">
                          {shift.checkOut ? formatTime(shift.checkOut) : '-'}
                        </td>
                        <td className="py-3 px-2 text-[var(--f22-text-muted)]">{breakMins || '-'}</td>
                        <td className="py-3 px-2 text-[#39FF14] font-medium">
                          {formatDuration(Math.max(0, netDuration))}
                        </td>
                        <td className="py-3 px-2 text-[var(--f22-text-muted)] max-w-[200px] truncate">
                          {displayNote || '-'}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditShift(shift)}
                              className="p-2 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteShift(shift.id)}
                              className="p-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Check-ins Tab */}
      {activeTab === 'live' && (
        <div className="bg-[var(--f22-surface)] border border-[var(--f22-border)] rounded-lg p-4 sm:p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[var(--f22-text)] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#39FF14] animate-pulse"></span>
              {t.checkedInToday}
            </h3>
            <button
              onClick={loadActiveShifts}
              className="bg-[var(--f22-surface-light)] text-[var(--f22-text-muted)] px-4 py-2 rounded-lg border border-[var(--f22-border)] hover:border-[#39FF14]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {activeShifts.length === 0 ? (
            <div className="text-center py-12 text-[var(--f22-text-muted)]">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p>{t.noOneCheckedIn}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeShifts.map(shift => {
                const checkInDate = new Date(shift.checkIn);
                const now = new Date();
                const duration = Math.round((now.getTime() - checkInDate.getTime()) / (1000 * 60));
                
                return (
                  <div
                    key={shift.userId}
                    className="bg-[var(--f22-surface-light)] border border-[var(--f22-border)] rounded-lg p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#39FF14]/20 flex items-center justify-center">
                      <span className="text-[#39FF14] text-lg font-bold">
                        {shift.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[var(--f22-text)]">{shift.userName}</p>
                      <p className="text-sm text-[var(--f22-text-muted)]">
                        {t.checkInTime}: {formatTime(shift.checkIn)}
                      </p>
                      <p className="text-sm text-[#39FF14]">
                        {t.workingFor} {formatDuration(duration)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
