import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './pages/LandingPage';
import { ArenaPage } from './pages/ArenaPage';

// Robust Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("The 12th Man Caught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080B10] text-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 mb-4">
            ⚠️
          </div>
          <h2 className="text-2xl font-black text-white">Something went wrong</h2>
          <p className="text-xs text-[#94A3B8] max-w-md mt-2 font-mono bg-[#131B25] p-3 rounded-lg border border-[#293241]">
            {this.state.error?.message || "Unknown rendering exception"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = '/';
            }}
            className="mt-6 px-6 py-2.5 rounded-xl bg-[#35E58B] text-[#080B10] font-bold text-sm"
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const checkIsDemoRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();

  // Check redirect query param from 404 fallback
  try {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect')?.toLowerCase();
    if (redirectParam && (redirectParam.includes('demo') || redirectParam === '/demo')) {
      return true;
    }
  } catch { }

  return path === '/demo' || path.endsWith('/demo') || hash === '#demo' || hash === '#/demo' || hash.includes('demo');
};

export function App() {
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'demo'>(() => {
    return checkIsDemoRoute() ? 'demo' : 'landing';
  });

  // Listen to browser forward/backward buttons and hash changes
  useEffect(() => {
    const syncRoute = () => {
      const isDemo = checkIsDemoRoute();
      setCurrentRoute(isDemo ? 'demo' : 'landing');

      // Clean up ?redirect=/demo to /demo if applicable
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('redirect')) {
          window.history.replaceState({}, '', isDemo ? '/demo' : '/');
        }
      } catch { }
    };

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  const navigateTo = (route: 'landing' | 'demo') => {
    setCurrentRoute(route);
    const path = route === 'demo' ? '/demo' : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen">
        <Navbar currentRoute={currentRoute} onNavigate={navigateTo} />
        <main>
          {currentRoute === 'landing' ? (
            <LandingPage onGoToDemo={() => navigateTo('demo')} />
          ) : (
            <ArenaPage />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;
