import React, { useState } from 'react';
import { Goal } from '../types';
import { GoalCard } from './GoalCard';
import { Plus, CheckCircle, Target, RefreshCw, Trophy, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalListViewProps {
  goals: Goal[];
  onSelectGoal: (goalId: string) => void;
  onCreateGoal: () => void;
  onResetSamples: () => void;
  activeGoalId?: string;
}

export const GoalListView: React.FC<GoalListViewProps> = ({
  goals,
  onSelectGoal,
  onCreateGoal,
  onResetSamples,
  activeGoalId,
}) => {
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [showArchivedSuccesses, setShowArchivedSuccesses] = useState<boolean>(true);

  const activeGoals = goals.filter((g) => {
    const total = g.etapes.length;
    const completed = g.etapes.filter((e) => e.termine).length;
    return total === 0 || completed < total;
  });

  const completedGoals = goals.filter((g) => {
    const total = g.etapes.length;
    const completed = g.etapes.filter((e) => e.termine).length;
    return total > 0 && completed === total;
  });

  return (
    <div id="goal-list-screen" className="max-w-xl mx-auto px-6 py-8 pb-32">
      {/* Intro Greeting */}
      <div className="mb-6 space-y-1">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
          Vue d'ensemble
        </p>
        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Vos objectifs
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Avancez sereinement, une seule étape à la fois.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center p-1 bg-slate-100/70 dark:bg-[#252525] border border-slate-200/50 dark:border-zinc-800 rounded-2xl mb-6 text-xs font-medium text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            filter === 'active'
              ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
              : 'hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          En cours ({activeGoals.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('completed')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            filter === 'completed'
              ? 'bg-white dark:bg-[#1E1E1E] text-[#388E3C] dark:text-emerald-400 font-semibold shadow-xs'
              : 'hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Succès ({completedGoals.length})
        </button>

        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all ${
            filter === 'all'
              ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
              : 'hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Tous ({goals.length})
        </button>
      </div>

      {/* Active Filter Mode: Show active goals + Collapsible Completed Section */}
      {filter === 'active' && (
        <div className="space-y-6">
          {/* Active Goals List */}
          <div className="space-y-3.5">
            <AnimatePresence mode="popLayout">
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isActive={goal.id === activeGoalId}
                  onClick={() => onSelectGoal(goal.id)}
                />
              ))}
            </AnimatePresence>

            {activeGoals.length === 0 && (
              <div className="py-14 px-6 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Aucun objectif actif
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-5 leading-relaxed">
                  Tous vos objectifs sont accomplis ou vous n'avez pas encore défini votre prochaine priorité.
                </p>
                <button
                  type="button"
                  onClick={onCreateGoal}
                  className="py-3 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-medium transition-all inline-flex items-center gap-2 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer un objectif</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Archived Completed Goals (« Succès ») */}
          {completedGoals.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowArchivedSuccesses(!showArchivedSuccesses)}
                className="w-full flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/70 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all mb-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#388E3C]/10 dark:bg-emerald-900/50 flex items-center justify-center text-[#388E3C] dark:text-emerald-400">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Succès & Objectifs accomplis ({completedGoals.length})
                    </span>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                      Historique de vos victoires
                    </p>
                  </div>
                </div>

                <div className="p-1 rounded-lg text-emerald-700 dark:text-emerald-400">
                  {showArchivedSuccesses ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showArchivedSuccesses && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {completedGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        isActive={goal.id === activeGoalId}
                        onClick={() => onSelectGoal(goal.id)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Completed Filter Mode */}
      {filter === 'completed' && (
        <div className="space-y-3.5">
          <AnimatePresence mode="popLayout">
            {completedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isActive={goal.id === activeGoalId}
                onClick={() => onSelectGoal(goal.id)}
              />
            ))}
          </AnimatePresence>

          {completedGoals.length === 0 && (
            <div className="py-14 px-6 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
                Aucun objectif terminé pour le moment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-2 leading-relaxed">
                Validez toutes les étapes d'un objectif pour le voir figurer dans vos succès.
              </p>
            </div>
          )}
        </div>
      )}

      {/* All Filter Mode */}
      {filter === 'all' && (
        <div className="space-y-3.5">
          <AnimatePresence mode="popLayout">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isActive={goal.id === activeGoalId}
                onClick={() => onSelectGoal(goal.id)}
              />
            ))}
          </AnimatePresence>

          {goals.length === 0 && (
            <div className="py-14 px-6 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F5F4] dark:bg-zinc-800 text-[#388E3C] dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
                Aucun objectif créé
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-5 leading-relaxed">
                Créez votre premier objectif et décomposez-le en petites étapes digestes.
              </p>
              <button
                type="button"
                onClick={onCreateGoal}
                className="py-3 px-5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-medium transition-all inline-flex items-center gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Créer un objectif</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Discreet sample reset link */}
      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={onResetSamples}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 uppercase tracking-widest font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recharger les exemples de démonstration</span>
        </button>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 sm:bottom-20 right-6 z-20 pointer-events-none">
        <div className="max-w-xl mx-auto flex justify-end">
          <motion.button
            id="fab-create-goal"
            type="button"
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.04 }}
            onClick={onCreateGoal}
            className="pointer-events-auto flex items-center gap-2.5 py-3.5 px-5 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-[#1A237E]/25 transition-all text-xs font-bold tracking-wide"
            aria-label="Créer un nouvel objectif"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nouvel objectif</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
