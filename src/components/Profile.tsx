import { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { supabaseUsers } from '../utils/supabase';
import { supabaseShifts } from '../utils/supabase';
import type { User } from '../types';

interface ProfileProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

const Profile = ({ user, onUserUpdate }: ProfileProps) => {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setProfilePicture(ev.target.result as string); };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => setProfilePicture('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    setSaveSuccess('');
    try {
      const updated: User = { ...user, name, profilePicture: profilePicture || undefined };
      const success = await supabaseUsers.upsert(updated);
      if (success) {
        // Also update shift user names
        await supabaseShifts.updateUserName(user.id, name);
        onUserUpdate(updated);
        setSaveSuccess(t.profileSaveSuccess);
        setIsEditing(false);
      } else {
        setSaveError(t.profileSaveFailed);
      }
    } catch {
      setSaveError(t.profileSaveFailed);
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    setName(user.name);
    setProfilePicture(user.profilePicture || '');
    setIsEditing(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (currentPassword !== user.password) { setPasswordError(t.incorrectPassword); return; }
    if (newPassword.length < 6) { setPasswordError(t.passwordTooShort); return; }
    if (newPassword !== confirmPassword) { setPasswordError(t.passwordMismatch); return; }
    try {
      const updated: User = { ...user, password: newPassword };
      await supabaseUsers.upsert(updated);
      onUserUpdate(updated);
      setPasswordSuccess(t.passwordChanged);
      setTimeout(() => { setShowPasswordChange(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordSuccess(''); }, 1500);
    } catch {
      setPasswordError(t.profileSaveFailed);
    }
  };

  const memberSince = new Date(user.createdAt).toLocaleDateString();
  const iconStyle = { width: 20, height: 20 };

  return (
    <div className="profile-page">
      <div className="profile-wrapper">
        <div className="profile-card">
          {/* Header / Avatar */}
          <div className="profile-header">
            <div className="profile-avatar">
              {profilePicture ? (
                <img src={profilePicture} alt={user.name} />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isEditing && (
              <div className="profile-edit-btns">
                <button onClick={() => fileInputRef.current?.click()} className="profile-edit-btn camera" title={t.changePhoto}>
                  <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </button>
                {profilePicture && (
                  <button onClick={handleRemovePhoto} className="profile-edit-btn remove" title={t.removePhoto}>
                    <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />

            {isEditing ? (
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="profile-name-input" />
            ) : (
              <div className="profile-name">{user.name}</div>
            )}
            <div className="profile-email">{user.email}</div>
          </div>

          {/* Body */}
          <div className="profile-body">
            <div className="info-row">
              <div className="info-icon">
                <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <div className="info-label">{t.memberSince}</div>
                <div className="info-value">{memberSince}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon">
                <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <div className="info-label">{t.email}</div>
                <div className="info-value">{user.email}</div>
              </div>
            </div>

            {saveError && <div className="error-box">{saveError}</div>}
            {saveSuccess && <div className="success-box">{saveSuccess}</div>}

            {/* Actions */}
            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={isSaving} className="btn-profile primary">
                    {isSaving ? (
                      <svg style={{ animation: 'spin 1s linear infinite', ...iconStyle }} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" /><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : (
                      <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    )}
                    {t.saveChanges}
                  </button>
                  <button onClick={handleCancel} className="btn-profile secondary">{t.cancel}</button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="btn-profile primary">
                    <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    {t.editProfile}
                  </button>
                  <button onClick={() => setShowPasswordChange(true)} className="btn-profile secondary">
                    <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    {t.changePassword}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="password-modal-overlay" onClick={() => setShowPasswordChange(false)}>
          <div className="password-modal" onClick={e => e.stopPropagation()}>
            <h4>{t.changePassword}</h4>
            <div className="password-form">
              <div className="form-group">
                <label className="form-label">{t.currentPassword}</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.newPassword}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">{t.confirmPassword}</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="form-input" />
              </div>
              {passwordError && <div className="error-box">{passwordError}</div>}
              {passwordSuccess && <div className="success-box">{passwordSuccess}</div>}
              <div className="password-actions">
                <button onClick={handlePasswordChange} className="btn-green">{t.save}</button>
                <button onClick={() => setShowPasswordChange(false)} className="btn-secondary">{t.cancel}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
