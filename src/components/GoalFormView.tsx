import React, { useState } from 'react';
import { Goal, Step, RecurrenceType } from '../types';
import {
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Repeat,
  Bell,
  X,
  Clock,
  Mic,
  Loader2,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatReminderDate, requestNotificationPermission } from '../utils/notifications';

interface GoalFormViewProps {
  initialGoal?: Goal;
  initialTitle?: string;
  initialNotes?: string;
  linkedDreamId?: string;
  onSave: (goal: Goal) => void;
  onCancel: () => void;
}

interface TemplateSuggestion {
  titre: string;
  recurrence: RecurrenceType;
  etapes: Array<{ texte: string; reminderOffsetHours?: number }>;
}

const TEMPLATES: TemplateSuggestion[] = [
  {
    titre: 'Routine matinale de vitalité',
    recurrence: 'daily',
    etapes: [
      { texte: 'Boire un grand verre d’eau tiède et citron', reminderOffsetHours: 1 },
      { texte: '10 minutes d’étirements doux et respiration' },
      { texte: 'Lister les 3 priorités clés de la journée' },
    ],
  },
  {
    titre: 'Bilan et organisation de la semaine',
    recurrence: 'weekly',
    etapes: [
      { texte: 'Archiver les e-mails traités et vider la boîte' },
      { texte: 'Revoir le calendrier et anticiper les rendez-vous' },
      { texte: 'Fixer les 3 grands objectifs de la semaine' },
    ],
  },
  {
    titre: 'Clôture du budget mensuel',
    recurrence: 'monthly',
    etapes: [
      { texte: 'Pointer les relevés bancaires et factures' },
      { texte: 'Mettre de côté l’épargne programmée' },
      { texte: 'Ajuster les catégories de dépenses pour le mois suivant' },
    ],
  },
  {
    titre: 'Renouveler mon passeport',
    recurrence: 'none',
    etapes: [
      { texte: 'Créer la pré-demande sur le site ANTS' },
      { texte: 'Acheter le timbre fiscal en ligne' },
      { texte: 'Faire des photos d’identité récentes conformes' },
      { texte: 'Prendre rendez-vous en mairie pour le dépôt' },
      { texte: 'Retirer le passeport dès réception du SMS' },
    ],
  },
];

export const GoalFormView: React.FC<GoalFormViewProps> = ({
  initialGoal,
  initialTitle,
  initialNotes,
  linkedDreamId,
  onSave,
  onCancel,
}) => {
  const isEditing = !!initialGoal;
  const [titre, setTitre] = useState(initialGoal?.titre || initialTitle || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(
    initialGoal?.recurrence || 'none'
  );
  const [etapes, setEtapes] = useState<Step[]>(
    initialGoal?.etapes || []
  );
  const [newStepText, setNewStepText] = useState('');
  const [newStepReminder, setNewStepReminder] = useState<string>('');
  const [showNewStepReminderPicker, setShowNewStepReminderPicker] = useState(false);
  const [activeStepReminderId, setActiveStepReminderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("La reconnaissance vocale n'est pas supportée par votre navigateur.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      
      const rawSteps = transcript.split(/[,;\n]|\b(?:ensuite|puis|et)\b/i);
      const newStepsText = rawSteps
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1));

      if (newStepsText.length > 0) {
        setEtapes((prev) => {
          const stepObjects = newStepsText.map((texte: string, idx: number) => ({
            id: `step-voice-${Date.now()}-${idx}`,
            texte,
            ordre: 0,
            termine: false,
            reminderNotified: false
          }));
          const combined = [...prev, ...stepObjects];
          return combined.map((s, i) => ({ ...s, ordre: i + 1 }));
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
      setErrorMsg("Erreur lors de la reconnaissance vocale.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleAddStep = () => {
    const trimmed = newStepText.trim();
    if (!trimmed) return;

    const newStep: Step = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      texte: trimmed,
      ordre: etapes.length + 1,
      termine: false,
      reminderAt: newStepReminder || undefined,
      reminderNotified: false,
    };

    setEtapes([...etapes, newStep]);
    setNewStepText('');
    setNewStepReminder('');
    setShowNewStepReminderPicker(false);
    setErrorMsg(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddStep();
    }
  };

  const handleRemoveStep = (id: string) => {
    const filtered = etapes.filter((s) => s.id !== id);
    const reordered = filtered.map((s, idx) => ({ ...s, ordre: idx + 1 }));
    setEtapes(reordered);
    if (activeStepReminderId === id) {
      setActiveStepReminderId(null);
    }
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= etapes.length) return;

    const nextEtapes = [...etapes];
    const temp = nextEtapes[index];
    nextEtapes[index] = nextEtapes[targetIndex];
    nextEtapes[targetIndex] = temp;

    const reordered = nextEtapes.map((s, idx) => ({ ...s, ordre: idx + 1 }));
    setEtapes(reordered);
  };

  const handleUpdateStepText = (id: string, text: string) => {
    setEtapes(
      etapes.map((s) => (s.id === id ? { ...s, texte: text } : s))
    );
  };

  const handleSetStepReminder = async (id: string, reminderDate: string | undefined) => {
    if (reminderDate) {
      await requestNotificationPermission();
    }
    setEtapes(
      etapes.map((s) =>
        s.id === id
          ? {
              ...s,
              reminderAt: reminderDate || undefined,
              reminderNotified: false,
            }
          : s
      )
    );
    setActiveStepReminderId(null);
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

  const applyTemplate = (tpl: TemplateSuggestion) => {
    setTitre(tpl.titre);
    setRecurrence(tpl.recurrence);
    setEtapes(
      tpl.etapes.map((item, idx) => ({
        id: `step-tpl-${Date.now()}-${idx}`,
        texte: item.texte,
        ordre: idx + 1,
        termine: false,
        reminderAt: item.reminderOffsetHours
          ? setPresetDate(item.reminderOffsetHours)
          : undefined,
        reminderNotified: false,
      }))
    );
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = titre.trim();

    if (!trimmedTitle) {
      setErrorMsg('Veuillez donner un titre à votre objectif.');
      return;
    }

    if (etapes.length === 0) {
      setErrorMsg('Ajoutez au moins une étape pour cet objectif.');
      return;
    }

    const savedGoal: Goal = {
      id: initialGoal ? initialGoal.id : `goal-${Date.now()}`,
      titre: trimmedTitle,
      recurrence,
      cycleCount: initialGoal?.cycleCount || 0,
      lastCompletedCycleAt: initialGoal?.lastCompletedCycleAt,
      etapes: etapes.map((s, idx) => ({ ...s, ordre: idx + 1 })),
      createdAt: initialGoal ? initialGoal.createdAt : Date.now(),
      completedAt: initialGoal?.completedAt,
      linkedDebtId: initialGoal?.linkedDebtId,
      linkedDreamId: initialGoal?.linkedDreamId || linkedDreamId,
    };

    onSave(savedGoal);
  };

  return (
    <div id="goal-form-screen" className="max-w-xl mx-auto px-6 py-8 pb-24">
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Form header */}
        <div className="space-y-1">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] font-semibold">
            {isEditing ? 'Édition' : 'Création'}
          </p>
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {isEditing ? "Modifier l'objectif" : 'Nouvel objectif'}
          </h2>
        </div>

        {/* Origin inspiration / notes context banner */}
        {initialNotes && (
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
            <span className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Notes de l'idée source
            </span>
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed italic">
              « {initialNotes} »
            </p>
          </div>
        )}

        {linkedDreamId && (
          <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="text-purple-950 dark:text-purple-200 font-medium">
              Cet objectif sera directement rattaché à votre grand rêve.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Goal Title Input */}
        <div className="space-y-2 relative">
          <input
            id="goal-title-input"
            type="text"
            value={titre}
            onChange={(e) => {
              setTitre(e.target.value);
              setErrorMsg(null);
            }}
            placeholder="Ex. Routine matinale ou Carte d'identité"
            className="w-full bg-transparent text-xl sm:text-2xl font-medium text-slate-900 dark:text-slate-100 placeholder-slate-300 dark:placeholder-zinc-600 focus:outline-none transition-all peer pb-2 font-serif"
            autoFocus={!isEditing}
          />
          {/* Animated bottom border */}
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-slate-200 dark:bg-zinc-700">
            <motion.div
              initial={false}
              animate={{ width: titre ? '100%' : '0%' }}
              className="h-full bg-[#1A237E] dark:bg-indigo-500 peer-focus:w-full transition-all duration-300"
            />
          </div>
        </div>

        {/* Recurrence Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Repeat className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Récurrence</span>
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { key: 'none' as RecurrenceType, label: 'Unique' },
              { key: 'daily' as RecurrenceType, label: 'Quotidienne' },
              { key: 'weekly' as RecurrenceType, label: 'Hebdomadaire' },
              { key: 'monthly' as RecurrenceType, label: 'Mensuelle' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRecurrence(item.key)}
                className={`py-3 px-3 rounded-[14px] text-left border transition-all ${
                  recurrence === item.key
                    ? 'bg-[#1A237E]/5 dark:bg-indigo-950/60 border-[#1A237E] dark:border-indigo-500 ring-1 ring-[#1A237E] dark:ring-indigo-500'
                    : 'bg-white dark:bg-[#1E1E1E] border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div
                  className={`text-xs font-semibold ${
                    recurrence === item.key ? 'text-[#1A237E] dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </div>
              </button>
            ))}
          </div>

          {recurrence !== 'none' && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-zinc-800/60 p-3 rounded-xl border border-slate-100 dark:border-zinc-800 leading-relaxed">
              🔁 <strong>Objectif récurrent</strong> : Dès que toutes les étapes sont validées, l'objectif se réinitialise automatiquement pour la période suivante, en recommençant par la première étape.
            </p>
          )}
        </div>

        {/* Templates suggestions (only if new and empty) */}
        {!isEditing && etapes.length === 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-[0.1em]">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Modèles rapides</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="p-4 bg-white dark:bg-[#1E1E1E] border border-slate-100 dark:border-zinc-800 hover:border-[#1A237E]/30 dark:hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-zinc-800/60 shadow-2xs rounded-2xl text-left flex items-start justify-between gap-2 transition-all"
                >
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{tpl.titre}</div>
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
                      {tpl.recurrence === 'daily'
                        ? 'Quotidien'
                        : tpl.recurrence === 'weekly'
                        ? 'Hebdomadaire'
                        : tpl.recurrence === 'monthly'
                        ? 'Mensuel'
                        : 'Unique'}
                      <span className="w-1 h-1 bg-slate-300 dark:bg-zinc-600 rounded-full"></span>
                      {tpl.etapes.length} étapes
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-[#1A237E] dark:text-indigo-400 opacity-50 shrink-0 mt-0.5" strokeWidth={1.5} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Steps List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <span>Étapes ({etapes.length})</span>
            </label>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Ordre d'exécution
            </span>
          </div>

          {/* Add Step Input with optional Reminder toggle */}
          <div className="space-y-2">
            <div className="flex gap-2 relative">
              <input
                id="new-step-input"
                type="text"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Écoute en cours..." : "Nouvelle étape..."}
                disabled={isListening}
                className="flex-1 px-4 py-3.5 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-slate-200 dark:border-zinc-800 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20 focus:border-[#1A237E] dark:focus:border-indigo-500 transition-all shadow-2xs disabled:bg-slate-50 dark:disabled:bg-zinc-900"
              />

              <div className="relative">
                {isListening && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0.5, 0], scale: [1, 2.5] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 bg-[#1A237E] dark:bg-indigo-600 rounded-2xl pointer-events-none"
                  />
                )}
                <button
                  type="button"
                  onClick={startListening}
                  disabled={isListening}
                  title="Dicter une ou plusieurs étapes"
                  className={`relative z-10 p-3.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
                    isListening
                      ? 'bg-[#1A237E] dark:bg-indigo-600 text-white border-[#1A237E]'
                      : 'bg-white dark:bg-[#1E1E1E] text-slate-400 dark:text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-zinc-800 border-slate-200 dark:border-zinc-800 shadow-2xs'
                  }`}
                >
                  {isListening ? (
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <Mic className="w-4 h-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowNewStepReminderPicker(!showNewStepReminderPicker)}
                title="Définir un rappel pour cette étape"
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-center shrink-0 shadow-2xs ${
                  newStepReminder
                    ? 'bg-[#1A237E]/10 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 border-[#1A237E] dark:border-indigo-500'
                    : showNewStepReminderPicker
                    ? 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-zinc-600'
                    : 'bg-white dark:bg-[#1E1E1E] text-slate-400 dark:text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-300 border-slate-200 dark:border-zinc-800'
                }`}
              >
                <Bell className="w-4 h-4" strokeWidth={1.5} />
              </button>

              <button
                id="btn-add-step"
                type="button"
                onClick={handleAddStep}
                disabled={!newStepText.trim()}
                className="px-4 py-3.5 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-2xl text-sm font-medium disabled:opacity-50 transition-all flex items-center justify-center shrink-0 shadow-md"
              >
                <Plus className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Reminder Date/Time Picker for New Step */}
            <AnimatePresence>
              {showNewStepReminderPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 bg-slate-50 dark:bg-[#252525] rounded-2xl border border-slate-100 dark:border-zinc-700 space-y-3 overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#1A237E] dark:text-indigo-400" strokeWidth={1.5} />
                      Heure de notification
                    </span>
                    {newStepReminder && (
                      <button
                        type="button"
                        onClick={() => setNewStepReminder('')}
                        className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-0.5 transition-colors"
                      >
                        <X className="w-3 h-3" />
                        Effacer
                      </button>
                    )}
                  </div>

                  <input
                    type="datetime-local"
                    value={newStepReminder}
                    onChange={(e) => setNewStepReminder(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-[#1E1E1E] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setNewStepReminder(setPresetDate(2))}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 transition-colors"
                    >
                      Dans 2h
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStepReminder(setPresetDate(12))}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 transition-colors"
                    >
                      Ce soir
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStepReminder(setPresetDate(24))}
                      className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:border-[#1A237E] dark:hover:border-indigo-400 transition-colors"
                    >
                      Demain
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {newStepReminder && !showNewStepReminderPicker && (
              <div className="flex items-center justify-between text-[11px] font-medium bg-[#1A237E]/5 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 px-3 py-2 rounded-xl border border-[#1A237E]/10 dark:border-indigo-800/40">
                <span className="flex items-center gap-1.5">
                  <Bell className="w-3 h-3" strokeWidth={1.5} />
                  Rappel : {formatReminderDate(newStepReminder)}
                </span>
                <button
                  type="button"
                  onClick={() => setNewStepReminder('')}
                  className="text-slate-400 hover:text-rose-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            )}
          </div>

          {/* Step items list with reminders and reorder */}
          <div className="space-y-3 mt-4 max-h-[420px] overflow-y-auto pr-1">
            <AnimatePresence>
              {etapes.map((step, index) => (
                <motion.div
                  key={step.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 p-2.5 bg-white dark:bg-[#1E1E1E] rounded-[14px] border border-slate-100 dark:border-zinc-800 hover:border-slate-200 dark:hover:border-zinc-700 transition-colors shadow-2xs group"
                >
                  <div className="flex flex-col items-center gap-1 shrink-0 px-1">
                    <button
                      type="button"
                      onClick={() => handleMoveStep(index, 'up')}
                      disabled={index === 0}
                      className="text-slate-300 dark:text-zinc-600 hover:text-[#1A237E] dark:hover:text-indigo-400 disabled:opacity-0 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                    <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 leading-none">
                      {index + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMoveStep(index, 'down')}
                      disabled={index === etapes.length - 1}
                      className="text-slate-300 dark:text-zinc-600 hover:text-[#1A237E] dark:hover:text-indigo-400 disabled:opacity-0 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>

                  <input
                    type="text"
                    value={step.texte}
                    onChange={(e) => handleUpdateStepText(step.id, e.target.value)}
                    className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 focus:outline-none placeholder-slate-300 dark:placeholder-zinc-600 py-1"
                    placeholder="Titre de l'étape"
                  />

                  {/* Step Reminder button */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveStepReminderId(
                        activeStepReminderId === step.id ? null : step.id
                      )
                    }
                    title="Modifier le rappel de cette étape"
                    className={`p-2 rounded-xl transition-colors shrink-0 ${
                      step.reminderAt
                        ? 'text-[#1A237E] dark:text-indigo-400 bg-[#1A237E]/5 dark:bg-indigo-950/60'
                        : 'text-slate-300 dark:text-zinc-600 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Bell className="w-4 h-4" strokeWidth={1.5} />
                  </button>

                  {/* Delete / Grip */}
                  <div className="flex items-center gap-1 shrink-0 ml-1">
                    <button
                      type="button"
                      onClick={() => handleRemoveStep(step.id)}
                      className="p-2 rounded-xl text-slate-300 dark:text-zinc-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                    <div className="p-1 text-slate-300 dark:text-zinc-600 cursor-grab active:cursor-grabbing hover:text-slate-500">
                      <GripVertical className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {etapes.length === 0 && (
              <div className="py-10 px-4 text-center rounded-3xl border border-dashed border-slate-200 dark:border-zinc-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucune étape n'a encore été ajoutée.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Décomposez votre objectif en actions simples et ordonnées.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 px-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#1E1E1E] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs"
          >
            Annuler
          </button>
          <button
            id="btn-submit-goal"
            type="submit"
            className="flex-1 py-4 px-4 rounded-2xl text-white text-sm font-medium transition-all shadow-md bg-gradient-to-br from-[#1A237E] to-[#283593] dark:from-indigo-600 dark:to-indigo-700 hover:shadow-lg hover:opacity-95"
          >
            {isEditing ? 'Enregistrer' : "Créer l'objectif"}
          </button>
        </div>
      </form>
    </div>
  );
};
