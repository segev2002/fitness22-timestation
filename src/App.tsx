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

  // SECURITY: Check and validate existing user session on mount
  useEffect(() => {
    const validateSession = async () => {
      // First, sync users from Supabase to ensure we have all users locally
      // This is critical for cross-device functionality
      try {
        await syncUsersFromSupabase();
      } catch (e) {
        console.debug('User sync from Supabase failed:', e);
      }
      
      // Try to migrate any localStorage users into Supabase (one-time convenience)
      try {
        await migrateLocalUsersToSupabase();
      } catch (e) {
        console.debug('User migration skipped or failed:', e);
      }
      
      // First, do synchronous check for immediate UI
      const existingUser = getCurrentUser();
      
      if (!existingUser) {
        setIsLoading(false);
        return;
      }
      
      // Set user immediately for UI responsiveness
      setUser(existingUser);
      
      // SECURITY: Then validate asynchronously against database
      try {
        const validatedUser = await validateSessionAsync();
        
        if (!validatedUser) {
          // Session invalid - force logout
          console.warn('Session validation failed - logging out');
          setUser(null);
          setCurrentView('home');
        } else {
          // Update with validated user data (especially fresh isAdmin status)
          setUser(validatedUser);
          
          // SECURITY: If current view is admin but user is no longer admin, redirect
          if (currentView === 'admin' && !isUserAdmin(validatedUser)) {
            console.warn('User is no longer admin - redirecting to home');
            setCurrentView('home');
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
        // On validation error, keep the local user but mark as not validated
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

  // SECURITY: Re-validate session periodically and on visibility change
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        // Re-validate when tab becomes visible (e.g., user switched back)
        const validatedUser = await validateSessionAsync();
        if (!validatedUser) {
          // Session invalid
          setUser(null);
          setCurrentView('home');
        } else if (validatedUser.id !== user.id) {
          // SECURITY: Different user - force refresh
          console.warn('User mismatch detected - reloading');
          window.location.reload();
        } else {
          // Update with fresh data
          setUser(validatedUser);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  const handleViewChange = (view: ViewType) => {
    // SECURITY: Prevent non-admin users from accessing admin view
    if (view === 'admin' && user && !isUserAdmin(user)) {
      return;
    }
    setCurrentView(view);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleShiftsUpdated = () => {
    // This will trigger re-render in child components that need to reload shifts
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  // Show login if no user
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Main app with header and content
  return (
    <div className="min-h-screen w-full flex flex-col overflow-x-hidden">
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        user={user}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 w-full">
        {currentView === 'home' && <Home user={user} />}
        {currentView === 'edit-activity' && (
          <EditActivity user={user} onShiftsUpdated={handleShiftsUpdated} />
        )}
        {currentView === 'profile' && (
          <Profile user={user} onUserUpdate={handleUserUpdate} />
        )}
        {currentView === 'expenses' && (
          <ExpenseReportPage user={user} />
        )}
        {currentView === 'admin' && isUserAdmin(user) ? (
          <AdminDashboard user={user} />
        ) : currentView === 'admin' ? (
          // Redirect non-admin trying to access admin to home
          <Home user={user} />
        ) : null}
      </main>
    </div>
  );
}

export default App;
