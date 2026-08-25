import React, { useState, useEffect, useRef } from 'react';
import { JournalEntry, EtatBienEtre } from '../types';
import {
  Feather,
  Sparkles,
  Mic,
  MicOff,
  Check,
  ChevronDown,
  ChevronUp,
  Smile,
  Zap,
  Coffee,
  Moon,
  CloudRain,
  Trash2,
  Edit3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../utils/audio';
import { formatFullDateHeader, parseISODate, getTodayISO } from '../utils/dateUtils';

interface DailyJournalCardProps {
  dateISO: string;
  entry?: JournalEntry;
  onSaveEntry: (entry: JournalEntry) => void;
  onDeleteEntry?: (date: string) => void;
}

interface WellBeingOption {
  key: EtatBienEtre;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  colorClass: string;
  bgSelected: string;
  darkBgSelected: string;
  borderSelected: string;
}

const WELL_BEING_OPTIONS: WellBeingOption[] = [
  {
    key: 'serein',
    label: 'Serein',
    icon: Smile,
    colorClass: 'text-emerald-700 dark:text-emerald-300',
    bgSelected: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    darkBgSelected: 'dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700/60',
    borderSelected: 'border-emerald-300 dark:border-emerald-700',
  },
  {
    key: 'en_forme',
    label: 'En forme',
    icon: Zap,
    colorClass: 'text-indigo-700 dark:text-indigo-300',
    bgSelected: 'bg-indigo-50 text-[#1A237E] border-indigo-300',
    darkBgSelected: 'dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-700/60',
    borderSelected: 'border-indigo-300 dark:border-indigo-700',
  },
  {
    key: 'neutre',
    label: 'Neutre',
    icon: Coffee,
    colorClass: 'text-slate-700 dark:text-slate-300',
    bgSelected: 'bg-slate-100 text-slate-800 border-slate-300',
    darkBgSelected: 'dark:bg-zinc-800 dark:text-slate-200 dark:border-zinc-600',
    borderSelected: 'border-slate-300 dark:border-zinc-600',
  },
  {
    key: 'fatigue',
    label: 'Fatigué',
    icon: Moon,
    colorClass: 'text-amber-700 dark:text-amber-300',
    bgSelected: 'bg-amber-50 text-amber-900 border-amber-300',
    darkBgSelected: 'dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700/60',
    borderSelected: 'border-amber-300 dark:border-amber-700',
  },
  {
    key: 'tendu',
    label: 'Tendu',
    icon: CloudRain,
    colorClass: 'text-rose-700 dark:text-rose-300',
    bgSelected: 'bg-rose-50 text-rose-900 border-rose-300',
    darkBgSelected: 'dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700/60',
    borderSelected: 'border-rose-300 dark:border-rose-700',
  },
];

export const DailyJournalCard: React.FC<DailyJournalCardProps> = ({
  dateISO,
  entry,
  onSaveEntry,
  onDeleteEntry,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => !entry);
  const [scoreBienEtre, setScoreBienEtre] = useState<EtatBienEtre | undefined>(entry?.scoreBienEtre);
  const [derouleJournee, setDerouleJournee] = useState<string>(entry?.derouleJournee || '');
  const [noteRapide, setNoteRapide] = useState<string>(entry?.noteRapide || '');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(() => !entry);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when date or external entry changes
  useEffect(() => {
    setScoreBienEtre(entry?.scoreBienEtre);
    setDerouleJournee(entry?.derouleJournee || '');
    setNoteRapide(entry?.noteRapide || '');
    setIsEditing(!entry);
    setIsExpanded(!entry);
  }, [dateISO, entry]);

  const handleSelectScore = (score: EtatBienEtre) => {
    sound.click();
    const newScore = scoreBienEtre === score ? undefined : score;
    setScoreBienEtre(newScore);
    triggerAutoSave({ score: newScore });
  };

  const triggerAutoSave = (overrides?: {
    score?: EtatBienEtre;
    deroule?: string;
    note?: string;
  }) => {
    const currentScore = overrides && 'score' in overrides ? overrides.score : scoreBienEtre;
    const currentDeroule = overrides && 'deroule' in overrides ? overrides.deroule! : derouleJournee;
    const currentNote = overrides && 'note' in overrides ? overrides.note! : noteRapide;

    // Only save if there is at least some content
    if (!currentScore && !currentDeroule.trim() && !currentNote.trim()) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const updatedEntry: JournalEntry = {
        id: entry?.id || `journal-${dateISO}`,
        date: dateISO,
        scoreBienEtre: currentScore,
        derouleJournee: currentDeroule,
        noteRapide: currentNote.trim() ? currentNote.trim() : undefined,
        createdAt: entry?.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      onSaveEntry(updatedEntry);
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2000);
    }, 400);
  };

  const handleDerouleChange = (val: string) => {
    setDerouleJournee(val);
    triggerAutoSave({ deroule: val });
  };

  const handleNoteChange = (val: string) => {
    setNoteRapide(val);
    triggerAutoSave({ note: val });
  };

  const handleManualSave = () => {
    sound.playSparkle();
    const updatedEntry: JournalEntry = {
      id: entry?.id || `journal-${dateISO}`,
      date: dateISO,
      scoreBienEtre,
      derouleJournee,
      noteRapide: noteRapide.trim() ? noteRapide.trim() : undefined,
      createdAt: entry?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
    onSaveEntry(updatedEntry);
    setHasSaved(true);
    setIsEditing(false);
    setTimeout(() => setHasSaved(false), 2500);
  };

  // Speech Recognition support for voice journaling
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas prise en charge sur ce navigateur.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'fr-FR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const updated = derouleJournee
            ? `${derouleJournee} ${transcript.trim()}`
            : transcript.trim();
          setDerouleJournee(updated);
          triggerAutoSave({ deroule: updated });
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const currentOption = WELL_BEING_OPTIONS.find((opt) => opt.key === scoreBienEtre);
  const isToday = dateISO === getTodayISO();
  const dateObj = parseISODate(dateISO);
  const hasContent = Boolean(entry && (entry.derouleJournee || entry.scoreBienEtre || entry.noteRapide));

  return (
    <div
      id="daily-journal-card"
      className="bg-white dark:bg-[#1E1E1E] rounded-3xl border border-amber-200/60 dark:border-amber-900/30 p-5 shadow-xs mb-6 relative overflow-hidden transition-all"
    >
      {/* Warm Golden Accent Strip on top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200 dark:from-amber-600 dark:via-amber-500 dark:to-amber-700 opacity-80" />

      {/* Card Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/40 group-hover:scale-105 transition-transform">
            <Feather className="w-4 h-4" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Journal du jour
                {hasSaved && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-medium animate-fade-in flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> Enregistré
                  </span>
                )}
              </h3>
              {currentOption && (
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${currentOption.bgSelected} ${currentOption.darkBgSelected}`}
                >
                  <currentOption.icon className="w-2.5 h-2.5" strokeWidth={2} />
                  {currentOption.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {isToday ? "Notes & ressenti d'aujourd'hui" : `Notes du ${formatFullDateHeader(dateObj)}`}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          {hasContent && !isEditing && isExpanded && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1"
              title="Modifier les notes"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Modifier</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            aria-label={isExpanded ? 'Replier le journal' : 'Déplier le journal'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" strokeWidth={1.5} />
            ) : (
              <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden pt-4 mt-3 border-t border-slate-100 dark:border-zinc-800/80 space-y-4"
          >
            {/* View Mode (if already saved and not in edit mode) */}
            {hasContent && !isEditing ? (
              <div className="space-y-3">
                {/* Note rapide / Gratitude banner */}
                {entry?.noteRapide && (
                  <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/40 text-xs flex items-start gap-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 dark:text-amber-300 text-[10px] uppercase tracking-wider block">
                        Victoire & Gratitude
                      </span>
                      <p className="text-slate-800 dark:text-slate-200 italic mt-0.5">
                        « {entry.noteRapide} »
                      </p>
                    </div>
                  </div>
                )}

                {/* Free Text */}
                {entry?.derouleJournee ? (
                  <div className="p-3.5 bg-slate-50/60 dark:bg-zinc-900/40 rounded-2xl border border-slate-100 dark:border-zinc-800/60 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {entry.derouleJournee}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    Aucun récit détaillé renseigné pour cette journée.
                  </p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {entry?.updatedAt
                      ? `Mis à jour à ${new Date(entry.updatedAt).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Sauvegardé'}
                  </span>

                  <div className="flex items-center gap-2">
                    {onDeleteEntry && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Voulez-vous effacer l’entrée de journal de cette date ?')) {
                            onDeleteEntry(dateISO);
                          }
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Effacer</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline px-2 py-1"
                    >
                      Modifier mes notes
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode */
              <div className="space-y-4">
                {/* 1. Well-being state chips */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    État d'esprit & bien-être
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {WELL_BEING_OPTIONS.map((opt) => {
                      const isSelected = scoreBienEtre === opt.key;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectScore(opt.key)}
                          className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl border transition-all text-center ${
                            isSelected
                              ? `${opt.bgSelected} ${opt.darkBgSelected} shadow-xs scale-102`
                              : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/60 dark:border-zinc-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 mb-1 ${
                              isSelected ? opt.colorClass : 'text-slate-400 dark:text-slate-500'
                            }`}
                            strokeWidth={1.75}
                          />
                          <span
                            className={`text-[10px] font-semibold truncate max-w-full ${
                              isSelected ? 'font-bold' : ''
                            }`}
                          >
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Quick Note / Gratitude / Daily Win */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Victoire ou gratitude du jour
                    </label>
                    <span className="text-[10px] text-slate-400">Optionnel</span>
                  </div>
                  <input
                    type="text"
                    value={noteRapide}
                    onChange={(e) => handleNoteChange(e.target.value)}
                    placeholder="Ex. Une belle marche revigorante, un projet débloqué..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200/80 dark:border-zinc-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                  />
                </div>

                {/* 3. Spacious free text with voice dictation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Récit & déroulé de la journée
                    </label>
                    <button
                      type="button"
                      onClick={toggleSpeechRecognition}
                      className={`text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/60 dark:border-amber-800/40'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3 h-3" />
                          <span>Écoute active...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3" />
                          <span>Dicter</span>
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={derouleJournee}
                    onChange={(e) => handleDerouleChange(e.target.value)}
                    placeholder="Comment s'est passée votre journée ? Ce qui a bien fonctionné, vos ressentis, vos enseignements..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200/80 dark:border-zinc-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 leading-relaxed resize-y"
                  />
                </div>

                {/* Actions & feedback bar */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Sauvegarde automatique à la saisie
                  </span>

                  <div className="flex items-center gap-2">
                    {hasContent && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-xs px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        Fermer l'édition
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleManualSave}
                      className="text-xs font-semibold px-4 py-2 bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Enregistrer</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
