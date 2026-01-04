
import React, { useEffect, useState } from 'react';
import ReadingScreen from './components/ReadingScreen';
import { AuthScreen } from './components/AuthScreen';
import { UsageDashboard } from './components/UsageDashboard';
import { getHealth, ApiClientError, getBaseUrl } from './services/api';
import { isAuthenticated, getAuthUser, clearAuth } from './services/auth';
import { logout } from './services/api';

const App: React.FC = () => {
  // Check auth mode from environment
  const env = (import.meta as any).env;
  const authMode = env.VITE_AUTH_MODE || 'guest'; // Default to guest for development
  const isGuestMode = authMode === 'guest';

  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'error' | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(isGuestMode ? true : isAuthenticated());
  const [showDashboard, setShowDashboard] = useState(false);
  const [user, setUser] = useState(getAuthUser());

  useEffect(() => {
    // Health check on app start
    const checkHealth = async () => {
      try {
        setApiStatus('checking');
        const response = await getHealth();
        if (response.ok) {
          setApiStatus('connected');
          setApiError(null);
          console.log('✅ API CONNECTED', { ok: true });
        } else {
          setApiStatus('error');
          setApiError('Health check returned unexpected response');
        }
      } catch (error) {
        setApiStatus('error');
        const errorMessage = error instanceof ApiClientError 
          ? error.message 
          : (error instanceof Error ? error.message : 'Failed to connect to API');
        setApiError(errorMessage);
      }
    };

    checkHealth();
  }, []);

  const handleAuthSuccess = () => {
    setAuthenticated(true);
    setUser(getAuthUser());
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuth();
      setAuthenticated(false);
      setUser(null);
      setShowDashboard(false);
    }
  };

  // Show auth screen if not authenticated (skip in guest mode)
  if (!authenticated && !isGuestMode) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Dev-only env debug info
  const isDev = env.DEV ?? false;
  // Use getBaseUrl() to get the actual API URL (auto-detected in dev, from env in prod)
  const apiUrl = (() => {
    try {
      return getBaseUrl();
    } catch (err) {
      return 'ERROR';
    }
  })();
  const apiKey = env.VITE_API_KEY || '';
  const apiKeyPresent = !!(apiKey && apiKey.trim().length > 0);

  // Dev-only: log env keys once
  useEffect(() => {
    if (isDev) {
      console.log('DEV: import.meta.env keys:', Object.keys(env));
      console.log('DEV: window.location.href:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    }
  }, [isDev, env]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* API Status Banner */}
      {apiStatus === 'checking' && (
        <div className="fixed top-0 left-0 w-full z-[200] bg-blue-50 border-b border-blue-200 px-6 py-2 flex justify-center items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-blue-800 text-[10px] font-bold uppercase tracking-widest text-center">Checking API connection...</span>
        </div>
      )}
      {apiStatus === 'connected' && (
        <div className="fixed top-0 left-0 w-full z-[200] bg-green-50 border-b border-green-200 px-6 py-2 flex justify-center items-center gap-3">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-green-800 text-[10px] font-bold uppercase tracking-widest text-center">API Connected</span>
        </div>
      )}
      {apiStatus === 'error' && (
        <div className="fixed top-0 left-0 w-full z-[200] bg-red-50 border-b border-red-200 px-6 py-2 flex justify-center items-center gap-3">
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-800 text-[10px] font-bold uppercase tracking-widest text-center">
            ❌ API Connection Error: {apiError || 'Connection failed'}
          </span>
        </div>
      )}
      
      {/* Dev-only env debug UI */}
      {isDev && (
        <div className="fixed bottom-0 left-0 w-full z-[150] bg-gray-900 text-gray-100 px-4 py-1 text-[10px] font-mono flex items-center justify-center gap-4 border-t border-gray-700">
          <span>API_URL: <span className={apiUrl === 'ERROR' ? 'text-red-400' : 'text-green-400'}>{apiUrl}</span></span>
          <span>API_KEY: <span className={apiKeyPresent ? 'text-green-400' : 'text-red-400'}>{apiKeyPresent ? 'PRESENT' : 'MISSING'}</span></span>
        </div>
      )}

      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Zaban TTS</h1>
          {isGuestMode ? (
            <span className="text-sm text-gray-600">Guest Mode</span>
          ) : user ? (
            <span className="text-sm text-gray-600">
              {user.email} ({user.plan})
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {!isGuestMode && (
            <>
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                {showDashboard ? 'Reading' : 'Dashboard'}
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!isGuestMode && showDashboard ? (
        <div className="container mx-auto px-4 py-6">
          <UsageDashboard />
        </div>
      ) : (
        <ReadingScreen />
      )}
    </div>
  );
};

export default App;
