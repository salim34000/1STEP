import React, { useState, useEffect } from 'react';
import { FinancialData, PlannedTransaction, Debt, Goal } from '../types';
import {
  Wallet,
  Landmark,
  Banknote,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Check,
  Trash2,
  Edit2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  CreditCard,
  User,
  PieChart,
  Eye,
  EyeOff,
  Zap,
  Target,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getTodayISO, formatPlannedDateFriendly, formatISODate } from '../utils/dateUtils';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { createDebtRepaymentGoal, syncDebtToGoal } from '../utils/storage';

interface FinancesViewProps {
  finances: FinancialData;
  onUpdateFinances: (updated: FinancialData) => void;
  goals?: Goal[];
  onUpdateGoals?: (updatedGoals: Goal[]) => void;
  onSelectGoal?: (goalId: string) => void;
}

const DISCREET_STORAGE_KEY = 'une_etape_finances_discreet_v1';

export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const FinancesView: React.FC<FinancesViewProps> = ({
  finances,
  onUpdateFinances,
  goals = [],
  onUpdateGoals,
  onSelectGoal,
}) => {
  // Discreet Mode (Privacy)
  const [isDiscreet, setIsDiscreet] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISCREET_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDiscreet = () => {
    const next = !isDiscreet;
    setIsDiscreet(next);
    try {
      localStorage.setItem(DISCREET_STORAGE_KEY, String(next));
    } catch (e) {
      console.error(e);
    }
    sound.playStepDone();
  };

  // Quick Cash State
  const [showQuickCash, setShowQuickCash] = useState<boolean>(false);
  const [quickCashMode, setQuickCashMode] = useState<'add' | 'sub'>('add');
  const [quickCashCustom, setQuickCashCustom] = useState<string>('');
  const [quickCashFeedback, setQuickCashFeedback] = useState<string | null>(null);

  // Modal states: Edit Balance
  const [editingBalance, setEditingBalance] = useState<'compteBancaire' | 'especes' | null>(null);
  const [balanceInput, setBalanceInput] = useState<string>('');

  // Flow creation modal / tab
  const [showAddFlowModal, setShowAddFlowModal] = useState<boolean>(false);
  const [flowType, setFlowType] = useState<'rentree' | 'depense'>('depense');
  const [flowLibelle, setFlowLibelle] = useState<string>('');
  const [flowMontant, setFlowMontant] = useState<string>('');
  const [flowDate, setFlowDate] = useState<string>(getTodayISO());
  const [flowAccount, setFlowAccount] = useState<'compteBancaire' | 'especes'>('compteBancaire');

  // Mark as done confirmation modal
  const [validatingFlow, setValidatingFlow] = useState<{
    item: PlannedTransaction;
    type: 'rentree' | 'depense';
  } | null>(null);
  const [executionAccount, setExecutionAccount] = useState<'compteBancaire' | 'especes'>('compteBancaire');

  // Debt creation & payment modals
  const [showAddDebtModal, setShowAddDebtModal] = useState<boolean>(false);
  const [debtCreancier, setDebtCreancier] = useState<string>('');
  const [debtTotal, setDebtTotal] = useState<string>('');
  const [debtRembourse, setDebtRembourse] = useState<string>('0');
  const [debtNote, setDebtNote] = useState<string>('');
  const [createLinkedGoalOption, setCreateLinkedGoalOption] = useState<boolean>(true);

  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');

  // Filtering / view tab for movements
  const [movementFilter, setMovementFilter] = useState<'all' | 'rentrees' | 'depenses'>('all');

  // Real balances calculation
  const totalSoldeReel = finances.soldes.compteBancaire + finances.soldes.especes;

  // Forecast movements
  const totalRentreesPrevues = finances.rentrees.reduce((acc, r) => acc + (Number(r.montant) || 0), 0);
  const totalDepensesPrevues = finances.depenses.reduce((acc, d) => acc + (Number(d.montant) || 0), 0);
  const soldePrevisionnel = totalSoldeReel + totalRentreesPrevues - totalDepensesPrevues;

  // Debts calculation (isolated)
  const totalDettesRestantes = finances.dettes.reduce(
    (acc, d) => acc + Math.max(0, (Number(d.montantTotal) || 0) - (Number(d.montantRembourse) || 0)),
    0
  );

  // Helper renderer for discreet amounts
  const renderAmount = (amount: number, prefix: string = '') => {
    return (
      <span
        className={`inline-block transition-all duration-300 ${
          isDiscreet ? 'filter blur-[7px] select-none opacity-80' : ''
        }`}
        title={isDiscreet ? 'Montant masqué en mode discret' : undefined}
      >
        {prefix}
        {formatEuro(amount)}
      </span>
    );
  };

  // --- Handlers: Balances ---
  const handleOpenEditBalance = (account: 'compteBancaire' | 'especes') => {
    setEditingBalance(account);
    setBalanceInput(String(finances.soldes[account]));
  };

  const handleSaveBalance = () => {
    if (!editingBalance) return;
    const numericValue = parseFloat(balanceInput.replace(',', '.'));
    if (isNaN(numericValue)) return;

    onUpdateFinances({
      ...finances,
      soldes: {
        ...finances.soldes,
        [editingBalance]: numericValue,
      },
    });
    setEditingBalance(null);
    sound.playStepDone();
  };

  // --- Handlers: Quick Cash ---
  const handleApplyQuickCash = (delta: number) => {
    const current = finances.soldes.especes || 0;
    const updated = Math.max(0, current + delta);

    onUpdateFinances({
      ...finances,
      soldes: {
        ...finances.soldes,
        especes: updated,
      },
    });

    sound.playStepDone();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }

    setQuickCashFeedback(`${delta > 0 ? '+' : ''}${delta} €`);
    setTimeout(() => setQuickCashFeedback(null), 1800);
    setQuickCashCustom('');
  };

  const handleCustomQuickCashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(quickCashCustom.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;
    const delta = quickCashMode === 'add' ? val : -val;
    handleApplyQuickCash(delta);
  };

  // --- Handlers: Planned Flows ---
  const handleCreateFlow = (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = parseFloat(flowMontant.replace(',', '.'));
    if (!flowLibelle.trim() || isNaN(montantNum) || montantNum <= 0) return;

    const newFlow: PlannedTransaction = {
      id: `flow-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      libelle: flowLibelle.trim(),
      montant: montantNum,
      datePrevue: flowDate || getTodayISO(),
      accountTarget: flowAccount,
    };

    if (flowType === 'rentree') {
      onUpdateFinances({
        ...finances,
        rentrees: [...finances.rentrees, newFlow],
      });
    } else {
      onUpdateFinances({
        ...finances,
        depenses: [...finances.depenses, newFlow],
      });
    }

    sound.playStepDone();
    setFlowLibelle('');
    setFlowMontant('');
    setFlowDate(getTodayISO());
    setShowAddFlowModal(false);
  };

  const handleDeleteFlow = (id: string, type: 'rentree' | 'depense') => {
    if (type === 'rentree') {
      onUpdateFinances({
        ...finances,
        rentrees: finances.rentrees.filter((r) => r.id !== id),
      });
    } else {
      onUpdateFinances({
        ...finances,
        depenses: finances.depenses.filter((d) => d.id !== id),
      });
    }
  };

  const handleConfirmExecuteFlow = () => {
    if (!validatingFlow) return;
    const { item, type } = validatingFlow;
    const amount = Number(item.montant) || 0;

    const updatedSoldes = { ...finances.soldes };
    if (type === 'rentree') {
      updatedSoldes[executionAccount] = (updatedSoldes[executionAccount] || 0) + amount;
    } else {
      updatedSoldes[executionAccount] = (updatedSoldes[executionAccount] || 0) - amount;
    }

    sound.playStepDone();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.7 },
      colors: ['#1A237E', '#388E3C', '#E8EAF6'],
      ticks: 80,
      scalar: 0.7,
    });

    onUpdateFinances({
      ...finances,
      soldes: updatedSoldes,
      rentrees: type === 'rentree' ? finances.rentrees.filter((r) => r.id !== item.id) : finances.rentrees,
      depenses: type === 'depense' ? finances.depenses.filter((d) => d.id !== item.id) : finances.depenses,
    });

    setValidatingFlow(null);
  };

  // --- Handlers: Debts ---
  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const totalNum = parseFloat(debtTotal.replace(',', '.'));
    const rembourseNum = parseFloat(debtRembourse.replace(',', '.')) || 0;
    if (!debtCreancier.trim() || isNaN(totalNum) || totalNum <= 0) return;

    const debtId = `debt-${Date.now()}`;
    const newDebt: Debt = {
      id: debtId,
      creancier: debtCreancier.trim(),
      montantTotal: totalNum,
      montantRembourse: Math.min(totalNum, Math.max(0, rembourseNum)),
      note: debtNote.trim() || undefined,
      createdAt: Date.now(),
    };

    if (createLinkedGoalOption && onUpdateGoals) {
      const associatedGoal = createDebtRepaymentGoal(newDebt);
      newDebt.linkedGoalId = associatedGoal.id;
      onUpdateGoals([...goals, associatedGoal]);
    }

    onUpdateFinances({
      ...finances,
      dettes: [...finances.dettes, newDebt],
    });

    sound.playStepDone();
    setDebtCreancier('');
    setDebtTotal('');
    setDebtRembourse('0');
    setDebtNote('');
    setCreateLinkedGoalOption(true);
    setShowAddDebtModal(false);
  };

  const handleAddDebtPayment = () => {
    if (!payingDebt) return;
    const paymentNum = parseFloat(paymentAmountInput.replace(',', '.'));
    if (isNaN(paymentNum) || paymentNum <= 0) return;

    const newRembourse = Math.min(
      payingDebt.montantTotal,
      payingDebt.montantRembourse + paymentNum
    );

    const isFullyPaid = newRembourse >= payingDebt.montantTotal;
    if (isFullyPaid) {
      sound.playGoalComplete();
      confetti({
        particleCount: 45,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#388E3C', '#1A237E', '#C8E6C9'],
      });
    } else {
      sound.playStepDone();
    }

    const updatedDebt: Debt = {
      ...payingDebt,
      montantRembourse: newRembourse,
    };

    const updatedDettes = finances.dettes.map((d) =>
      d.id === payingDebt.id ? updatedDebt : d
    );

    onUpdateFinances({
      ...finances,
      dettes: updatedDettes,
    });

    // Sync with linked goal if any
    if (updatedDebt.linkedGoalId && onUpdateGoals) {
      const updatedGoals = syncDebtToGoal(updatedDebt, goals);
      onUpdateGoals(updatedGoals);
    }

    setPayingDebt(null);
    setPaymentAmountInput('');
  };

  const handleDeleteDebt = (debtId: string) => {
    const debtToDelete = finances.dettes.find((d) => d.id === debtId);
    onUpdateFinances({
      ...finances,
      dettes: finances.dettes.filter((d) => d.id !== debtId),
    });

    // If there was a linked goal, optionally unlink or keep it
    if (debtToDelete?.linkedGoalId && onUpdateGoals) {
      const updatedGoals = goals.map((g) =>
        g.id === debtToDelete.linkedGoalId ? { ...g, linkedDebtId: undefined } : g
      );
      onUpdateGoals(updatedGoals);
    }
  };

  return (
    <div id="finances-screen" className="max-w-xl mx-auto px-6 py-8 pb-32">
      {/* Top Header & Privacy Mode Toggle */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
            Vue d'ensemble
          </p>
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Vos Finances
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Clarté, sérénité et gestion transparente de vos flux.
          </p>
        </div>

        {/* Discreet Mode Button */}
        <button
          id="btn-toggle-discreet-mode"
          type="button"
          onClick={handleToggleDiscreet}
          aria-label={isDiscreet ? 'Désactiver le mode discret (afficher les montants)' : 'Activer le mode discret (masquer les montants)'}
          title={isDiscreet ? 'Mode discret actif (cliquer pour afficher)' : 'Mode discret (cliquer pour masquer les montants)'}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-2xl text-xs font-semibold transition-all border shrink-0 ${
            isDiscreet
              ? 'bg-[#1A237E]/10 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 border-[#1A237E]/20 dark:border-indigo-500/30 shadow-xs'
              : 'bg-white dark:bg-[#1E1E1E] text-slate-500 dark:text-slate-400 border-slate-200/80 dark:border-zinc-800 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {isDiscreet ? (
            <>
              <EyeOff className="w-4 h-4 text-[#1A237E] dark:text-indigo-300" strokeWidth={1.5} />
              <span className="hidden sm:inline">Discret</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span className="hidden sm:inline">Visible</span>
            </>
          )}
        </button>
      </div>

      {/* SECTION A: SOLDES ACTUELS (LIQUIDITÉS RÉELLES) */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xs mb-8 relative overflow-hidden transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#1A237E]/5 dark:bg-indigo-950/50 flex items-center justify-center text-[#1A237E] dark:text-indigo-400">
              <Wallet className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Liquidités disponibles
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
            Temps réel
          </span>
        </div>

        {/* Big Cumulative Balance */}
        <div className="mb-6">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Solde réel total cumulé</p>
          <h3 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            {renderAmount(totalSoldeReel)}
          </h3>
        </div>

        {/* 2 Account Cards: Banque & Espèces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Compte Bancaire */}
          <div
            id="card-solde-banque"
            onClick={() => handleOpenEditBalance('compteBancaire')}
            className="group p-4 rounded-2xl bg-slate-50/80 dark:bg-[#252525] hover:bg-[#1A237E]/5 dark:hover:bg-[#2a2a2a] border border-slate-100 dark:border-zinc-700/60 hover:border-[#1A237E]/20 transition-all cursor-pointer relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#1A237E] dark:text-indigo-400" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Compte bancaire</span>
              </div>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1A237E] dark:group-hover:text-indigo-400 transition-colors" strokeWidth={1.5} />
            </div>
            <p className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100">
              {renderAmount(finances.soldes.compteBancaire)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Cliquer pour ajuster</p>
          </div>

          {/* Espèces & Quick Cash Actions */}
          <div
            id="card-solde-especes"
            className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#252525] border border-slate-100 dark:border-zinc-700/60 transition-all relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => handleOpenEditBalance('especes')}
              >
                <Banknote className="w-4 h-4 text-[#388E3C] dark:text-emerald-400" strokeWidth={1.5} />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Espèces</span>
              </div>

              {/* Quick Cash Toggle Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="btn-quick-cash-add"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickCashMode('add');
                    setShowQuickCash(!showQuickCash || quickCashMode !== 'add');
                  }}
                  title="Ajout rapide d'espèces (+10, +20, +50...)"
                  className="px-2 py-0.5 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 hover:bg-emerald-200 text-[#388E3C] dark:text-emerald-300 text-[11px] font-bold transition-colors flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Rapide</span>
                </button>

                <button
                  type="button"
                  id="btn-quick-cash-sub"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickCashMode('sub');
                    setShowQuickCash(!showQuickCash || quickCashMode !== 'sub');
                  }}
                  title="Retrait rapide d'espèces (-10, -20, -50...)"
                  className="px-2 py-0.5 rounded-lg bg-slate-200/70 dark:bg-zinc-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-[11px] font-bold transition-colors flex items-center gap-0.5"
                >
                  <Minus className="w-3 h-3 stroke-[2.5]" />
                  <span>Rapide</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEditBalance('especes')}
                  title="Modifier le solde manuellement"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => handleOpenEditBalance('especes')}
            >
              <p className="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {renderAmount(finances.soldes.especes)}
                {quickCashFeedback && (
                  <span className={`text-xs font-sans font-bold px-1.5 py-0.5 rounded ${
                    quickCashFeedback.startsWith('+')
                      ? 'bg-[#388E3C]/10 text-[#388E3C] dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                  }`}>
                    {quickCashFeedback}
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Ajustement rapide en un clic
              </p>
            </div>

            {/* Quick Cash Inline Panel */}
            <AnimatePresence>
              {showQuickCash && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-slate-200/70 dark:border-zinc-700/80"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      quickCashMode === 'add' ? 'text-[#388E3C] dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {quickCashMode === 'add' ? 'Ajouter en liquide' : 'Retirer en liquide'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickCash(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Preset chips */}
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {[10, 20, 50, 100].map((amount) => {
                      const signedDelta = quickCashMode === 'add' ? amount : -amount;
                      return (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => handleApplyQuickCash(signedDelta)}
                          className={`py-1 px-1.5 rounded-lg text-xs font-bold text-center transition-all ${
                            quickCashMode === 'add'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#388E3C] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50'
                              : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          {quickCashMode === 'add' ? `+${amount} €` : `-${amount} €`}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom quick input */}
                  <form onSubmit={handleCustomQuickCashSubmit} className="flex gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Autre montant..."
                      value={quickCashCustom}
                      onChange={(e) => setQuickCashCustom(e.target.value)}
                      className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-[#1E1E1E] rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1A237E]"
                    />
                    <button
                      type="submit"
                      className={`px-3 py-1 text-xs font-bold rounded-lg text-white transition-colors ${
                        quickCashMode === 'add'
                          ? 'bg-[#388E3C] hover:bg-[#2e7d32]'
                          : 'bg-slate-800 dark:bg-zinc-700 hover:bg-slate-900'
                      }`}
                    >
                      {quickCashMode === 'add' ? '+' : '-'}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* SECTION B: MOUVEMENTS À VENIR (PRÉVISIONNEL) */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              Anticipation
            </span>
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100">
              Mouvements à venir
            </h3>
          </div>

          <button
            type="button"
            id="btn-add-movement"
            onClick={() => setShowAddFlowModal(true)}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-[#1A237E] dark:bg-indigo-600 text-white rounded-2xl text-xs font-semibold hover:bg-[#283593] dark:hover:bg-indigo-700 transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Ajouter</span>
          </button>
        </div>

        {/* Forecast Card Banner */}
        <div className="p-4 bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs mb-4 transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Solde prévisionnel estimé
              </p>
              <p className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {renderAmount(soldePrevisionnel)}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 text-[#388E3C] dark:text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="font-semibold">{renderAmount(totalRentreesPrevues, '+')}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <TrendingDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span className="font-semibold">{renderAmount(totalDepensesPrevues, '-')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Movements Filter Tabs */}
        <div className="flex items-center p-1 bg-slate-100/70 dark:bg-[#252525] border border-slate-200/50 dark:border-zinc-800 rounded-2xl mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
          <button
            type="button"
            onClick={() => setMovementFilter('all')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all ${
              movementFilter === 'all'
                ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Tous ({finances.rentrees.length + finances.depenses.length})
          </button>
          <button
            type="button"
            onClick={() => setMovementFilter('rentrees')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all ${
              movementFilter === 'rentrees'
                ? 'bg-white dark:bg-[#1E1E1E] text-[#388E3C] dark:text-emerald-400 font-semibold shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Rentrées ({finances.rentrees.length})
          </button>
          <button
            type="button"
            onClick={() => setMovementFilter('depenses')}
            className={`flex-1 py-1.5 px-3 rounded-xl transition-all ${
              movementFilter === 'depenses'
                ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-slate-100 font-semibold shadow-xs'
                : 'hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Dépenses ({finances.depenses.length})
          </button>
        </div>

        {/* List of Movements */}
        <div className="space-y-2.5">
          {/* Rentrées items */}
          {(movementFilter === 'all' || movementFilter === 'rentrees') &&
            finances.rentrees.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3.5 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-[#388E3C]/30 shadow-2xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#388E3C]/10 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.libelle}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{formatPlannedDateFriendly(item.datePrevue)}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {item.accountTarget === 'especes' ? 'Espèces' : 'Compte bancaire'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold font-serif text-[#388E3C] dark:text-emerald-400">
                    {renderAmount(item.montant, '+')}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setExecutionAccount(item.accountTarget || 'compteBancaire');
                      setValidatingFlow({ item, type: 'rentree' });
                    }}
                    title="Marquer comme encaissée (met à jour le solde réel)"
                    className="p-1.5 rounded-xl bg-[#388E3C]/10 dark:bg-emerald-950/60 hover:bg-[#388E3C] text-[#388E3C] dark:text-emerald-400 hover:text-white transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFlow(item.id, 'rentree')}
                    title="Supprimer cette rentrée prévue"
                    className="p-1.5 rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}

          {/* Dépenses items */}
          {(movementFilter === 'all' || movementFilter === 'depenses') &&
            finances.depenses.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between p-3.5 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-100 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 shadow-2xs transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                    <TrendingDown className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.libelle}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                      <span>{formatPlannedDateFriendly(item.datePrevue)}</span>
                      <span>•</span>
                      <span className="capitalize">
                        {item.accountTarget === 'especes' ? 'Espèces' : 'Compte bancaire'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold font-serif text-slate-800 dark:text-slate-200">
                    {renderAmount(item.montant, '-')}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setExecutionAccount(item.accountTarget || 'compteBancaire');
                      setValidatingFlow({ item, type: 'depense' });
                    }}
                    title="Marquer comme payée (déduit du solde réel)"
                    className="p-1.5 rounded-xl bg-[#1A237E]/10 dark:bg-indigo-950/60 hover:bg-[#1A237E] dark:hover:bg-indigo-600 text-[#1A237E] dark:text-indigo-400 hover:text-white transition-colors"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFlow(item.id, 'depense')}
                    title="Supprimer cette dépense prévue"
                    className="p-1.5 rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}

          {finances.rentrees.length === 0 && finances.depenses.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-slate-500 text-xs">
              Aucun mouvement prévu pour le moment. Cliquez sur « Ajouter » pour anticiper vos rentrées et dépenses.
            </div>
          )}
        </div>
      </div>

      {/* SECTION C: SUIVI DES DETTES (COMPTES TIERS ISOLÉS) */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Comptes tiers
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded">
                Isolé du solde
              </span>
            </div>
            <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-slate-100">
              Engagements & Dettes
            </h3>
          </div>

          <button
            type="button"
            id="btn-add-debt"
            onClick={() => setShowAddDebtModal(true)}
            className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-2xl text-xs font-semibold transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            <span>Nouveau tiers</span>
          </button>
        </div>

        {totalDettesRestantes > 0 && (
          <div className="mb-4 p-3.5 bg-[#1A237E]/5 dark:bg-indigo-950/40 border border-[#1A237E]/10 dark:border-indigo-800/40 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Total des restes à rembourser</span>
            <span className="text-sm font-serif font-bold text-[#1A237E] dark:text-indigo-300">{renderAmount(totalDettesRestantes)}</span>
          </div>
        )}

        {/* Debt Cards */}
        <div className="space-y-3.5">
          {finances.dettes.map((debt) => {
            const resteAPayer = Math.max(0, debt.montantTotal - debt.montantRembourse);
            const percent = debt.montantTotal > 0 ? Math.min(100, (debt.montantRembourse / debt.montantTotal) * 100) : 100;
            const isCompleted = resteAPayer === 0;
            const linkedGoal = goals.find((g) => g.id === debt.linkedGoalId || g.linkedDebtId === debt.id);

            return (
              <div
                key={debt.id}
                className={`p-5 rounded-3xl bg-white dark:bg-[#1E1E1E] border transition-all shadow-xs ${
                  isCompleted
                    ? 'border-[#388E3C]/30 dark:border-emerald-700/40 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-100 dark:border-zinc-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" strokeWidth={1.5} />
                      <h4 className="text-sm font-bold font-serif text-slate-900 dark:text-slate-100">
                        {debt.creancier}
                      </h4>
                    </div>
                    {debt.note && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{debt.note}</p>
                    )}

                    {/* Linked Goal Badge */}
                    {linkedGoal && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectGoal && onSelectGoal(linkedGoal.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#1A237E]/10 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 hover:underline"
                        >
                          <Target className="w-3 h-3" />
                          <span>Objectif : {linkedGoal.titre}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#388E3C] dark:text-emerald-400 bg-[#388E3C]/10 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                        Soldé
                      </span>
                    ) : (
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                          Reste à payer
                        </p>
                        <p className="text-base font-serif font-bold text-[#1A237E] dark:text-indigo-300">
                          {renderAmount(resteAPayer)}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteDebt(debt.id)}
                      className="p-1 text-slate-300 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors ml-1"
                      title="Supprimer ce suivi"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    <span>
                      Remboursé : <strong className="text-slate-800 dark:text-slate-200">{renderAmount(debt.montantRembourse)}</strong> / {renderAmount(debt.montantTotal)}
                    </span>
                    <span>{Math.round(percent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        isCompleted ? 'bg-[#388E3C] dark:bg-emerald-500' : 'bg-[#1A237E] dark:bg-indigo-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Action button: add repayment */}
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={() => {
                      setPayingDebt(debt);
                      setPaymentAmountInput('');
                    }}
                    className="w-full py-2 px-3 bg-slate-50 hover:bg-[#1A237E]/5 dark:bg-[#252525] dark:hover:bg-[#2e2e2e] text-slate-700 hover:text-[#1A237E] dark:text-slate-300 dark:hover:text-indigo-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-100 dark:border-zinc-700/60 hover:border-[#1A237E]/20"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                    <span>Ajouter un versement</span>
                  </button>
                )}
              </div>
            );
          })}

          {finances.dettes.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 text-slate-400 dark:text-slate-500 text-xs">
              Aucune dette enregistrée. Vos comptes avec les tiers sont parfaitement clairs et à jour.
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL: EDIT BALANCE --- */}
      <AnimatePresence>
        {editingBalance && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setEditingBalance(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-[#1A237E] dark:text-indigo-400" strokeWidth={1.5} />
                  <h4 className="text-sm font-bold font-serif text-slate-900 dark:text-slate-100">
                    Ajuster {editingBalance === 'compteBancaire' ? 'le compte bancaire' : 'les espèces'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBalance(null)}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Nouveau solde réel (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-lg font-serif font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBalance(null)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveBalance}
                    className="flex-1 py-2.5 rounded-xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: ADD PLANNED MOVEMENT --- */}
      <AnimatePresence>
        {showAddFlowModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowAddFlowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold font-serif text-slate-900 dark:text-slate-100">
                  Nouveau mouvement prévu
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddFlowModal(false)}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleCreateFlow} className="space-y-4">
                {/* Type Selection */}
                <div className="flex p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFlowType('depense')}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      flowType === 'depense'
                        ? 'bg-white dark:bg-[#1E1E1E] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Dépense à venir
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowType('rentree')}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      flowType === 'rentree'
                        ? 'bg-white dark:bg-[#1E1E1E] text-[#388E3C] dark:text-emerald-400 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Rentrée à venir
                  </button>
                </div>

                {/* Libellé */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Libellé
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Facture électricité, Virement freelance..."
                    value={flowLibelle}
                    onChange={(e) => setFlowLibelle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                {/* Montant */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Montant (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={flowMontant}
                    onChange={(e) => setFlowMontant(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20 font-serif font-bold"
                  />
                </div>

                {/* Date Prévue */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Date prévue
                  </label>
                  <input
                    type="date"
                    required
                    value={flowDate}
                    onChange={(e) => setFlowDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                {/* Account */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Compte concerné
                  </label>
                  <select
                    value={flowAccount}
                    onChange={(e) => setFlowAccount(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  >
                    <option value="compteBancaire">Compte bancaire</option>
                    <option value="especes">Espèces</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFlowModal(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Ajouter au prévisionnel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: CONFIRM EXECUTE FLOW --- */}
      <AnimatePresence>
        {validatingFlow && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setValidatingFlow(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-[#388E3C]/10 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 flex items-center justify-center mb-3">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>

              <h4 className="text-base font-bold font-serif text-slate-900 dark:text-slate-100 mb-1">
                Marquer comme effectuée
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Cette action va mettre à jour votre solde réel et archiver cette ligne du prévisionnel.
              </p>

              <div className="p-3.5 bg-slate-50 dark:bg-[#252525] rounded-2xl border border-slate-100 dark:border-zinc-700 mb-4">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{validatingFlow.item.libelle}</p>
                <p className="text-sm font-serif font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {validatingFlow.type === 'rentree' ? '+' : '-'}
                  {formatEuro(validatingFlow.item.montant)}
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Appliquer sur le compte :
                </label>
                <select
                  value={executionAccount}
                  onChange={(e) => setExecutionAccount(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                >
                  <option value="compteBancaire">Compte bancaire</option>
                  <option value="especes">Espèces</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setValidatingFlow(null)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExecuteFlow}
                  className="flex-1 py-2.5 rounded-xl bg-[#388E3C] hover:bg-[#2e7d32] dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Valider le mouvement
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: ADD DEBT --- */}
      <AnimatePresence>
        {showAddDebtModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowAddDebtModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold font-serif text-slate-900 dark:text-slate-100">
                  Nouveau compte tiers / Dette
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddDebtModal(false)}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleCreateDebt} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Nom de la personne / Créancier
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Maxime, Prêt familial..."
                    value={debtCreancier}
                    onChange={(e) => setDebtCreancier(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Montant total dû (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={debtTotal}
                    onChange={(e) => setDebtTotal(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 font-serif font-bold focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Déjà remboursé (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={debtRembourse}
                    onChange={(e) => setDebtRembourse(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Note ou condition (optionnelle)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 50€ par mois, sans échéance..."
                    value={debtNote}
                    onChange={(e) => setDebtNote(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                {/* Option: Link to Goal */}
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createLinkedGoalOption}
                      onChange={(e) => setCreateLinkedGoalOption(e.target.checked)}
                      className="mt-0.5 rounded text-[#1A237E] focus:ring-[#1A237E]"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <Target className="w-3.5 h-3.5 text-[#1A237E] dark:text-indigo-400" />
                        Créer un objectif de remboursement associé
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Génère automatiquement un objectif décomposé en 5 paliers progressifs (20%, 40%, 60%, 80%, 100%) synchronisé avec ce compte.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDebtModal(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: ADD DEBT PAYMENT --- */}
      <AnimatePresence>
        {payingDebt && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setPayingDebt(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
                    Remboursement
                  </p>
                  <h4 className="text-base font-bold font-serif text-slate-900 dark:text-slate-100">
                    {payingDebt.creancier}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPayingDebt(null)}
                  className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-[#252525] rounded-2xl border border-slate-100 dark:border-zinc-700 mb-4 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Reste à solder : </span>
                <strong className="text-slate-900 dark:text-slate-100 font-serif text-sm">
                  {formatEuro(payingDebt.montantTotal - payingDebt.montantRembourse)}
                </strong>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                    Montant du versement (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    placeholder="Ex: 50"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-lg font-serif font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                {/* Quick amount shortcuts */}
                <div className="flex flex-wrap gap-2">
                  {[20, 50, 100].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setPaymentAmountInput(String(quick))}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                    >
                      +{quick} €
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setPaymentAmountInput(
                        String(payingDebt.montantTotal - payingDebt.montantRembourse)
                      )
                    }
                    className="px-3 py-1.5 bg-[#388E3C]/10 dark:bg-emerald-950/60 hover:bg-[#388E3C]/20 text-[#388E3C] dark:text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Tout solder
                  </button>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPayingDebt(null)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAddDebtPayment}
                    className="flex-1 py-2.5 rounded-xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Confirmer le versement
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
