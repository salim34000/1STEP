import React from 'react';
import { Goal } from '../types';
import { ChevronRight, CheckCircle2, CircleDashed, Repeat, Bell, Landmark } from 'lucide-react';
import { motion } from 'motion/react';
import { formatReminderDate } from '../utils/notifications';

interface GoalCardProps {
  goal: Goal;
  onClick: () => void;
  isActive?: boolean;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onClick, isActive = false }) => {
  const total = goal.etapes.length;
  const completed = goal.etapes.filter((e) => e.termine).length;
  const isFinished = total > 0 && completed === total;
  const currentStep = goal.etapes.find((e) => !e.termine);
  const currentStepNumber = isFinished ? total : completed + 1;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const isRecurring = goal.recurrence && goal.recurrence !== 'none';
  const recurrenceLabel =
    goal.recurrence === 'daily'
      ? 'Quotidien'
      : goal.recurrence === 'weekly'
      ? 'Hebdo'
      : goal.recurrence === 'monthly'
      ? 'Mensuel'
      : '';

  const activeReminder = currentStep?.reminderAt;

  return (
    <motion.div
      id={`goal-card-${goal.id}`}
      layout
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group relative w-full cursor-pointer rounded-2xl border p-5 transition-all duration-300 overflow-hidden ${
        isActive
          ? 'bg-[#FDFDFD] dark:bg-[#252525] border-slate-200 dark:border-zinc-700 ring-1 ring-[#1A237E]/20 dark:ring-indigo-500/30 shadow-md'
          : isFinished
          ? 'bg-white dark:bg-[#1E1E1E] border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 hover:shadow-xs'
          : 'bg-white dark:bg-[#1E1E1E] border-slate-100 dark:border-zinc-800/80 hover:border-slate-200 dark:hover:border-zinc-700 hover:shadow-md'
      }`}
      style={{ boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.04)' : '0 2px 10px rgba(0,0,0,0.02)' }}
    >
      {/* Left geometric accent line for active items */}
      {isActive && (
        <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A237E] dark:bg-indigo-500"></div>
      )}

      <div className="flex items-start justify-between gap-3 mb-4 pl-1">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {isFinished ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#388E3C]/10 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                Accompli
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400">
                <CircleDashed className="w-3.5 h-3.5" strokeWidth={1.5} />
                En cours
              </span>
            )}

            {isRecurring && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#1A237E]/10 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-400">
                <Repeat className="w-3 h-3" strokeWidth={1.5} />
                {recurrenceLabel}
                {goal.cycleCount ? ` • C${goal.cycleCount + 1}` : ''}
              </span>
            )}

            {goal.linkedDebtId && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/40">
                <Landmark className="w-3 h-3" strokeWidth={1.5} />
                Remboursement
              </span>
            )}

            {activeReminder && !isFinished && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-slate-400"
                title={`Rappel pour l'étape active: ${formatReminderDate(activeReminder)}`}
              >
                <Bell className="w-3 h-3 text-[#1A237E] dark:text-indigo-400" strokeWidth={1.5} />
                {formatReminderDate(activeReminder)}
              </span>
            )}
          </div>

          <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 leading-tight group-hover:text-[#1A237E] dark:group-hover:text-indigo-400 transition-colors">
            {goal.titre}
          </h3>
        </div>

        <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-[#1A237E] dark:group-hover:text-indigo-400 group-hover:bg-slate-50 dark:group-hover:bg-zinc-800 transition-colors shrink-0 mt-1">
          <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </div>

      {/* Progress section */}
      <div className="space-y-2 pt-1 pl-1">
        {/* Fine, fluid gradient progress bar */}
        <div className="w-full h-1 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-[#1A237E] to-[#388E3C] dark:from-indigo-500 dark:to-emerald-400"
          />
        </div>
        
        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
          <span className="truncate mr-2 font-medium">
            {isFinished ? (
              `Toutes les ${total} étapes terminées`
            ) : currentStep ? (
              <span>
                Étape {currentStepNumber} sur {total}
              </span>
            ) : (
              `Étape ${currentStepNumber} sur ${total}`
            )}
          </span>
          <span className="font-mono opacity-60">
            {progressPercent}%
          </span>
        </div>
      </div>
    </motion.div>
  );
};
