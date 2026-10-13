import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentRoute: 'landing' | 'demo';
  onNavigate: (route: 'landing' | 'demo') => void;
}

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const [open, setOpen] = useState(false);

  const go = (route: 'landing' | 'demo', anchor?: string) => {
    onNavigate(route);
    setOpen(false);
    if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 80);
  };

  return (
    <header className="site-nav">
      <div className="nav-inner">
        <button className="brand" onClick={() => go('landing')} aria-label="Matchday AI home">
          <span className="brand-mark"><span /></span>
          <span>THE 12th MAN<span className="brand-dot">.</span>AI</span>
        </button>

        <nav className="nav-links" aria-label="Main navigation">
          <button onClick={() => go('landing', 'intelligence')}>Intelligence</button>
          <button onClick={() => go('landing', 'how-it-works')}>How it works</button>
          <button className={currentRoute === 'demo' ? 'active' : ''} onClick={() => go('demo')}>The arena</button>
        </nav>

        <button className="nav-cta" onClick={() => go('demo')}>
          Enter arena <ArrowUpRight size={16} />
        </button>
        <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="mobile-menu">
          <button onClick={() => go('landing', 'intelligence')}>Intelligence</button>
          <button onClick={() => go('landing', 'how-it-works')}>How it works</button>
          <button onClick={() => go('demo')}>Enter the arena <ArrowUpRight size={17} /></button>
        </div>
      )}
    </header>
  );
}
