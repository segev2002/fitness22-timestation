import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { loginUser } from '../utils/auth';
import { useTheme } from '../context/ThemeContext';
import type { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const { t, language, setLanguage } = useLanguage();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getErrorMessage = (errorKey: string): string => {
    const errorMessages: Record<string, string> = {
      userNotFound: t.userNotFound,
      incorrectPassword: t.incorrectPassword,
      userDisabled: t.userDisabled,
    };
    return errorMessages[errorKey] || t.loginError;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(getErrorMessage(result.error || ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'he' ? 'en' : 'he');
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--f22-bg)]">
      {/* Language Toggle */}
      <div className="flex justify-end p-4 sm:p-6">
        <button
          onClick={toggleLanguage}
          className="bg-[var(--f22-surface)] text-[var(--f22-text-secondary)] px-5 sm:px-6 py-2.5 sm:py-3 min-h-[44px] rounded-xl hover:bg-[var(--f22-surface-light)] transition-all flex items-center gap-2.5 sm:gap-3 font-semibold text-sm border border-[var(--f22-border)]"
          title={language === 'he' ? 'Switch to English' : 'החלף לעברית'}
        >
          {language === 'he' ? (
            // US Flag
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
            // Israel Flag
            <svg className="w-6 h-6 rounded-sm" viewBox="0 0 36 36">
              <rect fill="#FFFFFF" width="36" height="36"/>
              <rect fill="#0038B8" y="4" width="36" height="5"/>
              <rect fill="#0038B8" y="27" width="36" height="5"/>
              <polygon fill="#0038B8" points="18,10 21.5,17 18,24 14.5,17"/>
              <polygon fill="#FFFFFF" points="18,12 20.5,17 18,22 15.5,17"/>
              <polygon fill="#0038B8" points="18,24 21.5,17 18,10 14.5,17" transform="rotate(180 18 17)"/>
            </svg>
          )}
          {language === 'he' ? 'English' : 'עברית'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-10 md:mb-12">
            <div className="inline-flex items-center justify-center mb-6">
              <img
                src={isDark ? '/Logo_fitness.png' : '/logo_black.png'}
                alt="Fitness22"
                className="h-10 md:h-12 w-auto"
              />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--f22-text)] mb-4 md:mb-5 tracking-tight">{t.appTitle}</h1>
            <p className="text-[var(--f22-text-muted)] text-base md:text-lg">{t.appSubtitle}</p>
          </div>

          {/* Login Card */}
          <div className="bg-[var(--f22-surface)] rounded-2xl shadow-[var(--shadow-lg)] border border-[var(--f22-border)] p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--f22-text)] mb-8 md:mb-10 text-center tracking-tight">
              {t.login}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)] mb-2.5">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-xl px-5 py-3.5 min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all text-[15px]"
                  placeholder={t.enterEmail}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--f22-text-muted)] mb-2.5">
                  {t.password}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[var(--f22-border)] bg-[var(--f22-surface-light)] text-[var(--f22-text)] placeholder-[var(--f22-text-muted)] rounded-xl px-5 py-3.5 min-h-[52px] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/40 focus:border-[#39FF14] transition-all text-[15px]"
                  placeholder={t.enterPassword}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-500/10 text-red-400 px-5 py-3.5 rounded-xl text-sm text-center border border-red-500/20 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#39FF14] text-[#0D0D0D] py-5 min-h-[56px] rounded-xl text-lg font-bold hover:brightness-110 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:transform-none shadow-[var(--shadow-glow-strong)] hover:shadow-[0_0_28px_rgba(57,255,20,0.3)] flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    {t.login}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
