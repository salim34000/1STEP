import React, { useState } from 'react';
import { Goal, Step, Reve } from '../types';
import {
  Check,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Edit3,
  Trash2,
  Sparkles,
  Award,
  ArrowRight,
  Repeat,
  Bell,
  Calendar,
  X,
  Landmark,
  Compass,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { sound } from '../utils/audio';
import {
  formatReminderDate,
  requestNotificationPermission,
} from '../utils/notifications';
import { resetRecurringGoal } from '../utils/storage';
import {
  formatPlannedDateFriendly,
  formatPlannedDateWithTime,
  getTodayISO,
  formatISODate,
} from '../utils/dateUtils';

interface GoalDetailViewProps {
  goal: Goal;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onEditGoal: (goalId: string) => void;
  onBack: () => void;
  dreams?: Reve[];
  onSelectDream?: (dreamId: string) => void;
}

export const GoalDetailView: React.FC<GoalDetailViewProps> = ({
  goal,
  onUpdateGoal,
  onDeleteGoal,
  onEditGoal,
  onBack,
  dreams = [],
  onSelectDream,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderInput, setReminderInput] = useState('');
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [recurringCelebration, setRecurringCelebration] = useState<{
    completedCycle: number;
    recurrenceLabel: string;
  } | null>(null);

  const isRecurring = goal.recurrence && goal.recurrence !== 'none';
  const recurrenceLabel =
    goal.recurrence === 'daily'
      ? 'Quotidien'
      : goal.recurrence === 'weekly'
      ? 'Hebdomadaire'
      : goal.recurrence === 'monthly'
      ? 'Mensuel'
      : '';

  const sortedSteps = [...goal.etapes].sort((a, b) => a.ordre - b.ordre);
  const completedSteps = sortedSteps.filter((s) => s.termine);
  const currentStep = sortedSteps.find((s) => !s.termine);
  const isGoalFinished = sortedSteps.length > 0 && !currentStep;

  const totalSteps = sortedSteps.length;
  const currentStepIndex = currentStep
    ? sortedSteps.findIndex((s) => s.id === currentStep.id) + 1
    : totalSteps;

  const handleValidateStep = (step: Step) => {
    if (isCompleting) return;
    setIsCompleting(true);

    sound.playStepDone();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }

    const remainingAfterThis = sortedSteps.filter((s) => !s.termine && s.id !== step.id);
    const willBeFinished = remainingAfterThis.length === 0;

    // Soft particle explosion around the button
    const btnPos = document.getElementById('btn-validate-step')?.getBoundingClientRect();
    if (btnPos) {
      const x = (btnPos.left + btnPos.width / 2) / window.innerWidth;
      const y = (btnPos.top + btnPos.height / 2) / window.innerHeight;
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { x, y },
        colors: ['#1A237E', '#388E3C', '#E8EAF6', '#E8F5E9'],
        ticks: 100,
        gravity: 0.8,
        scalar: 0.7,
      });
    }

    setTimeout(() => {
      if (willBeFinished && isRecurring) {
        sound.playGoalComplete();
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.65 },
          colors: ['#1A237E', '#388E3C', '#E8EAF6', '#E8F5E9'],
        });

        const newCycleCount = (goal.cycleCount || 0) + 1;
        const resetGoal = resetRecurringGoal({
          ...goal,
          etapes: goal.etapes.map((s) =>
            s.id === step.id ? { ...s, termine: true, completedAt: Date.now() } : s
          ),
        });

        onUpdateGoal(resetGoal);
        setIsCompleting(false);

        setRecurringCelebration({
          completedCycle: newCycleCount,
          recurrenceLabel,
        });

        setTimeout(() => {
          setRecurringCelebration(null);
        }, 6000);
      } else {
        const updatedSteps = goal.etapes.map((s) =>
          s.id === step.id ? { ...s, termine: true, completedAt: Date.now() } : s
        );

        const updatedGoal: Goal = {
          ...goal,
          etapes: updatedSteps,
          completedAt: willBeFinished ? Date.now() : undefined,
        };

        onUpdateGoal(updatedGoal);
        setIsCompleting(false);

        if (willBeFinished) {
          sound.playGoalComplete();
          confetti({
            particleCount: 55,
            spread: 60,
            origin: { y: 0.65 },
            colors: ['#1A237E', '#388E3C', '#E8EAF6', '#E8F5E9'],
          });
        }
      }
    }, 400);
  };

  const handleUndoStep = (stepId: string) => {
    const updatedSteps = goal.etapes.map((s) =>
      s.id === stepId ? { ...s, termine: false, completedAt: undefined } : s
    );
    onUpdateGoal({
      ...goal,
      etapes: updatedSteps,
      completedAt: undefined,
    });
  };

  const handleResetAllSteps = () => {
    const updatedSteps = goal.etapes.map((s) => ({
      ...s,
      termine: false,
      completedAt: undefined,
      reminderNotified: false,
    }));
    onUpdateGoal({
      ...goal,
      etapes: updatedSteps,
      completedAt: undefined,
    });
  };

  const handleSaveStepReminder = async (reminderDate: string | undefined) => {
    if (!currentStep) return;
    if (reminderDate) {
      await requestNotificationPermission();
    }

    const updatedSteps = goal.etapes.map((s) =>
      s.id === currentStep.id
        ? {
            ...s,
            reminderAt: reminderDate || undefined,
            reminderNotified: false,
          }
        : s
    );

    onUpdateGoal({
      ...goal,
      etapes: updatedSteps,
    });
    setShowReminderModal(false);
  };

  const handleSaveStepDate = (plannedDate: string | null, plannedTime?: string | null) => {
    if (!currentStep) return;
    const updatedSteps = goal.etapes.map((s) =>
      s.id === currentStep.id
        ? {
            ...s,
            datePlanifiee: plannedDate || null,
            heurePlanifiee: plannedDate ? (plannedTime?.trim() || null) : null,
          }
        : s
    );

    onUpdateGoal({
      ...goal,
      etapes: updatedSteps,
    });
    setShowDateModal(false);
  };

  const setPresetDate = (hoursFromNow: number): string => {
    const d = new Date(Date.now() + hoursFromNow * 3600000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = '00';
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div
      id="goal-detail-screen"
      className="max-w-xl mx-auto px-6 py-8 flex flex-col min-h-[calc(100vh-80px)] justify-between"
    >
      <AnimatePresence>
        {recurringCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="mb-6 p-4 rounded-2xl bg-[#E8F5E9] dark:bg-emerald-950/40 border border-[#388E3C]/30 dark:border-emerald-800 text-slate-800 dark:text-slate-100 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#388E3C] dark:bg-emerald-500" />
            <div className="flex items-start justify-between gap-3 pl-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E1E1E] text-[#388E3C] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
                  <Sparkles className="w-5 h-5 text-[#388E3C] dark:text-emerald-400" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#388E3C] dark:text-emerald-400 uppercase tracking-[0.1em]">
                    🎉 Cycle {recurringCelebration.recurrenceLabel} #{recurringCelebration.completedCycle} validé !
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    L'objectif s'est réinitialisé automatiquement pour le prochain cycle et repart de la 1ère étape.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRecurringCelebration(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-[0.15em] font-semibold mb-2 flex-wrap">
            <span>Objectif</span>
            <span>/</span>
            <span className="text-[#1A237E] dark:text-indigo-400 font-medium">Un Pas</span>
            {isRecurring && (
              <>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span className="inline-flex items-center gap-1 text-[#1A237E] dark:text-indigo-300 bg-[#1A237E]/5 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                  <Repeat className="w-2.5 h-2.5" strokeWidth={1.5} />
                  {recurrenceLabel}
                  {goal.cycleCount ? ` • Cycle #${goal.cycleCount + 1}` : ''}
                </span>
              </>
            )}
            {goal.linkedDebtId && (
              <>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-amber-200/50 dark:border-amber-800/40">
                  <Landmark className="w-2.5 h-2.5" strokeWidth={1.5} />
                  Dette liée
                </span>
              </>
            )}
            {goal.linkedDreamId && (
              <>
                <span className="text-slate-300 dark:text-zinc-700">•</span>
                <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-purple-200/50 dark:border-purple-800/40">
                  <Compass className="w-2.5 h-2.5" strokeWidth={1.5} />
                  Rêve associé
                </span>
              </>
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight max-w-md mx-auto text-balance">
            {goal.titre}
          </h2>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            id="btn-edit-goal"
            type="button"
            onClick={() => onEditGoal(goal.id)}
            aria-label="Modifier les étapes de l'objectif"
            title="Modifier l'objectif"
            className="p-2.5 rounded-xl text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Edit3 className="w-4 h-4" strokeWidth={1.5} />
          </button>
          <button
            id="btn-delete-goal-prompt"
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            aria-label="Supprimer cet objectif"
            title="Supprimer l'objectif"
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="my-auto py-10 flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {currentStep ? (
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg flex flex-col items-center"
            >
              {/* Large Step Card */}
              <div 
                className="w-full bg-[#FDFDFD] dark:bg-[#1E1E1E] border border-slate-100 dark:border-zinc-800 rounded-[32px] sm:rounded-[40px] p-8 sm:p-14 mb-8 relative text-center flex flex-col items-center shadow-lg dark:shadow-black/40 transition-colors"
              >
                <div className="flex items-center justify-center gap-2 mb-6">
                  {currentStep.reminderAt ? (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderInput(currentStep.reminderAt || '');
                        setShowReminderModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A237E]/5 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 rounded-xl text-xs font-semibold hover:bg-[#1A237E]/10 transition-colors"
                      title="Modifier l'heure du rappel"
                    >
                      <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>{formatReminderDate(currentStep.reminderAt)}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReminderInput(setPresetDate(2));
                        setShowReminderModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 hover:text-[#1A237E] dark:hover:text-indigo-400 py-1.5 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-medium uppercase tracking-wider"
                    >
                      <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Ajouter un rappel</span>
                    </button>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-medium text-slate-800 dark:text-slate-100 leading-snug max-w-sm mx-auto text-balance font-serif">
                  {currentStep.texte}
                </h3>

                {/* Scheduling Badge / Button directly under active step */}
                <div className="mt-5 flex items-center justify-center">
                  {currentStep.datePlanifiee ? (
                    <div className="inline-flex items-center gap-1.5 p-1 pl-3 pr-2 rounded-full bg-[#1A237E]/5 dark:bg-indigo-950/60 border border-[#1A237E]/10 dark:border-indigo-800/40 text-xs font-semibold text-[#1A237E] dark:text-indigo-300 shadow-2xs group transition-colors">
                      <Calendar className="w-3.5 h-3.5 text-[#1A237E] dark:text-indigo-400 shrink-0" strokeWidth={1.5} />
                      <button
                        type="button"
                        id="btn-edit-step-date"
                        onClick={() => {
                          setDateInput(currentStep.datePlanifiee || getTodayISO());
                          setTimeInput(currentStep.heurePlanifiee || '');
                          setShowDateModal(true);
                        }}
                        className="hover:underline text-left cursor-pointer"
                        title="Modifier la date et l'heure prévues"
                      >
                        {formatPlannedDateWithTime(currentStep.datePlanifiee, currentStep.heurePlanifiee)}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveStepDate(null, null)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-0.5"
                        title="Supprimer la planification"
                        aria-label="Supprimer la date planifiée"
                      >
                        <X className="w-3 h-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      id="btn-plan-step"
                      type="button"
                      onClick={() => {
                        setDateInput(getTodayISO());
                        setTimeInput('');
                        setShowDateModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-300 py-1.5 px-3.5 rounded-full border border-slate-200/80 dark:border-zinc-700 hover:border-[#1A237E]/30 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors font-medium tracking-wide"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-[#1A237E]" strokeWidth={1.5} />
                      <span>Planifier (Date & Heure)</span>
                    </button>
                  )}
                </div>
                
                <div className="mt-7 text-xs font-medium text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em]">
                  Étape {currentStepIndex} / {totalSteps}
                </div>
              </div>

              {/* Large validation button */}
              <motion.button
                id="btn-validate-step"
                type="button"
                whileTap={{ scale: 0.96 }}
                disabled={isCompleting}
                onClick={() => handleValidateStep(currentStep)}
                className="group relative overflow-hidden flex items-center justify-center gap-3 w-full max-w-xs py-5 rounded-2xl bg-[#1A237E] dark:bg-indigo-600 text-white shadow-lg focus:outline-none transition-all duration-500 hover:shadow-xl hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[#1A237E] to-[#388E3C] dark:from-indigo-600 dark:to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10 flex items-center gap-3">
                  <motion.div
                    animate={isCompleting ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Check className="w-6 h-6 stroke-[2]" />
                  </motion.div>
                  <span className="text-sm font-bold uppercase tracking-[0.15em]">
                    {isCompleting ? 'Validé' : 'Terminé'}
                  </span>
                </div>
              </motion.button>
            </motion.div>
          ) : isGoalFinished ? (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-lg bg-[#FDFDFD] dark:bg-[#1E1E1E] border border-slate-100 dark:border-zinc-800 rounded-[32px] sm:rounded-[40px] p-8 sm:p-14 relative text-center flex flex-col items-center shadow-lg dark:shadow-black/40"
            >
              <div className="w-20 h-20 rounded-full bg-[#388E3C]/10 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 flex items-center justify-center mb-6 shadow-xs">
                <Award className="w-10 h-10" strokeWidth={1.5} />
              </div>

              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold bg-[#388E3C]/10 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 mb-4 tracking-[0.15em] uppercase">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                Bravo
              </span>

              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-4">
                Objectif accompli
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-xs mx-auto leading-relaxed">
                Toutes les {totalSteps} étapes de cet objectif ont été validées avec succès.
              </p>

              <div className="w-full flex flex-col gap-3 max-w-xs mx-auto">
                <button
                  id="btn-back-home"
                  type="button"
                  onClick={onBack}
                  className="w-full py-4 px-5 bg-gradient-to-r from-[#1A237E] to-[#283593] dark:from-indigo-600 dark:to-indigo-700 text-white rounded-2xl font-medium text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  <span>Retour aux objectifs</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <button
                  id="btn-reset-goal"
                  type="button"
                  onClick={handleResetAllSteps}
                  className="w-full py-4 px-5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-2xl font-medium text-sm transition-colors flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
                  <span>Recommencer</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="w-full max-w-md bg-[#FDFDFD] dark:bg-[#1E1E1E] border border-slate-100 dark:border-zinc-800 rounded-[32px] p-10 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Cet objectif ne contient pas encore d'étapes.
              </p>
              <button
                type="button"
                onClick={() => onEditGoal(goal.id)}
                className="py-3 px-6 bg-[#1A237E] dark:bg-indigo-600 text-white rounded-2xl text-sm font-medium hover:bg-[#283593] dark:hover:bg-indigo-700 shadow-md"
              >
                Ajouter des étapes
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Section: History */}
      <div className="w-full max-w-lg mx-auto space-y-4 pt-4">
        {completedSteps.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-4">
              <button
                id="btn-toggle-history"
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-[#1A237E] dark:hover:text-indigo-400 transition-colors text-xs font-medium py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800"
              >
                <span>Historique ({completedSteps.length})</span>
                {showHistory ? (
                  <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
              </button>

              <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-zinc-700"></div>

              <button
                id="btn-undo-last-step"
                type="button"
                onClick={() => handleUndoStep(completedSteps[completedSteps.length - 1].id)}
                className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors text-xs font-medium py-2 px-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
                <span>Annuler la dernière</span>
              </button>
            </div>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-full mt-4 relative"
                >
                  <div className="absolute left-[11px] top-4 bottom-4 w-[1px] bg-slate-200 dark:bg-zinc-700"></div>
                  <div className="space-y-3 relative">
                    {completedSteps.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-start gap-4 p-2"
                      >
                        <div className="relative z-10 w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5 border-2 border-white dark:border-[#1E1E1E]">
                          <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" strokeWidth={2} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-through decoration-slate-300 dark:decoration-zinc-600">
                            {step.texte}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUndoStep(step.id)}
                          title="Restaurer cette étape"
                          className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-[#1A237E] dark:hover:text-indigo-400 uppercase tracking-[0.1em] font-bold shrink-0 py-1 px-2 hover:bg-slate-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                          Restaurer
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex justify-center pt-6">
          <button
            id="btn-back-to-list-bottom"
            type="button"
            onClick={onBack}
            className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 py-2 px-4 transition-colors uppercase tracking-[0.1em] font-semibold"
          >
            ← Retour à l'accueil
          </button>
        </div>
      </div>

      {/* Date Planning Modal for Active Step */}
      <AnimatePresence>
        {showDateModal && currentStep && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowDateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A237E] dark:bg-indigo-500" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  <Calendar className="w-4 h-4 text-[#1A237E] dark:text-indigo-400" strokeWidth={1.5} />
                  <span>Planifier l'étape</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDateModal(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium">
                {currentStep.texte}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Date prévue
                  </label>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDateInput(getTodayISO())}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 hover:text-[#1A237E] dark:hover:text-indigo-300 transition-colors"
                  >
                    Aujourd'hui
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tom = new Date();
                      tom.setDate(tom.getDate() + 1);
                      setDateInput(formatISODate(tom));
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 hover:text-[#1A237E] dark:hover:text-indigo-300 transition-colors"
                  >
                    Demain
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const in2Days = new Date();
                      in2Days.setDate(in2Days.getDate() + 2);
                      setDateInput(formatISODate(in2Days));
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 hover:text-[#1A237E] dark:hover:text-indigo-300 transition-colors"
                  >
                    Dans 2 jours
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Heure précise (optionnelle)
                    </label>
                    {timeInput && (
                      <button
                        type="button"
                        onClick={() => setTimeInput('')}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-medium"
                      >
                        Effacer l'heure
                      </button>
                    )}
                  </div>
                  <input
                    type="time"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTimeInput('09:00')}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:border-[#1A237E] transition-colors"
                  >
                    Matin (09h00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeInput('14:00')}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:border-[#1A237E] transition-colors"
                  >
                    Après-midi (14h00)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeInput('18:00')}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:border-[#1A237E] transition-colors"
                  >
                    Soirée (18h00)
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  {currentStep.datePlanifiee && (
                    <button
                      type="button"
                      onClick={() => handleSaveStepDate(null, null)}
                      className="py-3 px-4 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveStepDate(dateInput, timeInput)}
                    disabled={!dateInput}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reminder Setting Modal for Active Step */}
      <AnimatePresence>
        {showReminderModal && currentStep && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowReminderModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A237E] dark:bg-indigo-500" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  <Bell className="w-4 h-4 text-[#1A237E] dark:text-indigo-400" strokeWidth={1.5} />
                  <span>Rappel</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 font-medium">
                {currentStep.texte}
              </p>

              <div className="space-y-4">
                <div>
                  <input
                    type="datetime-local"
                    value={reminderInput}
                    onChange={(e) => setReminderInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setReminderInput(setPresetDate(2))}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 transition-colors"
                  >
                    Dans 2h
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderInput(setPresetDate(12))}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 transition-colors"
                  >
                    Ce soir
                  </button>
                  <button
                    type="button"
                    onClick={() => setReminderInput(setPresetDate(24))}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 transition-colors"
                  >
                    Demain
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  {currentStep.reminderAt && (
                    <button
                      type="button"
                      onClick={() => handleSaveStepReminder(undefined)}
                      className="py-3 px-4 rounded-xl border border-rose-100 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 transition-colors"
                    >
                      Supprimer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSaveStepReminder(reminderInput)}
                    disabled={!reminderInput}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl text-center relative overflow-hidden"
            >
              <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-2">
                Supprimer ?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Cette action supprimera "{goal.titre}" définitivement.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteGoal(goal.id)}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
