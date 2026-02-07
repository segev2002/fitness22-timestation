import { useState, useEffect } from 'react';
import type { User, ViewType } from './types';
import { getCurrentUser, logoutUser, setCurrentUser, isUserAdmin, validateSessionAsync, migrateLocalUsersToSupabase, syncUsersFromSupabase } from './utils/auth';
import Login from './components/Login';
import Header from './components/Header';
import Home from './components/Home';
import EditActivity from './components/EditActivity';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import ExpenseReportPage from './components/ExpenseReportPage';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      try { await syncUsersFromSupabase(); } catch (e) { console.debug('User sync from Supabase failed:', e); }
      try { await migrateLocalUsersToSupabase(); } catch (e) { console.debug('User migration skipped or failed:', e); }

      const existingUser = getCurrentUser();
      if (!existingUser) { setIsLoading(false); return; }
      setUser(existingUser);

      try {
        const validatedUser = await validateSessionAsync();
        if (!validatedUser) {
          console.warn('Session validation failed - logging out');
          setUser(null);
          setCurrentView('home');
        } else {
          setUser(validatedUser);
          if (currentView === 'admin' && !isUserAdmin(validatedUser)) {
            console.warn('User is no longer admin - redirecting to home');
            setCurrentView('home');
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
      setIsLoading(false);
    };
    validateSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView('home');
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentView('home');
  };

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        const validatedUser = await validateSessionAsync();
        if (!validatedUser) { setUser(null); setCurrentView('home'); }
        else if (validatedUser.id !== user.id) { console.warn('User mismatch detected - reloading'); window.location.reload(); }
        else { setUser(validatedUser); }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const handleViewChange = (view: ViewType) => {
    if (view === 'admin' && user && !isUserAdmin(user)) return;
    setCurrentView(view);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleShiftsUpdated = () => {};

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        user={user}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {currentView === 'home' && <Home user={user} />}
        {currentView === 'edit-activity' && <EditActivity user={user} onShiftsUpdated={handleShiftsUpdated} />}
        {currentView === 'profile' && <Profile user={user} onUserUpdate={handleUserUpdate} />}
        {currentView === 'expenses' && <ExpenseReportPage user={user} />}
        {currentView === 'admin' && isUserAdmin(user) ? <AdminDashboard user={user} /> : currentView === 'admin' ? <Home user={user} /> : null}
      </main>
    </div>
  );
}

export default App;
