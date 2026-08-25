import React, { useState } from 'react';
import { Goal, Step, AgendaEvent, JournalEntry } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Repeat,
  Bell,
  Check,
  Plus,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  X,
  FileText,
  CalendarCheck,
  Layers,
  Feather,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  getTodayISO,
  formatISODate,
  parseISODate,
  getWeekDates,
  getShortDayNameFR,
  formatFullDateHeader,
  getMonthNameFR,
  getMonthNameByIndexFR,
  formatPlannedDateFriendly,
  getMonthCalendarGrid,
  formatTimeDisplay,
  compareTimes,
} from '../utils/dateUtils';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';
import { DailyJournalCard } from './DailyJournalCard';

interface AgendaViewProps {
  goals: Goal[];
  events: AgendaEvent[];
  journalEntries: JournalEntry[];
  onSelectGoal: (goalId: string) => void;
  onNavigateToGoals: () => void;
  onUpdateGoal: (updatedGoal: Goal) => void;
  onUpdateEvents: (updatedEvents: AgendaEvent[]) => void;
  onUpdateJournalEntry: (entry: JournalEntry) => void;
  onDeleteJournalEntry?: (date: string) => void;
}

type UnifiedAgendaItem =
  | {
      type: 'goal_step';
      id: string;
      goal: Goal;
      step: Step;
      date: string;
      time?: string | null;
      fait: boolean;
      titre: string;
      details?: string;
    }
  | {
      type: 'direct_event';
      id: string;
      event: AgendaEvent;
      date: string;
      time?: string | null;
      timeEnd?: string | null;
      fait: boolean;
      titre: string;
      details?: string;
    };

export const AgendaView: React.FC<AgendaViewProps> = ({
  goals,
  events,
  journalEntries = [],
  onSelectGoal,
  onNavigateToGoals,
  onUpdateGoal,
  onUpdateEvents,
  onUpdateJournalEntry,
  onDeleteJournalEntry,
}) => {
  const todayISO = getTodayISO();
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [weekReferenceDate, setWeekReferenceDate] = useState<Date>(() => parseISODate(todayISO));
  const [monthReferenceDate, setMonthReferenceDate] = useState<Date>(() => parseISODate(todayISO));
  const [isMonthExpanded, setIsMonthExpanded] = useState(false);

  // Modal states for direct events
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitre, setEventTitre] = useState('');
  const [eventDate, setEventDate] = useState(todayISO);
  const [eventHeure, setEventHeure] = useState('');
  const [eventHeureFin, setEventHeureFin] = useState('');
  const [eventNote, setEventNote] = useState('');

  // Delete event confirmation modal
  const [eventToDelete, setEventToDelete] = useState<AgendaEvent | null>(null);

  const currentWeekDates = getWeekDates(weekReferenceDate);
  const monthGridDays = getMonthCalendarGrid(
    monthReferenceDate.getFullYear(),
    monthReferenceDate.getMonth()
  );

  // 1. Build date indices for fast lookup of scheduled steps, events, and journal entries
  const goalStepsByDate = new Map<string, { goal: Goal; step: Step }[]>();
  goals.forEach((goal) => {
    goal.etapes.forEach((step) => {
      if (step.datePlanifiee) {
        const list = goalStepsByDate.get(step.datePlanifiee) || [];
        list.push({ goal, step });
        goalStepsByDate.set(step.datePlanifiee, list);
      }
    });
  });

  const eventsByDate = new Map<string, AgendaEvent[]>();
  events.forEach((event) => {
    if (event.date) {
      const list = eventsByDate.get(event.date) || [];
      list.push(event);
      eventsByDate.set(event.date, list);
    }
  });

  const journalEntriesByDate = new Map<string, JournalEntry>();
  journalEntries.forEach((entry) => {
    if (entry.date) {
      journalEntriesByDate.set(entry.date, entry);
    }
  });

  // 2. Build unified list for the selected date
  const dayGoalSteps = goalStepsByDate.get(selectedDate) || [];
  const dayEvents = eventsByDate.get(selectedDate) || [];

  const unifiedDayItems: UnifiedAgendaItem[] = [
    ...dayGoalSteps.map(({ goal, step }) => ({
      type: 'goal_step' as const,
      id: `goal-step-${goal.id}-${step.id}`,
      goal,
      step,
      date: step.datePlanifiee!,
      time: step.heurePlanifiee || null,
      fait: step.termine,
      titre: step.texte,
      details: goal.titre,
    })),
    ...dayEvents.map((event) => ({
      type: 'direct_event' as const,
      id: `event-${event.id}`,
      event,
      date: event.date,
      time: event.heure || null,
      timeEnd: event.heureFin || null,
      fait: event.fait,
      titre: event.titre,
      details: event.note,
    })),
  ];

  // 3. Sort chronologically: untimed items first (all-day), then ascending by start time
  unifiedDayItems.sort((a, b) => compareTimes(a.time, b.time));

  const totalItemsCount = unifiedDayItems.length;
  const completedCount = unifiedDayItems.filter((item) => item.fait).length;
  const pendingCount = totalItemsCount - completedCount;

  // Handlers for Navigation
  const handleSelectDate = (dateISO: string) => {
    setSelectedDate(dateISO);
    const d = parseISODate(dateISO);
    setWeekReferenceDate(d);
  };

  const handlePreviousWeek = () => {
    const prev = new Date(weekReferenceDate);
    prev.setDate(prev.getDate() - 7);
    setWeekReferenceDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(weekReferenceDate);
    next.setDate(next.getDate() + 7);
    setWeekReferenceDate(next);
  };

  const handlePreviousMonth = () => {
    const prev = new Date(monthReferenceDate);
    prev.setMonth(prev.getMonth() - 1);
    setMonthReferenceDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(monthReferenceDate);
    next.setMonth(next.getMonth() + 1);
    setMonthReferenceDate(next);
  };

  const handleGoToToday = () => {
    const now = new Date();
    setWeekReferenceDate(now);
    setMonthReferenceDate(now);
    setSelectedDate(todayISO);
  };

  // Toggle step completion
  const handleToggleStepDone = (e: React.MouseEvent, goal: Goal, step: Step) => {
    e.stopPropagation();
    const willBeDone = !step.termine;

    if (willBeDone) {
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
    }

    const updatedSteps = goal.etapes.map((s) =>
      s.id === step.id
        ? {
            ...s,
            termine: willBeDone,
            completedAt: willBeDone ? Date.now() : undefined,
          }
        : s
    );

    const allFinished = updatedSteps.every((s) => s.termine);

    onUpdateGoal({
      ...goal,
      etapes: updatedSteps,
      completedAt: allFinished ? Date.now() : undefined,
    });
  };

  // Toggle direct event completion
  const handleToggleEventDone = (e: React.MouseEvent, event: AgendaEvent) => {
    e.stopPropagation();
    const willBeDone = !event.fait;

    if (willBeDone) {
      sound.playStepDone();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
      confetti({
        particleCount: 25,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#388E3C', '#1A237E', '#C8E6C9'],
        ticks: 80,
        scalar: 0.7,
      });
    }

    const updated = events.map((ev) =>
      ev.id === event.id ? { ...ev, fait: willBeDone } : ev
    );
    onUpdateEvents(updated);
  };

  // Open modal for new event
  const handleOpenCreateEvent = () => {
    setEditingEventId(null);
    setEventTitre('');
    setEventDate(selectedDate);
    setEventHeure('');
    setEventHeureFin('');
    setEventNote('');
    setShowEventModal(true);
  };

  // Open modal to edit existing event
  const handleOpenEditEvent = (e: React.MouseEvent, event: AgendaEvent) => {
    e.stopPropagation();
    setEditingEventId(event.id);
    setEventTitre(event.titre);
    setEventDate(event.date);
    setEventHeure(event.heure || '');
    setEventHeureFin(event.heureFin || '');
    setEventNote(event.note || '');
    setShowEventModal(true);
  };

  // Save event (create or update)
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitre.trim() || !eventDate) return;

    if (editingEventId) {
      // Update
      const updated = events.map((ev) =>
        ev.id === editingEventId
          ? {
              ...ev,
              titre: eventTitre.trim(),
              date: eventDate,
              heure: eventHeure.trim() || undefined,
              heureFin: eventHeureFin.trim() || undefined,
              note: eventNote.trim() || undefined,
            }
          : ev
      );
      onUpdateEvents(updated);
    } else {
      // Create
      const newEvent: AgendaEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        titre: eventTitre.trim(),
        date: eventDate,
        heure: eventHeure.trim() || undefined,
        heureFin: eventHeureFin.trim() || undefined,
        note: eventNote.trim() || undefined,
        fait: false,
        createdAt: Date.now(),
      };
      onUpdateEvents([...events, newEvent]);
    }

    // Sync selected date to event date so user sees their new entry immediately
    setSelectedDate(eventDate);
    setWeekReferenceDate(parseISODate(eventDate));
    setShowEventModal(false);
  };

  // Delete event
  const handleConfirmDeleteEvent = () => {
    if (!eventToDelete) return;
    const updated = events.filter((ev) => ev.id !== eventToDelete.id);
    onUpdateEvents(updated);
    setEventToDelete(null);
  };

  const selectedDateObj = parseISODate(selectedDate);
  const isSelectedToday = selectedDate === todayISO;

  return (
    <div id="agenda-screen" className="max-w-xl mx-auto px-6 py-8 pb-32">
      {/* Top Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
            Planning & Rendez-vous
          </p>
          <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Votre Agenda
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Synchronisez étapes d'objectifs et événements avec clarté.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 mt-1">
          {!isSelectedToday && (
            <button
              id="btn-agenda-today"
              type="button"
              onClick={handleGoToToday}
              className="text-xs font-semibold text-[#1A237E] dark:text-indigo-300 bg-[#1A237E]/5 dark:bg-indigo-950/60 hover:bg-[#1A237E]/10 py-2 px-3 rounded-xl transition-colors shrink-0"
            >
              Aujourd'hui
            </button>
          )}

          <button
            id="btn-new-agenda-event"
            type="button"
            onClick={handleOpenCreateEvent}
            className="flex items-center gap-1.5 py-2 px-3.5 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">Nouvel événement</span>
            <span className="sm:hidden">Événement</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Section (Collapsible Month + Horizontal Week Selector) */}
      <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-5 border border-slate-100 dark:border-zinc-800 shadow-xs mb-8 relative overflow-hidden transition-all">
        {/* Toggle between Month & Week view */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setIsMonthExpanded(!isMonthExpanded)}
            className="flex items-center gap-2 group text-left cursor-pointer focus:outline-none"
            aria-expanded={isMonthExpanded}
          >
            <div className="w-8 h-8 rounded-xl bg-[#1A237E]/5 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-400 flex items-center justify-center group-hover:bg-[#1A237E]/10 transition-colors">
              <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-sm font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                {isMonthExpanded
                  ? `${getMonthNameByIndexFR(monthReferenceDate.getMonth())} ${monthReferenceDate.getFullYear()}`
                  : `${getMonthNameFR(currentWeekDates[0])} ${
                      currentWeekDates[0].getFullYear() !== currentWeekDates[6].getFullYear()
                        ? `${currentWeekDates[0].getFullYear()} - ${currentWeekDates[6].getFullYear()}`
                        : currentWeekDates[0].getFullYear()
                    }`}
                {isMonthExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                )}
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                {isMonthExpanded ? 'Affichage mensuel' : 'Affichage hebdomadaire (cliquer pour le mois)'}
              </p>
            </div>
          </button>

          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={isMonthExpanded ? handlePreviousMonth : handlePreviousWeek}
              aria-label={isMonthExpanded ? 'Mois précédent' : 'Semaine précédente'}
              className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={isMonthExpanded ? handleNextMonth : handleNextWeek}
              aria-label={isMonthExpanded ? 'Mois suivant' : 'Semaine suivante'}
              className="p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Expandable Monthly Calendar Grid */}
        <AnimatePresence>
          {isMonthExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden mb-5 pt-2 border-t border-slate-100 dark:border-zinc-800/80"
            >
              {/* Day headers */}
              <div className="grid grid-cols-7 text-center mb-2">
                {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((d) => (
                  <span
                    key={d}
                    className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider"
                  >
                    {d}
                  </span>
                ))}
              </div>

              {/* Month matrix cells */}
              <div className="grid grid-cols-7 gap-1">
                {monthGridDays.map((day) => {
                  const isSelected = day.dateISO === selectedDate;
                  const hasSteps = (goalStepsByDate.get(day.dateISO) || []).length > 0;
                  const hasDirectEvents = (eventsByDate.get(day.dateISO) || []).length > 0;
                  const hasJournal = Boolean(journalEntriesByDate.get(day.dateISO));

                  return (
                    <button
                      key={day.dateISO}
                      type="button"
                      onClick={() => handleSelectDate(day.dateISO)}
                      className={`relative flex flex-col items-center justify-center h-10 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-[#1A237E] dark:bg-indigo-600 text-white font-bold shadow-xs'
                          : day.isToday
                          ? 'bg-[#1A237E]/5 dark:bg-indigo-950/40 text-[#1A237E] dark:text-indigo-300 font-bold'
                          : day.isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          : 'text-slate-300 dark:text-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <span className="text-xs">{day.dayNumber}</span>
                      {/* Dots indicators */}
                      <div className="flex items-center gap-0.5 mt-0.5 h-1">
                        {hasSteps && (
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-white' : 'bg-[#1A237E] dark:bg-indigo-400'
                            }`}
                            title="Étapes d'objectifs"
                          />
                        )}
                        {hasDirectEvents && (
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-emerald-200' : 'bg-[#388E3C] dark:bg-emerald-400'
                            }`}
                            title="Événements"
                          />
                        )}
                        {hasJournal && (
                          <span
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-amber-200' : 'bg-amber-500 dark:bg-amber-400'
                            }`}
                            title="Journal du jour"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800/60 text-[11px] text-slate-400 dark:text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A237E] dark:bg-indigo-400 inline-block" />
                    Étapes
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#388E3C] dark:bg-emerald-400 inline-block" />
                    Événements
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 inline-block" />
                    Journal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMonthExpanded(false)}
                  className="text-[#1A237E] dark:text-indigo-400 font-medium hover:underline"
                >
                  Replier
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Horizontal 7-Days Week Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {currentWeekDates.map((date) => {
            const dateISO = formatISODate(date);
            const isSelected = dateISO === selectedDate;
            const isDateToday = dateISO === todayISO;
            const stepCount = (goalStepsByDate.get(dateISO) || []).length;
            const eventCount = (eventsByDate.get(dateISO) || []).length;
            const hasJournal = Boolean(journalEntriesByDate.get(dateISO));
            const hasItems = stepCount > 0 || eventCount > 0 || hasJournal;

            return (
              <button
                key={dateISO}
                type="button"
                onClick={() => handleSelectDate(dateISO)}
                className={`flex flex-col items-center py-2.5 sm:py-3 px-1 rounded-2xl transition-all relative ${
                  isSelected
                    ? 'bg-[#1A237E] dark:bg-indigo-600 text-white shadow-md shadow-[#1A237E]/20 scale-105'
                    : isDateToday
                    ? 'bg-[#1A237E]/5 dark:bg-indigo-950/40 text-slate-800 dark:text-slate-200 hover:bg-[#1A237E]/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider ${
                    isSelected
                      ? 'text-white/80'
                      : isDateToday
                      ? 'text-[#1A237E] dark:text-indigo-400 font-bold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {getShortDayNameFR(date)}
                </span>
                <span
                  className={`text-sm sm:text-base font-bold mt-1 ${
                    isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Dot indicator */}
                <div className="h-1.5 mt-1 flex items-center justify-center gap-0.5">
                  {stepCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-[#1A237E] dark:bg-indigo-400'
                      }`}
                    />
                  )}
                  {eventCount > 0 && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-emerald-200' : 'bg-[#388E3C] dark:bg-emerald-400'
                      }`}
                    />
                  )}
                  {hasJournal && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-amber-200' : 'bg-amber-500 dark:bg-amber-400'
                      }`}
                      title="Journal rédigé"
                    />
                  )}
                  {!hasItems && <span className="w-1.5 h-1.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Journal / Notes du jour for Selected Date */}
      <div className="mb-6">
        <DailyJournalCard
          dateISO={selectedDate}
          entry={journalEntriesByDate.get(selectedDate)}
          onSaveEntry={onUpdateJournalEntry}
          onDeleteEntry={onDeleteJournalEntry}
        />
      </div>

      {/* Selected Day Status Bar */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div>
          <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 capitalize">
            {formatFullDateHeader(selectedDateObj)}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {totalItemsCount === 0
              ? 'Aucun élément planifié'
              : `${totalItemsCount} ${totalItemsCount === 1 ? 'élément prévu' : 'éléments prévus'}${
                  completedCount > 0
                    ? ` • ${completedCount} terminé${completedCount > 1 ? 's' : ''}`
                    : ''
                }`}
          </p>
        </div>

        {totalItemsCount > 0 && pendingCount === 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#388E3C] dark:text-emerald-400 bg-[#388E3C]/10 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3 h-3" strokeWidth={1.5} />
            Journée complétée
          </span>
        )}
      </div>

      {/* Unified Chronological List for Selected Day */}
      <div className="space-y-3.5">
        <AnimatePresence mode="popLayout">
          {unifiedDayItems.map((item) => {
            if (item.type === 'goal_step') {
              const { goal, step } = item;
              const isRecurring = goal.recurrence && goal.recurrence !== 'none';
              const totalGoalSteps = goal.etapes.length;

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  onClick={() => onSelectGoal(goal.id)}
                  className={`group relative p-5 bg-white dark:bg-[#1E1E1E] rounded-3xl border transition-all cursor-pointer shadow-xs hover:shadow-md hover:border-[#1A237E]/20 dark:hover:border-indigo-500/30 ${
                    step.termine
                      ? 'border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 opacity-80'
                      : 'border-slate-100/90 dark:border-zinc-800'
                  }`}
                >
                  {/* Left accent bar (Deep Navy / Indigo for Goal Steps) */}
                  <div
                    className={`absolute top-4 bottom-4 left-0 w-1 rounded-r-full transition-all ${
                      step.termine
                        ? 'bg-[#388E3C] dark:bg-emerald-500'
                        : 'bg-[#1A237E] dark:bg-indigo-500 opacity-60 group-hover:opacity-100'
                    }`}
                  />

                  <div className="flex items-start gap-3.5 pl-1">
                    {/* Completion Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleStepDone(e, goal, step)}
                      aria-label={
                        step.termine
                          ? 'Marquer comme non terminé'
                          : 'Marquer comme terminé'
                      }
                      title={
                        step.termine ? 'Marquer à refaire' : 'Valider cette étape'
                      }
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        step.termine
                          ? 'bg-[#388E3C] dark:bg-emerald-500 text-white shadow-xs'
                          : 'border-2 border-slate-300 dark:border-zinc-600 hover:border-[#1A237E] dark:hover:border-indigo-400 text-transparent hover:text-slate-300'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    {/* Main Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A237E]/5 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                          <Target className="w-2.5 h-2.5" />
                          Étape d'objectif
                        </span>

                        <span className="text-xs font-serif font-bold text-slate-800 dark:text-slate-200 truncate">
                          {goal.titre}
                        </span>

                        {isRecurring && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-md">
                            <Repeat className="w-2.5 h-2.5" strokeWidth={1.5} />
                            {goal.recurrence === 'daily'
                              ? 'Quotidien'
                              : goal.recurrence === 'weekly'
                              ? 'Hebdo'
                              : 'Mensuel'}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                          Étape {step.ordre}/{totalGoalSteps}
                        </span>
                      </div>

                      {/* Step Text */}
                      <p
                        className={`text-sm leading-snug transition-colors ${
                          step.termine
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-700 dark:text-slate-200 font-medium group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}
                      >
                        {step.texte}
                      </p>

                      {/* Time badges */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]">
                        {step.heurePlanifiee ? (
                          <div className="flex items-center gap-1 text-[#1A237E] dark:text-indigo-300 font-semibold bg-[#1A237E]/5 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeDisplay(step.heurePlanifiee)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                            Sans horaire précis
                          </span>
                        )}

                        {step.reminderAt && (
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Bell className="w-3 h-3 text-[#1A237E] dark:text-indigo-400" />
                            <span>
                              Rappel à{' '}
                              {new Date(step.reminderAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Arrow to detail */}
                    <div className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-[#1A237E] dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all self-center">
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </div>
                </motion.div>
              );
            }

            // Direct Agenda Event Card
            const { event } = item;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`group relative p-5 bg-white dark:bg-[#1E1E1E] rounded-3xl border transition-all shadow-xs hover:shadow-md ${
                  event.fait
                    ? 'border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 opacity-80'
                    : 'border-slate-100/90 dark:border-zinc-800'
                }`}
              >
                {/* Left accent bar (Cedar Green for Direct Events) */}
                <div
                  className={`absolute top-4 bottom-4 left-0 w-1 rounded-r-full transition-all ${
                    event.fait
                      ? 'bg-[#388E3C] dark:bg-emerald-500'
                      : 'bg-[#388E3C] dark:bg-emerald-500 opacity-60 group-hover:opacity-100'
                  }`}
                />

                <div className="flex items-start gap-3.5 pl-1">
                  {/* Completion Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleEventDone(e, event)}
                    aria-label={
                      event.fait
                        ? 'Marquer comme non terminé'
                        : 'Marquer comme terminé'
                    }
                    title={
                      event.fait ? 'Marquer à refaire' : 'Valider cet événement'
                    }
                    className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      event.fait
                        ? 'bg-[#388E3C] dark:bg-emerald-500 text-white shadow-xs'
                        : 'border-2 border-slate-300 dark:border-zinc-600 hover:border-[#388E3C] dark:hover:border-emerald-400 text-transparent hover:text-slate-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  {/* Main Event Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#388E3C]/10 dark:bg-emerald-950/60 text-[#2E7D32] dark:text-emerald-300 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        <CalendarCheck className="w-2.5 h-2.5" />
                        Événement direct
                      </span>

                      {event.heure ? (
                        <div className="flex items-center gap-1 text-[#2E7D32] dark:text-emerald-300 font-semibold text-xs">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeDisplay(event.heure, event.heureFin)}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          Toute la journée
                        </span>
                      )}
                    </div>

                    {/* Event Title */}
                    <h4
                      className={`text-base font-semibold leading-snug transition-colors ${
                        event.fait
                          ? 'text-slate-400 dark:text-slate-500 line-through'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {event.titre}
                    </h4>

                    {/* Event Note/Details */}
                    {event.note && (
                      <p
                        className={`text-xs mt-1.5 leading-relaxed ${
                          event.fait
                            ? 'text-slate-400 dark:text-slate-600'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {event.note}
                      </p>
                    )}
                  </div>

                  {/* Edit and Delete Actions */}
                  <div className="flex items-center gap-1 shrink-0 self-start mt-0.5">
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditEvent(e, event)}
                      aria-label="Modifier cet événement"
                      title="Modifier"
                      className="p-1.5 text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-300 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEventToDelete(event);
                      }}
                      aria-label="Supprimer cet événement"
                      title="Supprimer"
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty State */}
        {totalItemsCount === 0 && (
          <div className="py-14 px-6 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-[#1A237E]/5 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" strokeWidth={1.5} />
            </div>
            <h4 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
              Rien de planifié pour ce jour
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-5 leading-relaxed">
              Profitez d'une respiration ou ajoutez un événement ponctuel ou l'étape d'un objectif.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={handleOpenCreateEvent}
                className="py-2.5 px-4 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer un événement</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToGoals}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Mes objectifs</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Direct Event Creation / Editing Modal */}
      <AnimatePresence>
        {showEventModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-zinc-800 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A237E] dark:bg-indigo-500" />

              <div className="flex items-center justify-between mb-5 pl-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1A237E]/5 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-400 flex items-center justify-center">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
                      Agenda
                    </p>
                    <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100">
                      {editingEventId ? 'Modifier l’événement' : 'Nouvel événement autonome'}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                {/* Titre */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Titre de l’événement *
                  </label>
                  <input
                    type="text"
                    required
                    value={eventTitre}
                    onChange={(e) => setEventTitre(e.target.value)}
                    placeholder="Ex. Rendez-vous médecin, Point équipe..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setEventDate(getTodayISO())}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-[#1A237E]/10 hover:text-[#1A237E] transition-colors"
                    >
                      Aujourd'hui
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tom = new Date();
                        tom.setDate(tom.getDate() + 1);
                        setEventDate(formatISODate(tom));
                      }}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-[#1A237E]/10 hover:text-[#1A237E] transition-colors"
                    >
                      Demain
                    </button>
                  </div>
                </div>

                {/* Horaires : Début et Fin */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Heure de début
                    </label>
                    <input
                      type="time"
                      value={eventHeure}
                      onChange={(e) => setEventHeure(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Heure de fin
                    </label>
                    <input
                      type="time"
                      value={eventHeureFin}
                      onChange={(e) => setEventHeureFin(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                    />
                  </div>
                </div>

                {/* Quick time presets */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEventHeure('09:00');
                      setEventHeureFin('10:00');
                    }}
                    className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-[11px] text-slate-600 dark:text-slate-300 hover:border-[#1A237E] transition-colors"
                  >
                    Matin (09h-10h)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventHeure('14:30');
                      setEventHeureFin('15:30');
                    }}
                    className="px-2 py-0.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-md text-[11px] text-slate-600 dark:text-slate-300 hover:border-[#1A237E] transition-colors"
                  >
                    Après-midi (14h30)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEventHeure('');
                      setEventHeureFin('');
                    }}
                    className="px-2 py-0.5 text-slate-400 hover:text-rose-500 text-[11px]"
                  >
                    Effacer horaire
                  </button>
                </div>

                {/* Note ou description */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Note ou description courte
                  </label>
                  <textarea
                    rows={2}
                    value={eventNote}
                    onChange={(e) => setEventNote(e.target.value)}
                    placeholder="Lieu, documents à apporter, détails..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#252525] rounded-xl border border-slate-200 dark:border-zinc-700 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="py-3 px-4 rounded-xl text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!eventTitre.trim() || !eventDate}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors"
                  >
                    {editingEventId ? 'Mettre à jour' : 'Ajouter à l’agenda'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Event Confirmation Modal */}
      <AnimatePresence>
        {eventToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setEventToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-xl text-center relative overflow-hidden"
            >
              <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 mb-2">
                Supprimer cet événement ?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                "{eventToDelete.titre}" sera définitivement supprimé de votre agenda.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEventToDelete(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteEvent}
                  className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
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
