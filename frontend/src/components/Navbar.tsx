import React from 'react';
import { Logo } from './Logo';
import { Sparkles, Moon, Sun, Cpu, Layers, User as UserIcon, LogOut, BookOpen, HelpCircle, ShieldCheck } from 'lucide-react';
import { HealthStatus, User } from '../types';

interface NavbarProps {
  activeView: 'landing' | 'dashboard' | 'workspace' | 'admin';
  onNavigate: (view: 'landing' | 'dashboard' | 'admin') => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  health: HealthStatus | null;
  user?: User | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onOpenAdminPanel?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onNavigate,
  isDarkMode,
  onToggleTheme,
  health,
  user,
  onOpenAuth,
  onSignOut,
  onOpenAdminPanel,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo and Brand */}
        <button
          onClick={() => onNavigate('landing')}
          className="text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg p-1 transition cursor-pointer"
        >
          <Logo size="md" />
        </button>

        {/* Navigation items for desktop */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            onClick={() => onNavigate('landing')}
            className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer ${
              activeView === 'landing' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            Home
          </button>
          <a
            href="#features"
            onClick={(e) => {
              if (activeView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => {
              if (activeView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            How It Works
          </a>
          <a
            href="#explore-notes"
            onClick={(e) => {
              if (activeView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('explore-notes')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            Explore Notes
          </a>
          <a
            href="#faqs"
            onClick={(e) => {
              if (activeView !== 'landing') {
                e.preventDefault();
                onNavigate('landing');
                setTimeout(() => {
                  document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }
            }}
            className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
          >
            FAQs
          </a>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer ${
              activeView === 'dashboard' ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : ''
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            Dashboard
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => onNavigate('admin')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer font-semibold ${
                activeView === 'admin' ? 'bg-emerald-100/70 dark:bg-emerald-900/40 ring-1 ring-emerald-500/40' : ''
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Admin Panel</span>
            </button>
          )}
        </nav>

        {/* Right Action buttons */}
        <div className="flex items-center gap-3">
          {/* Gemma 4 AI status badge */}
          <div
            title={`Active Model: ${health?.model_name || 'gemma-4-31b-it'} (Gemini API / ${health?.model_license || 'Gemma Open License'})`}
            className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50/80 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gemma 4 Active</span>
          </div>

          {/* GitHub link */}
          <a
            href="https://github.com/shubh/knowlix-ai"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="View on GitHub"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>

          {/* Dark Mode toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition focus:outline-none cursor-pointer"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
          </button>

          {/* Auth Button or User Badge */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[100px]">{user.name}</span>
              </div>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuth && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )
          )}

          {/* Primary CTA */}
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-md shadow-indigo-500/20 active:scale-95 transition transform duration-150 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Learning</span>
          </button>
        </div>
      </div>
    </header>
  );
};
