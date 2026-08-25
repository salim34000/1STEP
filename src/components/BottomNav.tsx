import React from 'react';
import { Target, Calendar as CalendarIcon, Wallet, Lightbulb, Compass } from 'lucide-react';
import { motion } from 'motion/react';

export type MainTab = 'goals' | 'agenda' | 'finances' | 'idees' | 'reves';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  scheduledCount?: number;
  ideesCount?: number;
  revesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  scheduledCount,
  ideesCount,
  revesCount,
}) => {
  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Navigation principale"
      className="fixed bottom-4 sm:bottom-5 left-0 right-0 z-30 pointer-events-none flex justify-center px-2 sm:px-3"
    >
      <div className="pointer-events-auto bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-md border border-slate-200/80 dark:border-zinc-800 shadow-xl shadow-slate-900/10 dark:shadow-black/50 rounded-full p-1 sm:p-1.5 flex items-center gap-0.5 sm:gap-1 max-w-full overflow-x-auto no-scrollbar">
        {/* 1. Objectifs Tab */}
        <button
          id="nav-tab-goals"
          type="button"
          onClick={() => onChangeTab('goals')}
          className={`relative flex items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'goals'
              ? 'text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {activeTab === 'goals' && (
            <motion.div
              layoutId="navPill"
              className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <Target className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.5} />
          <span className="relative z-10 tracking-tight sm:tracking-wide text-[11px] sm:text-xs">Objectifs</span>
        </button>

        {/* 2. Agenda Tab */}
        <button
          id="nav-tab-agenda"
          type="button"
          onClick={() => onChangeTab('agenda')}
          className={`relative flex items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'agenda'
              ? 'text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {activeTab === 'agenda' && (
            <motion.div
              layoutId="navPill"
              className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <CalendarIcon className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.5} />
          <span className="relative z-10 tracking-tight sm:tracking-wide text-[11px] sm:text-xs">Agenda</span>
          {scheduledCount !== undefined && scheduledCount > 0 && (
            <span
              className={`relative z-10 text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 rounded-full ${
                activeTab === 'agenda'
                  ? 'bg-white/20 text-white'
                  : 'bg-[#1A237E]/10 dark:bg-indigo-950/80 text-[#1A237E] dark:text-indigo-300'
              }`}
            >
              {scheduledCount}
            </span>
          )}
        </button>

        {/* 3. Finances Tab */}
        <button
          id="nav-tab-finances"
          type="button"
          onClick={() => onChangeTab('finances')}
          className={`relative flex items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'finances'
              ? 'text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {activeTab === 'finances' && (
            <motion.div
              layoutId="navPill"
              className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <Wallet className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.5} />
          <span className="relative z-10 tracking-tight sm:tracking-wide text-[11px] sm:text-xs">Finances</span>
        </button>

        {/* 4. Idées Tab */}
        <button
          id="nav-tab-idees"
          type="button"
          onClick={() => onChangeTab('idees')}
          className={`relative flex items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'idees'
              ? 'text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {activeTab === 'idees' && (
            <motion.div
              layoutId="navPill"
              className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <Lightbulb className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.5} />
          <span className="relative z-10 tracking-tight sm:tracking-wide text-[11px] sm:text-xs">Idées</span>
          {ideesCount !== undefined && ideesCount > 0 && (
            <span
              className={`relative z-10 text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                activeTab === 'idees'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
              }`}
            >
              {ideesCount}
            </span>
          )}
        </button>

        {/* 5. Rêves Tab */}
        <button
          id="nav-tab-reves"
          type="button"
          onClick={() => onChangeTab('reves')}
          className={`relative flex items-center gap-1 sm:gap-1.5 py-2 px-2.5 sm:px-3.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            activeTab === 'reves'
              ? 'text-white'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {activeTab === 'reves' && (
            <motion.div
              layoutId="navPill"
              className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-full shadow-sm"
              transition={{ type: 'spring', stiffness: 450, damping: 35 }}
            />
          )}
          <Compass className="w-4 h-4 relative z-10 shrink-0" strokeWidth={1.5} />
          <span className="relative z-10 tracking-tight sm:tracking-wide text-[11px] sm:text-xs">Rêves</span>
          {revesCount !== undefined && revesCount > 0 && (
            <span
              className={`relative z-10 text-[9px] sm:text-[10px] font-mono px-1 sm:px-1.5 py-0.2 rounded-full hidden sm:inline-block ${
                activeTab === 'reves'
                  ? 'bg-white/20 text-white'
                  : 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
              }`}
            >
              {revesCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};
