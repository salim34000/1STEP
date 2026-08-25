import {
  Goal,
  Step,
  FinancialData,
  Debt,
  AgendaEvent,
  IdeeProjet,
  Reve,
  JournalEntry,
  BackupData,
} from '../types';
import { shiftReminderForRecurrence } from './notifications';
import { getTodayISO, formatISODate } from './dateUtils';

const STORAGE_KEY = 'une_etape_objectifs_v1';
const FINANCES_STORAGE_KEY = 'une_etape_finances_v1';
const AGENDA_EVENTS_STORAGE_KEY = 'evenementsAgenda';
const IDEES_STORAGE_KEY = 'une_etape_idees_v1';
const REVES_STORAGE_KEY = 'une_etape_reves_v1';
const JOURNAL_STORAGE_KEY = 'une_etape_journal_v1';

const today = new Date();
const tomorrow = new Date(Date.now() + 86400000);
const dayAfter = new Date(Date.now() + 86400000 * 2);
const yesterday = new Date(Date.now() - 86400000);

export const DEFAULT_JOURNAL: JournalEntry[] = [
  {
    id: `journal-${getTodayISO()}`,
    date: getTodayISO(),
    scoreBienEtre: 'serein',
    derouleJournee: 'Matinée claire et productive consacrée aux priorités. Pause marche vivifiante l’après-midi. Une belle sensation d’avancer pas à pas sans surcharge.',
    noteRapide: 'Gratitude pour le calme retrouvé et un temps de lecture précieux.',
    createdAt: Date.now() - 3600000 * 4,
    updatedAt: Date.now() - 3600000 * 4,
  },
  {
    id: `journal-${formatISODate(yesterday)}`,
    date: formatISODate(yesterday),
    scoreBienEtre: 'en_forme',
    derouleJournee: 'Excellente séance de sport matinale. Avancé sur l’organisation de la semaine et finalisé les démarches administratives.',
    noteRapide: 'Victoire : dossier administratif entièrement bouclé !',
    createdAt: Date.now() - 86400000 - 3600000 * 2,
    updatedAt: Date.now() - 86400000 - 3600000 * 2,
  },
];

export const DEFAULT_AGENDA_EVENTS: AgendaEvent[] = [
  {
    id: 'evt-1',
    titre: 'Point d’organisation & priorités du jour',
    date: getTodayISO(),
    heure: '09:00',
    heureFin: '09:30',
    note: 'Faire le point sur les 3 tâches essentielles avec sérénité',
    fait: false,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'evt-2',
    titre: 'Rendez-vous médical de contrôle annuel',
    date: formatISODate(tomorrow),
    heure: '14:30',
    heureFin: '15:15',
    note: 'Cabinet Dr. Martin - apporter les résultats d’analyses',
    fait: false,
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'evt-3',
    titre: 'Pause respiration & marche en plein air',
    date: formatISODate(dayAfter),
    heure: '17:30',
    heureFin: '18:00',
    note: 'Déconnexion totale des écrans',
    fait: false,
    createdAt: Date.now() - 86400000 * 2,
  },
];

export const DEFAULT_IDEES: IdeeProjet[] = [
  {
    id: 'idee-1',
    titre: 'Lancer une newsletter mensuelle sur le minimalisme numérique',
    categorie: 'Business',
    notes: 'Idées de rubriques : curation d’outils zens, retours d’expérience concrets, interviews courtes de 3 questions.',
    dateCreation: Date.now() - 86400000 * 5,
  },
  {
    id: 'idee-2',
    titre: 'Participer à mon premier semi-marathon en nature',
    categorie: 'Sport',
    notes: 'Se procurer de bonnes chaussures amorties, suivre un plan d’entraînement progressif sur 12 semaines avec fractionné le mardi.',
    dateCreation: Date.now() - 86400000 * 3,
  },
  {
    id: 'idee-3',
    titre: 'Créer un carnet de croquis et d’aquarelle de voyage',
    categorie: 'Créatif',
    notes: 'Format A5 papier coton 300g, palette compacte 12 godets, peindre 1 croquis par semaine sans chercher la perfection.',
    dateCreation: Date.now() - 86400000 * 8,
  },
  {
    id: 'idee-4',
    titre: 'Apprendre les bases de la menuiserie et du travail du bois',
    categorie: 'Personnel',
    notes: 'Visiter l’atelier partagé du quartier, fabriquer une étagère en chêne massif pour mon espace de travail.',
    dateCreation: Date.now() - 86400000 * 12,
  },
];

export const DEFAULT_REVES: Reve[] = [
  {
    id: 'reve-1',
    titre: 'Vivre 6 mois dans une maison côtière pour écrire en profondeur',
    horizon: '3 à 5 ans',
    motivation: 'Trouver un calme intérieur absolu, bercé par le ressac de l’océan, et me consacrer à la création littéraire sans dispersion.',
    objectifsAssociesIds: [],
    dateCreation: Date.now() - 86400000 * 30,
  },
  {
    id: 'reve-2',
    titre: 'Atteindre une liberté temporelle et créative intégrale',
    horizon: '10 ans',
    motivation: 'Ne travailler que sur des projets qui nourrissent l’âme, passer un temps précieux avec mes proches et transmettre ce que j’ai appris.',
    objectifsAssociesIds: [],
    dateCreation: Date.now() - 86400000 * 60,
  },
  {
    id: 'reve-3',
    titre: 'Traverser les Alpes à pied sur la Grande Traversée (GR5)',
    horizon: 'Dans 1 an',
    motivation: 'Dépasser mes limites physiques dans l’humilité de la haute montagne et vivre une immersion totale en autonomie.',
    objectifsAssociesIds: [],
    dateCreation: Date.now() - 86400000 * 15,
  },
];

export const DEFAULT_FINANCES: FinancialData = {
  soldes: {
    compteBancaire: 2450.0,
    especes: 120.0,
  },
  rentrees: [
    {
      id: 'inc-1',
      libelle: 'Virement Salaire / Prestation',
      montant: 1850.0,
      datePrevue: formatISODate(new Date(Date.now() + 86400000 * 4)),
      accountTarget: 'compteBancaire',
    },
    {
      id: 'inc-2',
      libelle: 'Remboursement Mutuelle Santé',
      montant: 65.5,
      datePrevue: formatISODate(new Date(Date.now() + 86400000 * 2)),
      accountTarget: 'compteBancaire',
    },
  ],
  depenses: [
    {
      id: 'exp-1',
      libelle: 'Loyer & Charges appartement',
      montant: 720.0,
      datePrevue: formatISODate(new Date(Date.now() + 86400000 * 6)),
      accountTarget: 'compteBancaire',
    },
    {
      id: 'exp-2',
      libelle: 'Courses alimentaires fraîches',
      montant: 85.0,
      datePrevue: getTodayISO(),
      accountTarget: 'compteBancaire',
    },
    {
      id: 'exp-3',
      libelle: 'Abonnement Internet & Mobile',
      montant: 39.99,
      datePrevue: formatISODate(new Date(Date.now() + 86400000 * 8)),
      accountTarget: 'compteBancaire',
    },
  ],
  dettes: [
    {
      id: 'debt-1',
      creancier: 'Julien (Avance voyage)',
      montantTotal: 450.0,
      montantRembourse: 300.0,
      note: 'Remboursement mensuel 50€',
    },
    {
      id: 'debt-2',
      creancier: 'Famille (Prêt équipement)',
      montantTotal: 1200.0,
      montantRembourse: 600.0,
      note: 'Sans intérêts',
    },
  ],
};

export const DEFAULT_GOALS: Goal[] = [
  {
    id: 'goal-routine',
    titre: 'Routine matinale de vitalité',
    createdAt: Date.now() - 86400000 * 2,
    recurrence: 'daily',
    cycleCount: 4,
    etapes: [
      {
        id: 'rt-1',
        texte: 'Boire un grand verre d’eau tiède avec du citron',
        ordre: 1,
        termine: false,
        datePlanifiee: getTodayISO(),
        heurePlanifiee: '07:30',
        reminderAt: new Date(Date.now() + 3600000 * 1).toISOString().slice(0, 16),
      },
      {
        id: 'rt-2',
        texte: 'Faire 10 minutes d’étirements doux et respiration profonde',
        ordre: 2,
        termine: false,
        datePlanifiee: getTodayISO(),
        heurePlanifiee: '08:00',
      },
      {
        id: 'rt-3',
        texte: 'Planifier les 3 priorités clés de la journée',
        ordre: 3,
        termine: false,
        datePlanifiee: formatISODate(tomorrow),
        heurePlanifiee: '09:00',
      },
    ],
  },
  {
    id: 'goal-cni',
    titre: "Refaire ma carte d'identité",
    createdAt: Date.now() - 86400000 * 3,
    recurrence: 'none',
    etapes: [
      { id: 'cni-1', texte: 'Faire la pré-demande en ligne sur le site ANTS', ordre: 1, termine: true, completedAt: Date.now() - 86400000 * 2 },
      { id: 'cni-2', texte: 'Acheter un timbre fiscal électronique (si perte)', ordre: 2, termine: false, datePlanifiee: getTodayISO(), heurePlanifiee: '11:00' },
      { id: 'cni-3', texte: 'Faire des photos d’identité conformes en photomaton agréé', ordre: 3, termine: false, datePlanifiee: formatISODate(tomorrow), heurePlanifiee: '16:00' },
      { id: 'cni-4', texte: 'Prendre rendez-vous en mairie pour le dépôt du dossier', ordre: 4, termine: false, datePlanifiee: formatISODate(dayAfter), heurePlanifiee: '10:30' },
      { id: 'cni-5', texte: 'Se rendre au rendez-vous avec le justificatif de domicile et l’ancienne carte', ordre: 5, termine: false },
      { id: 'cni-6', texte: 'Retirer la nouvelle carte d’identité en mairie dès réception du SMS', ordre: 6, termine: false },
    ],
  },
  {
    id: 'goal-weekly',
    titre: 'Bilan et organisation de la semaine',
    createdAt: Date.now() - 86400000 * 6,
    recurrence: 'weekly',
    cycleCount: 2,
    etapes: [
      { id: 'w-1', texte: 'Faire le tri de la boîte de réception et archiver les e-mails traités', ordre: 1, termine: true, completedAt: Date.now() - 86400000 * 1 },
      { id: 'w-2', texte: 'Revoir le calendrier des 7 prochains jours et anticiper les rendez-vous', ordre: 2, termine: false, datePlanifiee: formatISODate(tomorrow), heurePlanifiee: '18:00' },
      { id: 'w-3', texte: 'Définir les 3 objectifs majeurs de la semaine à venir', ordre: 3, termine: false },
    ],
  },
];

export function getStoredGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_GOALS));
      return DEFAULT_GOALS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_GOALS;
  } catch (err) {
    console.error('Erreur de lecture du stockage local:', err);
    return DEFAULT_GOALS;
  }
}

export function saveStoredGoals(goals: Goal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  } catch (err) {
    console.error('Erreur d’enregistrement dans le stockage local:', err);
  }
}

export function resetToSampleGoals(): Goal[] {
  saveStoredGoals(DEFAULT_GOALS);
  return DEFAULT_GOALS;
}

export function getStoredIdees(): IdeeProjet[] {
  try {
    const raw = localStorage.getItem(IDEES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(IDEES_STORAGE_KEY, JSON.stringify(DEFAULT_IDEES));
      return DEFAULT_IDEES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_IDEES;
  } catch (err) {
    console.error('Erreur de lecture des idées:', err);
    return DEFAULT_IDEES;
  }
}

export function saveStoredIdees(idees: IdeeProjet[]): void {
  try {
    localStorage.setItem(IDEES_STORAGE_KEY, JSON.stringify(idees));
  } catch (err) {
    console.error('Erreur d’enregistrement des idées:', err);
  }
}

export function resetToSampleIdees(): IdeeProjet[] {
  saveStoredIdees(DEFAULT_IDEES);
  return DEFAULT_IDEES;
}

export function getStoredReves(): Reve[] {
  try {
    const raw = localStorage.getItem(REVES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REVES_STORAGE_KEY, JSON.stringify(DEFAULT_REVES));
      return DEFAULT_REVES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_REVES;
  } catch (err) {
    console.error('Erreur de lecture des rêves:', err);
    return DEFAULT_REVES;
  }
}

export function saveStoredReves(reves: Reve[]): void {
  try {
    localStorage.setItem(REVES_STORAGE_KEY, JSON.stringify(reves));
  } catch (err) {
    console.error('Erreur d’enregistrement des rêves:', err);
  }
}

export function resetToSampleReves(): Reve[] {
  saveStoredReves(DEFAULT_REVES);
  return DEFAULT_REVES;
}

export function getStoredAgendaEvents(): AgendaEvent[] {
  try {
    const raw = localStorage.getItem(AGENDA_EVENTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AGENDA_EVENTS_STORAGE_KEY, JSON.stringify(DEFAULT_AGENDA_EVENTS));
      return DEFAULT_AGENDA_EVENTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_AGENDA_EVENTS;
  } catch (err) {
    console.error('Erreur de lecture des événements agenda:', err);
    return DEFAULT_AGENDA_EVENTS;
  }
}

export function saveStoredAgendaEvents(events: AgendaEvent[]): void {
  try {
    localStorage.setItem(AGENDA_EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error('Erreur d’enregistrement des événements agenda:', err);
  }
}

export function resetToSampleAgendaEvents(): AgendaEvent[] {
  saveStoredAgendaEvents(DEFAULT_AGENDA_EVENTS);
  return DEFAULT_AGENDA_EVENTS;
}

export function getStoredJournal(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(DEFAULT_JOURNAL));
      return DEFAULT_JOURNAL;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_JOURNAL;
  } catch (err) {
    console.error('Erreur de lecture du journal:', err);
    return DEFAULT_JOURNAL;
  }
}

export function saveStoredJournal(entries: JournalEntry[]): void {
  try {
    localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error('Erreur d’enregistrement du journal:', err);
  }
}

export function saveOrUpdateJournalEntry(entry: JournalEntry, currentEntries: JournalEntry[]): JournalEntry[] {
  const existingIdx = currentEntries.findIndex((e) => e.date === entry.date);
  let updated: JournalEntry[];
  if (existingIdx !== -1) {
    updated = [...currentEntries];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...entry,
      updatedAt: Date.now(),
    };
  } else {
    updated = [
      {
        ...entry,
        createdAt: entry.createdAt || Date.now(),
        updatedAt: Date.now(),
      },
      ...currentEntries,
    ];
  }
  saveStoredJournal(updated);
  return updated;
}

export function resetToSampleJournal(): JournalEntry[] {
  saveStoredJournal(DEFAULT_JOURNAL);
  return DEFAULT_JOURNAL;
}

/**
 * Creates full JSON backup payload containing Goals, Finances, AgendaEvents, Ideas, Dreams, and Journal.
 */
export function generateBackupData(
  goals: Goal[],
  finances: FinancialData,
  agendaEvents: AgendaEvent[],
  idees: IdeeProjet[],
  reves: Reve[],
  journal?: JournalEntry[]
): BackupData {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    goals,
    finances,
    agendaEvents,
    idees,
    reves,
    journal: journal || getStoredJournal(),
  };
}

/**
 * Parses and validates imported JSON data
 */
export function parseAndValidateBackupJSON(jsonString: string): {
  success: boolean;
  data?: {
    goals: Goal[];
    finances: FinancialData;
    agendaEvents: AgendaEvent[];
    idees: IdeeProjet[];
    reves: Reve[];
    journal?: JournalEntry[];
  };
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Format de fichier JSON invalide.' };
    }

    const goals: Goal[] = Array.isArray(parsed.goals) ? parsed.goals : [];
    const finances: FinancialData = parsed.finances && typeof parsed.finances === 'object'
      ? {
          soldes: {
            compteBancaire: typeof parsed.finances.soldes?.compteBancaire === 'number' ? parsed.finances.soldes.compteBancaire : 0,
            especes: typeof parsed.finances.soldes?.especes === 'number' ? parsed.finances.soldes.especes : 0,
          },
          rentrees: Array.isArray(parsed.finances.rentrees) ? parsed.finances.rentrees : [],
          depenses: Array.isArray(parsed.finances.depenses) ? parsed.finances.depenses : [],
          dettes: Array.isArray(parsed.finances.dettes) ? parsed.finances.dettes : [],
        }
      : DEFAULT_FINANCES;

    const agendaEvents: AgendaEvent[] = Array.isArray(parsed.agendaEvents) ? parsed.agendaEvents : [];
    const idees: IdeeProjet[] = Array.isArray(parsed.idees) ? parsed.idees : [];
    const reves: Reve[] = Array.isArray(parsed.reves) ? parsed.reves : [];
    const journal: JournalEntry[] = Array.isArray(parsed.journal) ? parsed.journal : [];

    return {
      success: true,
      data: {
        goals,
        finances,
        agendaEvents,
        idees,
        reves,
        journal,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la lecture du fichier JSON.' };
  }
}

export function getStoredFinances(): FinancialData {
  try {
    const raw = localStorage.getItem(FINANCES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(FINANCES_STORAGE_KEY, JSON.stringify(DEFAULT_FINANCES));
      return DEFAULT_FINANCES;
    }
    const parsed = JSON.parse(raw);
    return {
      soldes: {
        compteBancaire:
          typeof parsed.soldes?.compteBancaire === 'number'
            ? parsed.soldes.compteBancaire
            : DEFAULT_FINANCES.soldes.compteBancaire,
        especes:
          typeof parsed.soldes?.especes === 'number'
            ? parsed.soldes.especes
            : DEFAULT_FINANCES.soldes.especes,
      },
      rentrees: Array.isArray(parsed.rentrees) ? parsed.rentrees : [],
      depenses: Array.isArray(parsed.depenses) ? parsed.depenses : [],
      dettes: Array.isArray(parsed.dettes) ? parsed.dettes : [],
    };
  } catch (err) {
    console.error('Erreur de lecture des finances dans le stockage local:', err);
    return DEFAULT_FINANCES;
  }
}

export function saveStoredFinances(finances: FinancialData): void {
  try {
    localStorage.setItem(FINANCES_STORAGE_KEY, JSON.stringify(finances));
  } catch (err) {
    console.error('Erreur d’enregistrement des finances dans le stockage local:', err);
  }
}

export function resetToSampleFinances(): FinancialData {
  saveStoredFinances(DEFAULT_FINANCES);
  return DEFAULT_FINANCES;
}

/**
 * Creates an associated 5-step milestone Goal for a debt.
 */
export function createDebtRepaymentGoal(debt: Debt): Goal {
  const goalId = `goal-debt-${debt.id}`;
  const total = debt.montantTotal;
  const reimbursed = debt.montantRembourse;

  const steps: Step[] = [
    {
      id: `step-${debt.id}-1`,
      texte: `Rembourser ${(total * 0.2).toFixed(2)} € (Palier 20 %)`,
      ordre: 1,
      termine: reimbursed >= total * 0.2 - 0.01,
      completedAt: reimbursed >= total * 0.2 - 0.01 ? Date.now() : undefined,
    },
    {
      id: `step-${debt.id}-2`,
      texte: `Rembourser ${(total * 0.4).toFixed(2)} € (Palier 40 %)`,
      ordre: 2,
      termine: reimbursed >= total * 0.4 - 0.01,
      completedAt: reimbursed >= total * 0.4 - 0.01 ? Date.now() : undefined,
    },
    {
      id: `step-${debt.id}-3`,
      texte: `Rembourser ${(total * 0.6).toFixed(2)} € (Palier 60 %)`,
      ordre: 3,
      termine: reimbursed >= total * 0.6 - 0.01,
      completedAt: reimbursed >= total * 0.6 - 0.01 ? Date.now() : undefined,
    },
    {
      id: `step-${debt.id}-4`,
      texte: `Rembourser ${(total * 0.8).toFixed(2)} € (Palier 80 %)`,
      ordre: 4,
      termine: reimbursed >= total * 0.8 - 0.01,
      completedAt: reimbursed >= total * 0.8 - 0.01 ? Date.now() : undefined,
    },
    {
      id: `step-${debt.id}-5`,
      texte: `Rembourser la totalité ${total.toFixed(2)} € (Solde 100 %)`,
      ordre: 5,
      termine: reimbursed >= total - 0.01,
      completedAt: reimbursed >= total - 0.01 ? Date.now() : undefined,
    },
  ];

  const allDone = steps.every((s) => s.termine);

  return {
    id: goalId,
    titre: `Remboursement : ${debt.creancier}`,
    etapes: steps,
    createdAt: Date.now(),
    completedAt: allDone ? Date.now() : undefined,
    linkedDebtId: debt.id,
  };
}

/**
 * Synchronizes debt repayments to linked Goal steps
 */
export function syncDebtToGoal(debt: Debt, goals: Goal[]): Goal[] {
  if (!debt.linkedGoalId) return goals;
  const goalIndex = goals.findIndex((g) => g.id === debt.linkedGoalId || g.linkedDebtId === debt.id);
  if (goalIndex === -1) return goals;

  const targetGoal = goals[goalIndex];
  const totalSteps = targetGoal.etapes.length;
  if (totalSteps === 0) return goals;

  const ratio = debt.montantTotal > 0 ? debt.montantRembourse / debt.montantTotal : 1;
  const updatedSteps = targetGoal.etapes.map((step, idx) => {
    const threshold = (idx + 1) / totalSteps;
    const shouldBeDone = ratio >= threshold - 0.001;
    return {
      ...step,
      termine: shouldBeDone,
      completedAt: shouldBeDone ? step.completedAt || Date.now() : undefined,
    };
  });

  const allFinished = updatedSteps.every((s) => s.termine);
  const updatedGoal: Goal = {
    ...targetGoal,
    etapes: updatedSteps,
    completedAt: allFinished ? targetGoal.completedAt || Date.now() : undefined,
  };

  const newGoals = [...goals];
  newGoals[goalIndex] = updatedGoal;
  return newGoals;
}

/**
 * Synchronizes Goal step completion back to linked Debt repayment amount
 */
export function syncGoalToDebt(goal: Goal, finances: FinancialData): FinancialData {
  if (!goal.linkedDebtId) return finances;
  const debtIndex = finances.dettes.findIndex((d) => d.id === goal.linkedDebtId);
  if (debtIndex === -1) return finances;

  const targetDebt = finances.dettes[debtIndex];
  const totalSteps = goal.etapes.length;
  if (totalSteps === 0) return finances;

  const completedSteps = goal.etapes.filter((s) => s.termine).length;
  const ratio = completedSteps / totalSteps;
  const newRembourse = Math.round(ratio * targetDebt.montantTotal * 100) / 100;

  const updatedDebt: Debt = {
    ...targetDebt,
    montantRembourse: Math.min(targetDebt.montantTotal, newRembourse),
  };

  const newDettes = [...finances.dettes];
  newDettes[debtIndex] = updatedDebt;

  return {
    ...finances,
    dettes: newDettes,
  };
}

/**
 * Resets a completed recurring goal for the next period, starting back from its first step.
 */
export function resetRecurringGoal(goal: Goal): Goal {
  const recurrence = goal.recurrence || 'none';
  const updatedSteps: Step[] = goal.etapes.map((step) => {
    // Shift reminder if present
    const nextReminder = shiftReminderForRecurrence(step.reminderAt, recurrence);
    return {
      ...step,
      termine: false,
      completedAt: undefined,
      reminderAt: nextReminder,
      reminderNotified: false,
    };
  });

  return {
    ...goal,
    etapes: updatedSteps,
    cycleCount: (goal.cycleCount || 0) + 1,
    lastCompletedCycleAt: Date.now(),
    completedAt: undefined,
  };
}

/**
 * Check active reminders across all goals and trigger them if due
 */
export function checkDueReminders(
  goals: Goal[],
  onTrigger: (goal: Goal, step: Step) => void
): { updatedGoals: Goal[]; hasTriggered: boolean } {
  const now = Date.now();
  let hasTriggered = false;

  const updatedGoals = goals.map((goal) => {
    let goalModified = false;
    const newSteps = goal.etapes.map((step) => {
      if (
        !step.termine &&
        step.reminderAt &&
        !step.reminderNotified
      ) {
        const reminderTime = new Date(step.reminderAt).getTime();
        if (!isNaN(reminderTime) && reminderTime <= now) {
          // Trigger reminder notification
          onTrigger(goal, step);
          goalModified = true;
          hasTriggered = true;
          return {
            ...step,
            reminderNotified: true,
          };
        }
      }
      return step;
    });

    if (goalModified) {
      return {
        ...goal,
        etapes: newSteps,
      };
    }
    return goal;
  });

  return { updatedGoals, hasTriggered };
}
