import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isUserAdmin } from '../utils/auth';
import type { ViewType, User } from '../types';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  user: User;
  onLogout: () => void;
}

const Header = ({ currentView, onViewChange, user, onLogout }: HeaderProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { toggleTheme, isDark } = useTheme();
  const { canInstall, isInstalled, isIOSSafari, showIOSModal, installApp, showIOSInstructions, hideIOSInstructions } = usePWAInstall();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const toggleLanguage = () => setLanguage(language === 'he' ? 'en' : 'he');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && isMenuOpen) { setIsMenuOpen(false); menuButtonRef.current?.focus(); } };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(e.target as Node) && menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)) setIsMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen || !menuRef.current) return;
    const focusableElements = menuRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === firstElement) { e.preventDefault(); lastElement?.focus(); }
      else if (!e.shiftKey && document.activeElement === lastElement) { e.preventDefault(); firstElement?.focus(); }
    };
    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const userIsAdmin = isUserAdmin(user);
  const iconStyle = { width: 20, height: 20 };

  const navItems: { view: ViewType; label: string; icon: ReactNode }[] = [
    { view: 'home', label: t.navHome, icon: <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
    { view: 'edit-activity', label: t.editActivity, icon: <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { view: 'profile', label: t.profile, icon: <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
    { view: 'expenses', label: t.expenseReport, icon: <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg> },
  ];
  if (userIsAdmin) {
    navItems.push({ view: 'admin', label: t.admin, icon: <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg> });
  }

  const handleNavClick = (view: ViewType) => { onViewChange(view); setIsMenuOpen(false); };
  const handleInstallClick = () => { if (isIOSSafari) showIOSInstructions(); else installApp(); };

  const ThemeIcon = isDark ? (
    <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
  ) : (
    <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
  );

  return (
    <>
      <header className="header">
        <div className="header-inner">
          {/* Hamburger */}
          <button ref={menuButtonRef} onClick={() => setIsMenuOpen(!isMenuOpen)} className="hamburger" aria-label={t.menu} aria-expanded={isMenuOpen} aria-controls="mobile-menu">
            {isMenuOpen ? (
              <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg style={{ width: 24, height: 24 }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>

          {/* Brand */}
          <div className="header-brand">
            <img src={isDark ? '/Logo_fitness.png' : '/logo_black.png'} alt="Fitness22" className="header-logo" />
            <span className="header-divider">|</span>
            <h1 className="header-title">{t.appTitle}</h1>
          </div>

          {/* Desktop Nav */}
          <nav className="nav-desktop">
            {navItems.map((item) => (
              <button key={item.view} onClick={() => handleNavClick(item.view)} className={`nav-btn ${currentView === item.view ? 'active' : ''}`}>
                {item.icon}
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="header-actions">
            {!isInstalled && (canInstall || isIOSSafari) && (
              <button onClick={handleInstallClick} className="header-icon-btn pwa-btn">
                <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                <span>{t.installApp}</span>
              </button>
            )}
            <button onClick={toggleTheme} className="header-icon-btn" title={isDark ? t.lightMode : t.darkMode} aria-label={isDark ? t.lightMode : t.darkMode}>{ThemeIcon}</button>
            <button onClick={toggleLanguage} className="header-icon-btn" title={language === 'he' ? 'Switch to English' : 'החלף לעברית'}>
              {language === 'he' ? (
                <svg style={{ width: 24, height: 24, borderRadius: 2 }} viewBox="0 0 36 36"><rect fill="#B22234" width="36" height="36" /><rect fill="#FFFFFF" y="2.77" width="36" height="2.77" /><rect fill="#FFFFFF" y="8.31" width="36" height="2.77" /><rect fill="#FFFFFF" y="13.85" width="36" height="2.77" /><rect fill="#FFFFFF" y="19.38" width="36" height="2.77" /><rect fill="#FFFFFF" y="24.92" width="36" height="2.77" /><rect fill="#FFFFFF" y="30.46" width="36" height="2.77" /><rect fill="#3C3B6E" width="14.4" height="19.38" /></svg>
              ) : (
                <svg style={{ width: 24, height: 24, borderRadius: 2 }} viewBox="0 0 36 36"><rect fill="#FFFFFF" width="36" height="36" /><rect fill="#0038B8" y="4" width="36" height="5" /><rect fill="#0038B8" y="27" width="36" height="5" /><polygon fill="#0038B8" points="18,10 21.5,17 18,24 14.5,17" /><polygon fill="#FFFFFF" points="18,12 20.5,17 18,22 15.5,17" /><polygon fill="#0038B8" points="18,24 21.5,17 18,10 14.5,17" transform="rotate(180 18 17)" /></svg>
              )}
            </button>
            <div className="avatar-group">
              <div className="avatar">
                {user.profilePicture ? <img src={user.profilePicture} alt={user.name} /> : user.name.charAt(0).toUpperCase()}
              </div>
              <span className="avatar-name">{user.name}</span>
            </div>
            <button onClick={onLogout} className="header-icon-btn logout" title={t.logout} aria-label={t.logout}>
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Overlay */}
      {isMenuOpen && <div className="menu-overlay" aria-hidden="true" onClick={() => setIsMenuOpen(false)} />}

      {/* Mobile Menu */}
      <div ref={menuRef} id="mobile-menu" role="dialog" aria-modal="true" aria-label={t.menu} className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
        <nav>
          {navItems.map((item) => (
            <button key={item.view} onClick={() => handleNavClick(item.view)} className={`mobile-nav-btn ${currentView === item.view ? 'active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          <hr className="menu-divider" />
          <button onClick={() => toggleTheme()} className="mobile-nav-btn mobile-nav-split">
            <span className="split-left">{ThemeIcon}<span>{t.theme}</span></span>
            <span className="split-right">{isDark ? t.darkMode : t.lightMode}</span>
          </button>
          <button onClick={() => toggleLanguage()} className="mobile-nav-btn mobile-nav-split">
            <span className="split-left">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
              <span>{t.language}</span>
            </span>
            <span className="split-right">{language === 'he' ? 'עברית' : 'English'}</span>
          </button>
          {!isInstalled && (canInstall || isIOSSafari) && (
            <button onClick={() => { handleInstallClick(); setIsMenuOpen(false); }} className="mobile-nav-btn active">
              <svg style={iconStyle} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>{t.installApp}</span>
            </button>
          )}
        </nav>
      </div>

      {/* iOS Install Modal */}
      {showIOSModal && (
        <div className="ios-modal-overlay" onClick={hideIOSInstructions}>
          <div className="ios-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{t.iosInstallTitle}</h3>
            <div className="ios-steps">
              <div className="ios-step">
                <span className="ios-step-num">1</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>{t.iosInstallStep1}</span>
                  <svg style={{ width: 20, height: 20, color: '#39FF14' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /></svg>
                </div>
              </div>
              <div className="ios-step">
                <span className="ios-step-num">2</span>
                <span>{t.iosInstallStep2}</span>
              </div>
            </div>
            <button onClick={hideIOSInstructions} className="btn-green" style={{ width: '100%', marginTop: 28 }}>{t.close}</button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
