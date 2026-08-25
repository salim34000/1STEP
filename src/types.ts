export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Step {
  id: string;
  texte: string;
  ordre: number;
  termine: boolean;
  datePlanifiee?: string | null; // Format YYYY-MM-DD or null
  heurePlanifiee?: string | null; // Format HH:mm or null
  completedAt?: number;
  reminderAt?: string; // ISO datetime string YYYY-MM-DDTHH:mm
  reminderNotified?: boolean;
}

export interface AgendaEvent {
  id: string;
  titre: string;
  date: string; // Format YYYY-MM-DD
  heure?: string; // Format HH:mm (start time)
  heureFin?: string; // Format HH:mm (optional end time)
  note?: string; // Short note or details
  fait: boolean;
  createdAt?: number;
}

export interface Goal {
  id: string;
  titre: string;
  etapes: Step[];
  createdAt: number;
  completedAt?: number;
  archived?: boolean;
  recurrence?: RecurrenceType;
  cycleCount?: number;
  lastCompletedCycleAt?: number;
  linkedDebtId?: string;
  linkedDreamId?: string;
}

export interface PlannedTransaction {
  id: string;
  libelle: string;
  montant: number;
  datePrevue: string; // YYYY-MM-DD
  accountTarget?: 'compteBancaire' | 'especes';
}

export interface Debt {
  id: string;
  creancier: string;
  montantTotal: number;
  montantRembourse: number;
  note?: string;
  createdAt?: number;
  linkedGoalId?: string;
}

export interface RealBalances {
  compteBancaire: number;
  especes: number;
}

export interface FinancialData {
  soldes: RealBalances;
  rentrees: PlannedTransaction[];
  depenses: PlannedTransaction[];
  dettes: Debt[];
}

export type IdeaCategory =
  | 'Business'
  | 'Sport'
  | 'Créatif'
  | 'Personnel'
  | 'Voyage'
  | 'Autre';

export interface IdeeProjet {
  id: string;
  titre: string;
  categorie: IdeaCategory;
  notes?: string;
  dateCreation: number;
  convertieEnObjectifId?: string;
  pinned?: boolean;
  archived?: boolean;
  aiExpansion?: {
    pistes: string[];
    vigilance: string;
  };
}

export type DreamHorizon = 'Dans 1 an' | '3 à 5 ans' | '10 ans' | 'Dans ma vie';

export type EtatBienEtre = 'serein' | 'en_forme' | 'neutre' | 'fatigue' | 'tendu';

export interface JournalEntry {
  id: string;
  date: string; // Format YYYY-MM-DD
  scoreBienEtre?: EtatBienEtre;
  derouleJournee: string; // texte libre (récapitulatif, ressenti, déroulé)
  noteRapide?: string; // victoire du jour, gratitude ou pensée clé
  createdAt?: number;
  updatedAt?: number;
}

export interface Reve {
  id: string;
  titre: string;
  horizon: DreamHorizon;
  motivation: string; // Pourquoi ce rêve compte pour moi
  objectifsAssociesIds?: string[];
  dateCreation: number;
}

export interface BackupData {
  version: number;
  exportedAt: string;
  goals: Goal[];
  finances: FinancialData;
  agendaEvents: AgendaEvent[];
  idees: IdeeProjet[];
  reves: Reve[];
  journal?: JournalEntry[];
}

export type AppScreen =
  | { type: 'list' }
  | { type: 'agenda' }
  | { type: 'finances' }
  | { type: 'idees' }
  | { type: 'reves' }
  | { type: 'detail'; goalId: string }
  | {
      type: 'create';
      initialTitle?: string;
      initialNotes?: string;
      linkedDreamId?: string;
    }
  | { type: 'edit'; goalId: string };



export interface Challenge {
  id: string;
  titre: string;
  description: string;
  dateCreation: number; // For determining the week
  termine: boolean;
  completedAt?: number;
}
