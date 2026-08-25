import React, { useState, useEffect } from 'react';
import {
  Goal,
  FinancialData,
  AppScreen,
  AgendaEvent,
  IdeeProjet,
  Reve,
  JournalEntry,
} from './types';
import {
  getStoredGoals,
  saveStoredGoals,
  resetToSampleGoals,
  getStoredFinances,
  saveStoredFinances,
  getStoredAgendaEvents,
  saveStoredAgendaEvents,
  getStoredIdees,
  saveStoredIdees,
  resetToSampleIdees,
  getStoredReves,
  saveStoredReves,
  resetToSampleReves,
  getStoredJournal,
  saveStoredJournal,
  checkDueReminders,
  syncGoalToDebt,
  syncDebtToGoal,
} from './utils/storage';
import { triggerStepNotification } from './utils/notifications';
import { Header } from './components/Header';
import { GoalListView } from './components/GoalListView';
import { GoalDetailView } from './components/GoalDetailView';
import { GoalFormView } from './components/GoalFormView';
import { AgendaView } from './components/AgendaView';
import { FinancesView } from './components/FinancesView';
import { IdeasView } from './components/IdeasView';
import { DreamsView } from './components/DreamsView';
import { BottomNav, MainTab } from './components/BottomNav';
import { NotificationBanner } from './components/NotificationBanner';
import { BackupModal } from './components/BackupModal';
import { VoiceAgentWidget } from './components/VoiceAgentWidget';
import { AnimatePresence, motion } from 'motion/react';

export default function App() {
  const [goals, setGoals] = useState<Goal[]>(() => getStoredGoals());
  const [finances, setFinances] = useState<FinancialData>(() => getStoredFinances());
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>(() => getStoredAgendaEvents());
  const [idees, setIdees] = useState<IdeeProjet[]>(() => {
    try {
      const data = getStoredIdees();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erreur initialisation idées:', err);
      return [];
    }
  });
  const [reves, setReves] = useState<Reve[]>(() => {
    try {
      const data = getStoredReves();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Erreur initialisation rêves:', err);
      return [];
    }
  });
  const [journal, setJournal] = useState<JournalEntry[]>(() => getStoredJournal());

  const [screen, setScreen] = useState<AppScreen>({ type: 'list' });
  const [lastMainTab, setLastMainTab] = useState<MainTab>('goals');
  const [showBackupModal, setShowBackupModal] = useState<boolean>(false);

  // Keep localStorage synchronized whenever entities change
  useEffect(() => {
    saveStoredGoals(goals);
  }, [goals]);

  useEffect(() => {
    saveStoredFinances(finances);
  }, [finances]);

  useEffect(() => {
    saveStoredAgendaEvents(agendaEvents);
  }, [agendaEvents]);

  useEffect(() => {
    saveStoredIdees(idees);
  }, [idees]);

  useEffect(() => {
    saveStoredReves(reves);
  }, [reves]);

  useEffect(() => {
    saveStoredJournal(journal);
  }, [journal]);

  // Periodic check for due step reminders
  useEffect(() => {
    const interval = setInterval(() => {
      setGoals((currentGoals) => {
        const { updatedGoals, hasTriggered } = checkDueReminders(
          currentGoals,
          (goal, step) => {
            triggerStepNotification(goal, step);
          }
        );
        return hasTriggered ? updatedGoals : currentGoals;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === updatedGoal.id ? updatedGoal : g))
    );

    // If this goal is linked to a debt, sync debt repayment
    if (updatedGoal.linkedDebtId) {
      setFinances((prevFinances) => syncGoalToDebt(updatedGoal, prevFinances));
    }
  };

  const handleUpdateFinances = (updatedFinances: FinancialData) => {
    setFinances(updatedFinances);

    // Sync any linked debts to their corresponding goals
    setGoals((prevGoals) => {
      let nextGoals = [...prevGoals];
      updatedFinances.dettes.forEach((debt) => {
        if (debt.linkedGoalId) {
          nextGoals = syncDebtToGoal(debt, nextGoals);
        }
      });
      return nextGoals;
    });
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    // Remove any link in dreams
    setReves((prev) =>
      prev.map((r) => ({
        ...r,
        objectifsAssociesIds: r.objectifsAssociesIds.filter((id) => id !== goalId),
      }))
    );

    handleBackToMain();
  };

  const handleSaveGoal = (goal: Goal) => {
    const exists = goals.some((g) => g.id === goal.id);
    if (exists) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
    } else {
      setGoals((prev) => [goal, ...prev]);

      // If created from an idea, mark that idea as converted
      if (screen.type === 'create' && screen.initialTitle) {
        setIdees((prev) =>
          prev.map((item) =>
            item.titre.trim().toLowerCase() === screen.initialTitle?.trim().toLowerCase()
              ? { ...item, convertieEnObjectifId: goal.id }
              : item
          )
        );
      }

      // If linked to a dream, record association in dream
      if (goal.linkedDreamId) {
        setReves((prev) =>
          prev.map((r) =>
            r.id === goal.linkedDreamId
              ? {
                  ...r,
                  objectifsAssociesIds: r.objectifsAssociesIds.includes(goal.id)
                    ? r.objectifsAssociesIds
                    : [...r.objectifsAssociesIds, goal.id],
                }
              : r
          )
        );
      }
    }
    setScreen({ type: 'detail', goalId: goal.id });
  };

  const handleResetSamples = () => {
    const samples = resetToSampleGoals();
    setGoals(samples);
  };

  const handleNavigateToGoalDetail = (goalId: string) => {
    if (screen.type === 'agenda') {
      setLastMainTab('agenda');
    } else if (screen.type === 'finances') {
      setLastMainTab('finances');
    } else if (screen.type === 'idees') {
      setLastMainTab('idees');
    } else if (screen.type === 'reves') {
      setLastMainTab('reves');
    } else if (screen.type === 'list') {
      setLastMainTab('goals');
    }
    setScreen({ type: 'detail', goalId });
  };

  const handleBackToMain = () => {
    if (lastMainTab === 'agenda') {
      setScreen({ type: 'agenda' });
    } else if (lastMainTab === 'finances') {
      setScreen({ type: 'finances' });
    } else if (lastMainTab === 'idees') {
      setScreen({ type: 'idees' });
    } else if (lastMainTab === 'reves') {
      setScreen({ type: 'reves' });
    } else {
      setScreen({ type: 'list' });
    }
  };

  const handleChangeTab = (tab: MainTab) => {
    setLastMainTab(tab);
    if (tab === 'goals') {
      setScreen({ type: 'list' });
    } else if (tab === 'agenda') {
      setScreen({ type: 'agenda' });
    } else if (tab === 'finances') {
      setScreen({ type: 'finances' });
    } else if (tab === 'idees') {
      setScreen({ type: 'idees' });
    } else if (tab === 'reves') {
      setScreen({ type: 'reves' });
    }
  };

  // Transform idea to goal
  const handleTransformIdeaToGoal = (idea: IdeeProjet) => {
    setLastMainTab('idees');
    setScreen({
      type: 'create',
      initialTitle: idea.titre,
      initialNotes: idea.notes,
    });
  };

  // Derive goal from dream
  const handleDeriveGoalFromDream = (dream: Reve) => {
    setLastMainTab('reves');
    setScreen({
      type: 'create',
      linkedDreamId: dream.id,
      initialTitle: `Étape pour : ${dream.titre}`,
      initialNotes: dream.motivation,
    });
  };

  // Find currently active goal for detail or edit screens
  const currentGoal =
    screen.type === 'detail' || screen.type === 'edit'
      ? goals.find((g) => g.id === screen.goalId)
      : undefined;

  // Total scheduled steps & direct events for badge
  const totalScheduledPendingSteps =
    goals.reduce((acc, g) => {
      return (
        acc +
        g.etapes.filter((s) => s.datePlanifiee && !s.termine).length
      );
    }, 0) + agendaEvents.filter((e) => !e.fait).length;

  // Compute Header properties
  let headerTitle = 'Un Pas.';
  let showBack = false;

  if (screen.type === 'agenda') {
    headerTitle = 'Agenda';
    showBack = false;
  } else if (screen.type === 'finances') {
    headerTitle = 'Finances';
    showBack = false;
  } else if (screen.type === 'idees') {
    headerTitle = 'Idées & Projets';
    showBack = false;
  } else if (screen.type === 'reves') {
    headerTitle = 'Rêves & Visions';
    showBack = false;
  } else if (screen.type === 'detail') {
    headerTitle = currentGoal ? currentGoal.titre : 'Détail';
    showBack = true;
  } else if (screen.type === 'create') {
    headerTitle = 'Nouvel objectif';
    showBack = true;
  } else if (screen.type === 'edit') {
    headerTitle = 'Modifier l’objectif';
    showBack = true;
  }

  const isMainScreen =
    screen.type === 'list' ||
    screen.type === 'agenda' ||
    screen.type === 'finances' ||
    screen.type === 'idees' ||
    screen.type === 'reves';

  const currentTab: MainTab =
    screen.type === 'finances'
      ? 'finances'
      : screen.type === 'agenda'
      ? 'agenda'
      : screen.type === 'idees'
      ? 'idees'
      : screen.type === 'reves'
      ? 'reves'
      : 'goals';

  const handleUpdateJournalEntry = (entry: JournalEntry) => {
    setJournal((prev) => {
      const idx = prev.findIndex((j) => j.date === entry.date);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [entry, ...prev];
    });
  };

  const handleDeleteJournalEntry = (date: string) => {
    setJournal((prev) => prev.filter((j) => j.date !== date));
  };

  const handleRestoreData = (data: {
    goals: Goal[];
    finances: FinancialData;
    agendaEvents: AgendaEvent[];
    idees: IdeeProjet[];
    reves: Reve[];
    journal?: JournalEntry[];
  }) => {
    setGoals(data.goals);
    setFinances(data.finances);
    setAgendaEvents(data.agendaEvents);
    setIdees(data.idees);
    setReves(data.reves);
    if (data.journal) {
      setJournal(data.journal);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#121212] text-slate-800 dark:text-slate-100 flex flex-col justify-between selection:bg-[#1A237E]/20 selection:text-[#1A237E] font-sans transition-colors duration-200">
      <NotificationBanner
        onNavigateToGoal={(goalId) => handleNavigateToGoalDetail(goalId)}
      />

      <Header
        title={headerTitle}
        showBack={showBack}
        onBack={handleBackToMain}
        onOpenBackup={() => setShowBackupModal(true)}
      />

      <main className="flex-1 w-full relative pb-nav-safe">
        <AnimatePresence mode="wait">
          {screen.type === 'list' && (
            <motion.div
              key="screen-list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <GoalListView
                goals={goals}
                onSelectGoal={handleNavigateToGoalDetail}
                onCreateGoal={() => setScreen({ type: 'create' })}
                onResetSamples={handleResetSamples}
              />
            </motion.div>
          )}

          {screen.type === 'agenda' && (
            <motion.div
              key="screen-agenda"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <AgendaView
                goals={goals}
                events={agendaEvents}
                journalEntries={journal}
                onSelectGoal={handleNavigateToGoalDetail}
                onNavigateToGoals={() => handleChangeTab('goals')}
                onUpdateGoal={handleUpdateGoal}
                onUpdateEvents={setAgendaEvents}
                onUpdateJournalEntry={handleUpdateJournalEntry}
                onDeleteJournalEntry={handleDeleteJournalEntry}
              />
            </motion.div>
          )}

          {screen.type === 'finances' && (
            <motion.div
              key="screen-finances"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <FinancesView
                finances={finances}
                onUpdateFinances={handleUpdateFinances}
                goals={goals}
                onUpdateGoals={setGoals}
                onSelectGoal={handleNavigateToGoalDetail}
              />
            </motion.div>
          )}

          {screen.type === 'idees' && (
            <motion.div
              key="screen-idees"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <IdeasView
                idees={idees}
                onUpdateIdees={setIdees}
                goals={goals}
                onTransformToGoal={handleTransformIdeaToGoal}
                onNavigateToGoal={handleNavigateToGoalDetail}
                onResetSampleIdeas={() => setIdees(resetToSampleIdees())}
              />
            </motion.div>
          )}

          {screen.type === 'reves' && (
            <motion.div
              key="screen-reves"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            >
              <DreamsView
                reves={reves}
                onUpdateReves={setReves}
                goals={goals}
                onDeriveGoal={handleDeriveGoalFromDream}
                onNavigateToGoal={handleNavigateToGoalDetail}
                onResetSampleDreams={() => setReves(resetToSampleReves())}
              />
            </motion.div>
          )}

          {screen.type === 'detail' && currentGoal && (
            <motion.div
              key={`screen-detail-${currentGoal.id}`}
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            >
              <GoalDetailView
                goal={currentGoal}
                onUpdateGoal={handleUpdateGoal}
                onDeleteGoal={handleDeleteGoal}
                onEditGoal={(goalId) => setScreen({ type: 'edit', goalId })}
                onBack={handleBackToMain}
                dreams={reves}
              />
            </motion.div>
          )}

          {screen.type === 'create' && (
            <motion.div
              key="screen-create"
              initial={{ opacity: 0, y: 24, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            >
              <GoalFormView
                initialTitle={screen.initialTitle}
                initialNotes={screen.initialNotes}
                linkedDreamId={screen.linkedDreamId}
                onSave={handleSaveGoal}
                onCancel={handleBackToMain}
              />
            </motion.div>
          )}

          {screen.type === 'edit' && currentGoal && (
            <motion.div
              key={`screen-edit-${currentGoal.id}`}
              initial={{ opacity: 0, y: 24, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.99 }}
              transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
            >
              <GoalFormView
                initialGoal={currentGoal}
                onSave={handleSaveGoal}
                onCancel={() => setScreen({ type: 'detail', goalId: currentGoal.id })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 5-Tab Navigation Bar */}
      {isMainScreen && (
        <BottomNav
          activeTab={currentTab}
          onChangeTab={handleChangeTab}
          scheduledCount={totalScheduledPendingSteps}
        />
      )}

      {/* Backup and Restore Modal */}
      <BackupModal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        goals={goals}
        finances={finances}
        agendaEvents={agendaEvents}
        idees={idees}
        reves={reves}
        journal={journal}
        onRestoreData={handleRestoreData}
      />
      <VoiceAgentWidget />
    </div>
  );
}
