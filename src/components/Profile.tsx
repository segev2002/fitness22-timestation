import { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { updateUserProfile, changeUserPassword } from '../utils/auth';
import type { User } from '../types';

interface ProfileProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

const Profile = ({ user, onUserUpdate }: ProfileProps) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user.profilePicture);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setProfilePicture(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setProfilePicture(undefined);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaveError('');
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      const success = await updateUserProfile(user.id, name, profilePicture);
      if (success) {
        onUserUpdate({ ...user, name, profilePicture });
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setSaveError(t.profileSaveFailed);
      }
    } catch (error) {
      console.error('Profile save failed:', error);
      setSaveError(t.profileSaveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setProfilePicture(user.profilePicture);
    setIsEditing(false);
    setSaveError('');
    setSaveSuccess(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);
    
    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t.nameRequired); // reuse for required fields
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError(t.passwordMismatch);
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError(t.passwordTooShort);
      return;
    }
    
    const result = await changeUserPassword(user.id, currentPassword, newPassword);
    
    if (result.success) {
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(false);
      }, 2000);
    } else {
      if (result.error === 'incorrectPassword') {
        setPasswordError(t.incorrectPassword);
      } else {
        setPasswordError(t.loginError);
      }
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-5 sm:px-8 md:px-12 py-8">
      <div className="w-full max-w-lg">
        <div className="bg-[var(--f22-surface)] rounded-2xl shadow-[var(--shadow-lg)] border border-[var(--f22-border)] overflow-hidden">
          {/* Profile Header */}
          <div className="bg-[var(--f22-bg)] px-7 md:px-10 py-12 md:py-16 text-center relative">
            {/* Profile Picture */}
            <div className="relative inline-block mb-6">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-[#39FF14] rounded-full flex items-center justify-center mx-auto overflow-hidden border-4 border-[#39FF14] shadow-[var(--shadow-glow-strong)]">
                {profilePicture ? (
                  <img 
                    src={profilePicture} 
                    alt={user.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold text-[var(--f22-text)]">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              
              {/* Edit photo button */}
              {isEditing && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#39FF14] text-[#0D0D0D] p-2.5 rounded-full shadow-lg hover:brightness-110 transition-all"
                    title={t.changePhoto}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  {profilePicture && (
                    <button
                      onClick={handleRemovePhoto}
                      className="bg-red-500 text-white p-2.5 rounded-full shadow-lg hover:bg-red-600 transition-all"
                      title={t.removePhoto}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Name */}
            {!isEditing ? (
              <h2 className="text-2xl md:text-3xl font-bold text-[var(--f22-text)] mb-3 tracking-tight">{user.name}</h2>
            ) : (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl md:text-2xl font-bold text-center bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-xl px-5 py-3.5 min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 w-full max-w-xs mx-auto block"
                autoFocus
              />
            )}
            <p className="text-[var(--f22-text-muted)] mt-3">{user.email}</p>
          </div>

          {/* Profile Info */}
          <div className="p-7 md:p-9 space-y-4 md:space-y-5">
            {/* Member Since */}
            <div className="flex items-center gap-4 p-5 md:p-6 bg-[var(--f22-surface-light)] rounded-xl border border-[var(--f22-border)]">
              <div className="bg-[#39FF14]/10 p-3 md:p-3.5 rounded-xl flex-shrink-0">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)]">{t.memberSince}</p>
                <p className="font-bold text-[var(--f22-text)] mt-0.5">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            {/* Email Info */}
            <div className="flex items-center gap-4 p-5 md:p-6 bg-[var(--f22-surface-light)] rounded-xl border border-[var(--f22-border)]">
              <div className="bg-[#39FF14]/10 p-3 md:p-3.5 rounded-xl flex-shrink-0">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)]">{t.email}</p>
                <p className="font-bold text-[var(--f22-text)] truncate mt-0.5">{user.email}</p>
              </div>
            </div>

            {saveError && (
              <div className="w-full text-center bg-red-500/10 text-red-400 px-5 py-2.5 rounded-xl text-sm font-medium">
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="w-full text-center bg-[var(--f22-green)]/10 text-[var(--f22-green)] px-5 py-2.5 rounded-xl text-sm font-medium">
                {t.profileSaveSuccess}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 pt-5 md:pt-6">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setSaveError('');
                      setSaveSuccess(false);
                    }}
                    className="flex items-center justify-center gap-3 bg-[#39FF14] text-[#0D0D0D] px-7 md:px-9 py-3.5 md:py-4 min-h-[48px] rounded-xl font-bold hover:brightness-110 transition-all shadow-[var(--shadow-glow)] transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    {t.editProfile}
                  </button>
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="flex items-center justify-center gap-3 bg-[var(--f22-surface-light)] text-[var(--f22-text)] px-7 md:px-9 py-3.5 md:py-4 min-h-[48px] rounded-xl font-bold hover:bg-[var(--f22-surface-elevated)] transition-all border border-[var(--f22-border)]"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {t.changePassword}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 bg-[var(--f22-surface-light)] text-[var(--f22-text-secondary)] px-6 py-3.5 md:py-4 min-h-[48px] rounded-xl font-semibold hover:bg-[var(--f22-surface-elevated)] transition-all border border-[var(--f22-border)]"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !name.trim()}
                    className="flex items-center justify-center gap-2 bg-[#39FF14] text-[#0D0D0D] px-6 py-3.5 md:py-4 min-h-[48px] rounded-xl font-bold hover:brightness-110 transition-all shadow-[var(--shadow-glow)] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {t.saveChanges}
                  </button>
                </>
              )}
            </div>

            {/* Password Change Modal */}
            {showPasswordChange && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[var(--f22-surface)] rounded-2xl p-7 w-full max-w-md border border-[var(--f22-border)] shadow-2xl">
                  <h4 className="text-lg font-bold text-[var(--f22-text)] mb-5 tracking-tight">{t.changePassword}</h4>
                  
                  {passwordError && (
                    <div className="bg-red-500/10 text-red-500 px-5 py-2.5 rounded-xl mb-5 text-sm font-medium">
                      {passwordError}
                    </div>
                  )}
                  
                  {passwordSuccess && (
                    <div className="bg-[var(--f22-green)]/10 text-[var(--f22-green)] px-5 py-2.5 rounded-xl mb-5 text-sm font-medium">
                      {t.passwordChanged}
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)] mb-2">{t.currentPassword}</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-xl px-5 py-3.5 min-h-[48px] transition-all focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] text-[15px]"
                        placeholder={t.enterPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)] mb-2">{t.newPassword}</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-xl px-5 py-3.5 min-h-[48px] transition-all focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] text-[15px]"
                        placeholder={t.enterPassword}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)] mb-2">{t.confirmPassword}</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[var(--f22-surface-light)] border border-[var(--f22-border)] text-[var(--f22-text)] rounded-xl px-5 py-3.5 min-h-[48px] transition-all focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] text-[15px]"
                        placeholder={t.reenterPassword}
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-7">
                    <button
                      onClick={handlePasswordChange}
                      className="flex-1 bg-[#39FF14] text-[#0D0D0D] py-3.5 rounded-xl font-bold hover:brightness-110 transition-all shadow-[var(--shadow-glow)]"
                    >
                      {t.save}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordError('');
                        setCurrentPassword('');
                        setNewPassword('');
                        setConfirmPassword('');
                      }}
                      className="flex-1 bg-[var(--f22-surface-light)] text-[var(--f22-text)] py-3.5 rounded-xl font-semibold border border-[var(--f22-border)] hover:bg-[var(--f22-surface-elevated)] transition-all"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
