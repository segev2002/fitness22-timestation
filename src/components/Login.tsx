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
      if (result.success && result.user) { onLogin(result.user); }
      else { setError(getErrorMessage(result.error || '')); }
    } finally { setIsLoading(false); }
  };

  const toggleLanguage = () => setLanguage(language === 'he' ? 'en' : 'he');

  return (
    <div className="login-page">
      <div className="login-lang-bar">
        <button onClick={toggleLanguage} className="lang-toggle" title={language === 'he' ? 'Switch to English' : 'החלף לעברית'}>
          {language === 'he' ? (
            <svg style={{ width: 24, height: 24, borderRadius: 2 }} viewBox="0 0 36 36">
              <rect fill="#B22234" width="36" height="36" /><rect fill="#FFFFFF" y="2.77" width="36" height="2.77" /><rect fill="#FFFFFF" y="8.31" width="36" height="2.77" /><rect fill="#FFFFFF" y="13.85" width="36" height="2.77" /><rect fill="#FFFFFF" y="19.38" width="36" height="2.77" /><rect fill="#FFFFFF" y="24.92" width="36" height="2.77" /><rect fill="#FFFFFF" y="30.46" width="36" height="2.77" /><rect fill="#3C3B6E" width="14.4" height="19.38" />
            </svg>
          ) : (
            <svg style={{ width: 24, height: 24, borderRadius: 2 }} viewBox="0 0 36 36">
              <rect fill="#FFFFFF" width="36" height="36" /><rect fill="#0038B8" y="4" width="36" height="5" /><rect fill="#0038B8" y="27" width="36" height="5" /><polygon fill="#0038B8" points="18,10 21.5,17 18,24 14.5,17" /><polygon fill="#FFFFFF" points="18,12 20.5,17 18,22 15.5,17" /><polygon fill="#0038B8" points="18,24 21.5,17 18,10 14.5,17" transform="rotate(180 18 17)" />
            </svg>
          )}
          {language === 'he' ? 'English' : 'עברית'}
        </button>
      </div>

      <div className="login-body">
        <div className="login-wrapper">
          <div className="login-header">
            <img src={isDark ? '/Logo_fitness.png' : '/logo_black.png'} alt="Fitness22" className="login-logo" />
            <h1 className="login-title">{t.appTitle}</h1>
            <p className="login-subtitle">{t.appSubtitle}</p>
          </div>

          <div className="login-card">
            <h2>{t.login}</h2>
            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">{t.email}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder={t.enterEmail} required />
              </div>
              <div className="form-group">
                <label className="form-label">{t.password}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder={t.enterPassword} required />
              </div>
              {error && <div className="error-box">{error}</div>}
              <button type="submit" disabled={isLoading} className="btn-login">
                {isLoading ? (
                  <svg style={{ animation: 'spin 1s linear infinite', width: 20, height: 20 }} viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
