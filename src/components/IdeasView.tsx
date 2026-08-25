import React, { useState } from 'react';
import { IdeeProjet, IdeaCategory, Goal } from '../types';
import { Lightbulb, Plus, Mic, MicOff, Trash2, Edit3, ArrowRight, Sparkles, CheckCircle2, Search, X, RefreshCw, Zap, Star, Archive, Loader2, AlertTriangle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatISODate } from '../utils/dateUtils';
import { sound } from '../utils/audio';

export interface IdeasViewProps {
  idees?: IdeeProjet[];
  ideas?: IdeeProjet[];
  onUpdateIdees?: (idees: IdeeProjet[]) => void;
  onAddIdea?: (idea: Omit<IdeeProjet, 'id' | 'dateCreation'>) => void;
  onUpdateIdea?: (idea: IdeeProjet) => void;
  onDeleteIdea?: (id: string) => void;
  onTransformToGoal?: (idea: IdeeProjet) => void;
  onNavigateToGoal?: (goalId: string) => void;
  onSelectGoal?: (goalId: string) => void;
  onResetSampleIdeas?: () => void;
  goals?: Goal[];
}

const CATEGORIES: IdeaCategory[] = [
  'Business',
  'Sport',
  'Créatif',
  'Personnel',
  'Voyage',
  'Autre',
];

const CATEGORY_STYLES: Record<IdeaCategory, { bg: string; text: string; border: string; darkBg: string }> = {
  Business: {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    darkBg: 'dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100',
  },
  Sport: {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    darkBg: 'dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100',
  },
  Créatif: {
    bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    darkBg: 'dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100',
  },
  Personnel: {
    bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
    darkBg: 'dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100',
  },
  Voyage: {
    bg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    darkBg: 'dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60',
    text: 'text-sky-600 dark:text-sky-400',
    border: 'border-sky-100',
  },
  Autre: {
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    darkBg: 'dark:bg-zinc-800 dark:text-slate-300 dark:border-zinc-700',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200',
  },
};

export const IdeasView: React.FC<IdeasViewProps> = ({
  idees,
  ideas,
  onUpdateIdees,
  onAddIdea,
  onUpdateIdea,
  onDeleteIdea,
  onTransformToGoal,
  onNavigateToGoal,
  onSelectGoal,
  onResetSampleIdeas,
  goals = [],
}) => {
  // Safe array normalization
  const safeIdees: IdeeProjet[] = Array.isArray(idees)
    ? idees
    : Array.isArray(ideas)
    ? ideas
    : [];

  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<IdeaCategory>('Business');
  const [newNotes, setNewNotes] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [editingIdea, setEditingIdea] = useState<IdeeProjet | null>(null);
  const [developingIdeaId, setDevelopingIdeaId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleNavigate = onNavigateToGoal || onSelectGoal;

  const handleAdd = (data: Omit<IdeeProjet, 'id' | 'dateCreation'>) => {
    if (onAddIdea) {
      onAddIdea(data);
    } else if (onUpdateIdees) {
      const newIdea: IdeeProjet = {
        id: `idee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...data,
        dateCreation: Date.now(),
      };
      onUpdateIdees([newIdea, ...safeIdees]);
    }
  };

  const handleDevelopIdea = async (idea: IdeeProjet) => {
    if (idea.aiExpansion) return; // already developed
    
    setDevelopingIdeaId(idea.id);
    try {
      const res = await fetch('/api/develop-idea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: idea.titre, notes: idea.notes })
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      
      const updated = { ...idea, aiExpansion: data };
      handleUpdate(updated);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du développement de l\'idée.');
    } finally {
      setDevelopingIdeaId(null);
    }
  };

  const handleTogglePin = (idea: IdeeProjet) => {
    handleUpdate({ ...idea, pinned: !idea.pinned });
  };

  const handleToggleArchive = (idea: IdeeProjet) => {
    handleUpdate({ ...idea, archived: !idea.archived, pinned: false }); // Unpin if archiving
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-amber-200/50 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-sm">{part}</span> 
        : part
    );
  };

  const handleUpdate = (updated: IdeeProjet) => {
    if (onUpdateIdea) {
      onUpdateIdea(updated);
    } else if (onUpdateIdees) {
      onUpdateIdees(safeIdees.map((i) => (i.id === updated.id ? updated : i)));
    }
  };

  const handleDelete = (id: string) => {
    if (onDeleteIdea) {
      onDeleteIdea(id);
    } else if (onUpdateIdees) {
      onUpdateIdees(safeIdees.filter((i) => i.id !== id));
    }
  };

  // Speech Recognition support for voice capturing
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
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) {
          if (!newTitle) {
            setNewTitle(transcript.trim());
          } else {
            setNewNotes((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        }
        setIsListening(false);
      };

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  const handleCreateIdea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    sound.click();
    handleAdd({
      titre: newTitle.trim(),
      categorie: newCategory,
      notes: newNotes.trim() || undefined,
    });

    setNewTitle('');
    setNewNotes('');
    setIsAddingOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIdea || !editingIdea.titre.trim()) return;

    sound.click();
    handleUpdate(editingIdea);
    setEditingIdea(null);
  };

  const filteredIdeas = (Array.isArray(safeIdees) ? safeIdees : [])
    .filter((idea) => {
      if (!idea) return false;
      if (!showArchived && idea.archived) return false;
      if (showArchived && !idea.archived) return false;
      
      const cat = idea.categorie || 'Autre';
      const matchesCategory = selectedCategory === 'Tous' || cat === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const titleMatch = (idea.titre || '').toLowerCase().includes(q);
      const notesMatch = idea.notes ? idea.notes.toLowerCase().includes(q) : false;
      const matchesSearch = !q || titleMatch || notesMatch;
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.dateCreation || 0) - (a.dateCreation || 0);
    });

  return (
    <div id="ideas-incubator-screen" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-40">
      {/* Header Greeting */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40">
            <Lightbulb className="w-4 h-4" />
          </span>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
            Incubateur de projets
          </p>
        </div>
        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Idées & Projets
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
          Capturez vos inspirations brutes sans encombrer vos priorités, puis transformez-les en objectifs le moment venu.
        </p>
      </div>

      {/* Quick Add Form / Toggle Button */}
      <div className="mb-8">
        {!isAddingOpen ? (
          <button
            type="button"
            onClick={() => setIsAddingOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-white dark:bg-[#1E1E1E] hover:bg-slate-50 dark:hover:bg-[#252525] border border-dashed border-slate-300 dark:border-zinc-700 rounded-2xl text-left transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                  Noter une nouvelle idée...
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Business, sport, créatif, voyage ou projet personnel
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 hidden sm:inline-block">
                Ajout rapide
              </span>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          </button>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateIdea}
            className="bg-white dark:bg-[#1E1E1E] border border-amber-200/60 dark:border-amber-900/40 rounded-3xl p-5 sm:p-6 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-serif font-bold text-base">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Capturer une inspiration</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddingOpen(false);
                  setIsListening(false);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Voice Button */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Titre de l'idée *
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex : Apprendre l'aquarelle, lancer une formation, courir 10km..."
                  className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all pr-12"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title="Dicter à la voix"
                  className={`absolute right-2 p-2 rounded-lg transition-all ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
              {isListening && (
                <p className="text-[11px] text-red-500 dark:text-red-400 mt-1 flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block" />
                  Écoute en cours... parlez naturellement.
                </p>
              )}
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Catégorie
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = newCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs font-semibold'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Notes & Réflexions (optionnel)
              </label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Ressources, matériel nécessaire, premières réflexions..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingOpen(false)}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="py-2.5 px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer l'idée</span>
              </button>
            </div>
          </motion.form>
        )}
      </div>

      {/* Search & Category Filter Pills */}
      <div className="space-y-3 mb-6">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une idée ou une note..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100/70 dark:bg-[#252525] border border-slate-200/50 dark:border-zinc-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('Tous')}
            className={`py-1.5 px-3 rounded-full text-xs font-medium shrink-0 transition-all ${
              selectedCategory === 'Tous'
                ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900 font-semibold shadow-2xs'
                : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
            }`}
          >
            Tous ({safeIdees.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = (Array.isArray(safeIdees) ? safeIdees : []).filter(
              (i) => i && (i.categorie || 'Autre') === cat
            ).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`py-1.5 px-3 rounded-full text-xs font-medium shrink-0 transition-all ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-2xs font-semibold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat} {count > 0 && `(${count})`}
              </button>
            );
          })}
          <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 self-center shrink-0" />
          <button
            type="button"
            onClick={() => {
              setShowArchived(!showArchived);
              setSelectedCategory('Tous');
            }}
            className={`py-1.5 px-3 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 ${
              showArchived
                ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-slate-200 shadow-2xs font-semibold'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            Archives
          </button>
        </div>
      </div>

      {/* Ideas List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {(Array.isArray(filteredIdeas) ? filteredIdeas : []).map((idea) => {
            const categoryKey = (idea.categorie as IdeaCategory) || 'Autre';
            const style = CATEGORY_STYLES[categoryKey] || CATEGORY_STYLES.Autre;
            const isConverted = !!idea.convertieEnObjectifId;
            const linkedGoal = isConverted && Array.isArray(goals)
              ? goals.find((g) => g.id === idea.convertieEnObjectifId)
              : null;

            return (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white dark:bg-[#1E1E1E] rounded-3xl p-5 border border-slate-100 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden ${
                  isConverted ? 'opacity-90' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${style.bg} ${style.darkBg}`}
                    >
                      {idea.categorie || 'Autre'}
                    </span>
                    {isConverted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 border border-emerald-200/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Objectif créé
                      </span>
                    )}
                    {idea.pinned && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" />
                        Épinglé
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(idea)}
                      title={idea.pinned ? "Désépingler" : "Épingler en haut"}
                      className={`p-1.5 rounded-lg transition-colors ${idea.pinned ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${idea.pinned ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(idea)}
                      title={idea.archived ? "Désarchiver" : "Archiver"}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIdea(idea)}
                      title="Modifier les notes"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Supprimer cette idée de l’incubateur ?')) {
                          handleDelete(idea.id);
                        }
                      }}
                      title="Supprimer l'idée"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1.5 leading-snug pr-8">
                  {highlightText(idea.titre, searchQuery)}
                </h3>

                {/* Notes */}
                {idea.notes && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 mb-3 whitespace-pre-wrap leading-relaxed">
                    {highlightText(idea.notes, searchQuery)}
                  </p>
                )}

                {/* AI Expansion */}
                {idea.aiExpansion && (
                  <div className="mb-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/20 p-4 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider">
                        Pistes d'action suggérées par l'IA
                      </span>
                    </div>
                    <ul className="space-y-2 mb-3">
                      {idea.aiExpansion.pistes.map((piste, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-indigo-800 dark:text-indigo-300">
                          <Play className="w-3 h-3 mt-1 shrink-0 text-indigo-400" />
                          <span className="leading-relaxed">{piste}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-start gap-2 bg-amber-50/80 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-500" />
                      <div>
                        <span className="block text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-0.5">Point de vigilance</span>
                        <span className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{idea.aiExpansion.vigilance}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer and Transform Action */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    Capturée le {formatISODate(new Date(idea.dateCreation || Date.now()))}
                  </span>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end flex-1">
                    {!idea.aiExpansion && (
                      <button
                        type="button"
                        onClick={() => handleDevelopIdea(idea)}
                        disabled={developingIdeaId === idea.id}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/60 font-medium text-xs transition-colors disabled:opacity-50"
                      >
                        {developingIdeaId === idea.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>Développer avec l'IA</span>
                      </button>
                    )}

                  {isConverted && linkedGoal && handleNavigate ? (
                    <button
                      type="button"
                      onClick={() => handleNavigate(linkedGoal.id)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#388E3C] dark:text-emerald-300 hover:bg-emerald-100/80 font-medium text-xs transition-colors"
                    >
                      <span>Voir l'objectif associé</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : onTransformToGoal ? (
                    <button
                      type="button"
                      onClick={() => onTransformToGoal(idea)}
                      className="inline-flex items-center gap-1.5 py-1.5 px-3.5 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs transition-all shadow-2xs hover:shadow-xs group"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Transformer en Objectif</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : null}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredIdeas.length === 0 && (
          <div className="py-14 px-6 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
              {safeIdees.length === 0
                ? 'Aucune idée enregistrée pour le moment'
                : 'Aucune idée dans cette catégorie'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
              Notez toutes les envies ou projets qui vous traversent l'esprit pour y revenir sereinement.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('Tous');
                setIsAddingOpen(true);
              }}
              className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Noter une idée</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Idea Modal */}
      <AnimatePresence>
        {editingIdea && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100">
                  Modifier l'idée
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingIdea(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Titre
                  </label>
                  <input
                    type="text"
                    value={editingIdea.titre}
                    onChange={(e) =>
                      setEditingIdea({ ...editingIdea, titre: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Catégorie
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() =>
                          setEditingIdea({ ...editingIdea, categorie: cat })
                        }
                        className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
                          editingIdea.categorie === cat
                            ? 'bg-amber-600 text-white font-semibold'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Notes
                  </label>
                  <textarea
                    value={editingIdea.notes || ''}
                    onChange={(e) =>
                      setEditingIdea({ ...editingIdea, notes: e.target.value })
                    }
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingIdea(null)}
                    className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Discreet sample reset link */}
      {onResetSampleIdeas && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={onResetSampleIdeas}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 uppercase tracking-widest font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recharger les exemples d'idées</span>
          </button>
        </div>
      )}
    </div>
  );
};
