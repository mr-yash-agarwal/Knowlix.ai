import React from 'react';
import { Logo } from './Logo';
import { Cpu, ShieldCheck, BookOpen } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="about" className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Logo size="md" />
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
              Knowlix AI is an open-source personalized learning platform that transforms photos of handwritten notes, textbook pages, and diagrams into interactive revision packs.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://github.com/shubh/knowlix-ai"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition flex items-center gap-2 text-xs font-semibold"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                <span>GitHub Repository</span>
              </a>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Apache 2.0 Open Source
              </span>
            </div>
          </div>

          {/* Col 2: Core Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              Open-Weight AI Stack
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>Qwen2-VL-7B-Instruct</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>LLaVA-1.6 Vision Pipeline</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Server-Side Trusted Answer Key</span>
              </li>
              <li className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>SQLite Persistent Storage</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Hackathon & Category */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              Event & Compliance
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Hacktoberfest Hack Day Lucknow 2026.
              <br />
              Category: <strong className="text-slate-800 dark:text-slate-200">Open-Source AI Project</strong>.
              <br />
              Complies with strict no-proprietary closed API mandate. Open model weight license verified.
            </p>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 Knowlix AI. Released under the Apache 2.0 License.</p>
          <p className="flex items-center gap-1">
            Built for scholars with passion &amp; open-weight AI.
          </p>
        </div>
      </div>
    </footer>
  );
};
