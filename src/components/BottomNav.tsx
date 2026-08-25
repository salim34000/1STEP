import React from 'react';
import { Target, Calendar as CalendarIcon, Wallet, Lightbulb, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../utils/audio';

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
  const handleTabClick = (tab: MainTab) => {
    sound.click();
    onChangeTab(tab);
  };

  const tabs: { id: MainTab; label: string; icon: React.FC<{ className?: string; strokeWidth?: number }>; badge?: number; badgeColor?: string }[] = [
    { id: 'goals', label: 'Objectifs', icon: Target },
    { id: 'agenda', label: 'Agenda', icon: CalendarIcon, badge: scheduledCount },
    { id: 'finances', label: 'Finances', icon: Wallet },
    { id: 'idees', label: 'Idées', icon: Lightbulb, badge: ideesCount, badgeColor: 'amber' },
    { id: 'reves', label: 'Rêves', icon: Compass, badge: revesCount, badgeColor: 'purple' },
  ];

  return (
    <nav
      id="bottom-navigation-bar"
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 select-none"
    >
      <div className="pointer-events-auto bg-white/85 dark:bg-[#1A1A1A]/85 backdrop-blur-2xl border border-slate-200/70 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)] rounded-full p-1.5 flex items-center gap-1 max-w-full overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <motion.button
              key={tab.id}
              id={`nav-tab-${tab.id}`}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleTabClick(tab.id)}
              className={`relative flex items-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-full text-xs font-semibold transition-colors duration-200 focus:outline-none ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 active:text-slate-800'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="navActivePill"
                  className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}

              <Icon className="w-4 h-4 relative z-10 shrink-0" strokeWidth={isActive ? 2 : 1.75} />
              <span className="relative z-10 tracking-tight sm:tracking-wide text-[11px] sm:text-xs">
                {tab.label}
              </span>

              {tab.badge !== undefined && tab.badge > 0 && (
                <span
                  className={`relative z-10 text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded-full transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badgeColor === 'amber'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                      : tab.badgeColor === 'purple'
                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                      : 'bg-[#1A237E]/10 dark:bg-indigo-950/80 text-[#1A237E] dark:text-indigo-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
