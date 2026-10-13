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
    console.error("Matchup AI Caught Error:", error, errorInfo);
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

export function App() {
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'demo'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/demo') {
      return 'demo';
    }
    return 'landing';
  });

  // Listen to browser forward/backward buttons
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/demo') {
        setCurrentRoute('demo');
      } else {
        setCurrentRoute('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
