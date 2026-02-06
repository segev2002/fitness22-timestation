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

  const toggleLanguage = () => {
    setLanguage(language === 'he' ? 'en' : 'he');
  };

  // Close menu on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  // Focus trap for accessibility
  useEffect(() => {
    if (!isMenuOpen || !menuRef.current) return;
    
    const focusableElements = menuRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };
    
    document.addEventListener('keydown', handleTabKey);
    firstElement?.focus();
    
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  // Check if user is admin
  const userIsAdmin = isUserAdmin(user);

  // Build nav items dynamically based on role
  const navItems: { view: ViewType; label: string; icon: ReactNode }[] = [
    {
      view: 'home',
      label: t.navHome,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      view: 'edit-activity',
      label: t.editActivity,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      view: 'profile',
      label: t.profile,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      view: 'expenses',
      label: t.expenseReport,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      ),
    },
  ];

  // Add admin nav item if user is admin
  if (userIsAdmin) {
    navItems.push({
      view: 'admin',
      label: t.admin,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    });
  }

  const handleNavClick = (view: ViewType) => {
    onViewChange(view);
    setIsMenuOpen(false);
  };

  const handleInstallClick = () => {
    if (isIOSSafari) {
      showIOSInstructions();
    } else {
      installApp();
    }
  };

  // Theme icon
  const ThemeIcon = isDark ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );

  return (
    <>
      <header className="bg-[var(--f22-surface)] shadow-lg border-b border-[var(--f22-border)] sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            
            {/* Left: Hamburger Menu (Mobile) */}
            <div className="flex items-center md:hidden">
              <button
                ref={menuButtonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-[var(--f22-text-muted)] hover:bg-[var(--f22-surface-light)] hover:text-[var(--f22-text)] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={t.menu}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
              >
                {isMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>

            {/* Center: Logo/Title */}
            <div className="flex flex-col sm:flex-row items-center gap-0 sm:gap-4 flex-shrink-0">
              <img
                src={isDark ? '/Logo_fitness.png' : '/logo_black.png'}
                alt="Fitness22"
                className="h-4 sm:h-7 w-auto shrink-0"
              />
              <span className="hidden sm:block text-[var(--f22-text-muted)] text-2xl font-light">|</span>
              <h1 className="text-sm sm:text-xl font-bold text-[var(--f22-text)]">{t.appTitle}</h1>
            </div>

            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
              {navItems.map((item) => (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 min-h-[44px] rounded-lg font-medium transition-all text-sm ${
                    currentView === item.view
                      ? 'bg-[#39FF14] text-[#0D0D0D] shadow-md shadow-[#39FF14]/30'
                      : 'text-[var(--f22-text-muted)] hover:bg-[var(--f22-surface-light)] border border-[var(--f22-border)]'
                  }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Right: User Info & Actions */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* PWA Install Button - Desktop only */}
              {!isInstalled && (canInstall || isIOSSafari) && (
                <button
                  onClick={handleInstallClick}
                  className="hidden md:flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg font-medium text-sm bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14]/30 transition-all border border-[#39FF14]/30"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{t.installApp}</span>
                </button>
              )}

              {/* Theme Toggle - Desktop only */}
              <button
                onClick={toggleTheme}
                className="hidden md:flex p-2.5 rounded-lg text-[var(--f22-text-muted)] hover:bg-[var(--f22-surface-light)] hover:text-[var(--f22-text)] transition-all min-h-[44px] min-w-[44px] items-center justify-center"
                title={isDark ? t.lightMode : t.darkMode}
                aria-label={isDark ? t.lightMode : t.darkMode}
              >
                {ThemeIcon}
              </button>

              {/* Language Toggle - Desktop only */}
              <button
                onClick={toggleLanguage}
                className="hidden md:flex hover:bg-[var(--f22-surface-light)] p-2.5 rounded-lg transition-all items-center gap-2 min-h-[44px] min-w-[44px] justify-center"
                title={language === 'he' ? 'Switch to English' : 'החלף לעברית'}
              >
                {language === 'he' ? (
                  <svg className="w-6 h-6 rounded-sm" viewBox="0 0 36 36">
                    <rect fill="#B22234" width="36" height="36"/>
                    <rect fill="#FFFFFF" y="2.77" width="36" height="2.77"/>
                    <rect fill="#FFFFFF" y="8.31" width="36" height="2.77"/>
                    <rect fill="#FFFFFF" y="13.85" width="36" height="2.77"/>
                    <rect fill="#FFFFFF" y="19.38" width="36" height="2.77"/>
                    <rect fill="#FFFFFF" y="24.92" width="36" height="2.77"/>
                    <rect fill="#FFFFFF" y="30.46" width="36" height="2.77"/>
                    <rect fill="#3C3B6E" width="14.4" height="19.38"/>
                  </svg>
                ) : (
                  <svg className="w-6 h-6 rounded-sm" viewBox="0 0 36 36">
                    <rect fill="#FFFFFF" width="36" height="36"/>
                    <rect fill="#0038B8" y="4" width="36" height="5"/>
                    <rect fill="#0038B8" y="27" width="36" height="5"/>
                    <polygon fill="#0038B8" points="18,10 21.5,17 18,24 14.5,17"/>
                    <polygon fill="#FFFFFF" points="18,12 20.5,17 18,22 15.5,17"/>
                    <polygon fill="#0038B8" points="18,24 21.5,17 18,10 14.5,17" transform="rotate(180 18 17)"/>
                  </svg>
                )}
              </button>

              {/* User Avatar */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#39FF14] rounded-full flex items-center justify-center text-[#0D0D0D] font-semibold text-sm overflow-hidden">
                  {user.profilePicture ? (
                    <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="hidden sm:block font-medium text-[var(--f22-text)]">{user.name}</span>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="text-[var(--f22-text-muted)] hover:bg-red-900/30 hover:text-red-400 p-2 sm:p-2.5 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                title={t.logout}
                aria-label={t.logout}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu */}
      <div
        ref={menuRef}
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t.menu}
        className={`fixed top-16 left-0 right-0 bottom-0 bg-[var(--f22-surface)] z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {/* Navigation Items */}
          {navItems.map((item) => (
            <button
              key={item.view}
              onClick={() => handleNavClick(item.view)}
              className={`w-full flex items-center gap-4 px-4 py-3 min-h-[48px] rounded-lg font-medium transition-all text-left ${
                currentView === item.view
                  ? 'bg-[#39FF14] text-[#0D0D0D] shadow-md shadow-[#39FF14]/30'
                  : 'text-[var(--f22-text)] hover:bg-[var(--f22-surface-light)] border border-[var(--f22-border)]'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          {/* Divider */}
          <div className="border-t border-[var(--f22-border)] my-4" />

          {/* Theme Toggle */}
          <button
            onClick={() => {
              toggleTheme();
            }}
            className="w-full flex items-center justify-between gap-4 px-4 py-3 min-h-[48px] rounded-lg font-medium text-[var(--f22-text)] hover:bg-[var(--f22-surface-light)] border border-[var(--f22-border)] transition-all"
          >
            <div className="flex items-center gap-4">
              {ThemeIcon}
              <span>{t.theme}</span>
            </div>
            <span className="text-sm text-[var(--f22-text-muted)]">
              {isDark ? t.darkMode : t.lightMode}
            </span>
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => {
              toggleLanguage();
            }}
            className="w-full flex items-center justify-between gap-4 px-4 py-3 min-h-[48px] rounded-lg font-medium text-[var(--f22-text)] hover:bg-[var(--f22-surface-light)] border border-[var(--f22-border)] transition-all"
          >
            <div className="flex items-center gap-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span>{t.language}</span>
            </div>
            <span className="text-sm text-[var(--f22-text-muted)]">
              {language === 'he' ? 'עברית' : 'English'}
            </span>
          </button>

          {/* PWA Install Button */}
          {!isInstalled && (canInstall || isIOSSafari) && (
            <button
              onClick={() => {
                handleInstallClick();
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 px-4 py-3 min-h-[48px] rounded-lg font-medium bg-[#39FF14]/20 text-[#39FF14] hover:bg-[#39FF14]/30 transition-all border border-[#39FF14]/30"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{t.installApp}</span>
            </button>
          )}
        </nav>
      </div>

      {/* iOS Install Instructions Modal */}
      {showIOSModal && (
        <div 
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
          onClick={hideIOSInstructions}
        >
          <div 
            className="bg-[var(--f22-surface)] rounded-lg p-6 max-w-sm w-full shadow-2xl border border-[var(--f22-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-[var(--f22-text)] mb-4">{t.iosInstallTitle}</h3>
            <div className="space-y-4 text-[var(--f22-text)]">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#39FF14] text-[#0D0D0D] flex items-center justify-center text-sm font-bold">1</span>
                <div className="flex items-center gap-2">
                  <span>{t.iosInstallStep1}</span>
                  <svg className="w-5 h-5 text-[#39FF14]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#39FF14] text-[#0D0D0D] flex items-center justify-center text-sm font-bold">2</span>
                <span>{t.iosInstallStep2}</span>
              </div>
            </div>
            <button
              onClick={hideIOSInstructions}
              className="mt-6 w-full py-3 bg-[#39FF14] text-[#0D0D0D] rounded-lg font-bold hover:bg-[#00D438] transition-colors min-h-[48px]"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
