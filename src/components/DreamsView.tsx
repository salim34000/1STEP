import React, { useState } from 'react';
import { Reve, DreamHorizon, Goal } from '../types';
import {
  Compass,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Edit3,
  ArrowRight,
  CheckCircle2,
  Quote,
  Clock,
  HeartHandshake,
  Layers,
  ChevronRight,
  X,
  RefreshCw,
  Mountain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../utils/audio';
import { formatISODate } from '../utils/dateUtils';

interface DreamsViewProps {
  dreams: Reve[];
  goals: Goal[];
  onAddDream: (dream: Omit<Reve, 'id' | 'dateCreation'>) => void;
  onUpdateDream: (dream: Reve) => void;
  onDeleteDream: (id: string) => void;
  onDeriveGoalFromDream: (dream: Reve) => void;
  onSelectGoal: (goalId: string) => void;
  onResetSampleDreams: () => void;
}

const HORIZONS: DreamHorizon[] = ['Dans 1 an', '3 à 5 ans', '10 ans', 'Dans ma vie'];

const HORIZON_BADGES: Record<DreamHorizon, { bg: string; text: string; border: string; darkBg: string }> = {
  'Dans 1 an': {
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    darkBg: 'dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200',
  },
  '3 à 5 ans': {
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    darkBg: 'dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-200',
  },
  '10 ans': {
    bg: 'bg-purple-50 text-purple-700 border-purple-200/80',
    darkBg: 'dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200',
  },
  'Dans ma vie': {
    bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    darkBg: 'dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200',
  },
};

export const DreamsView: React.FC<DreamsViewProps> = ({
  dreams,
  goals,
  onAddDream,
  onUpdateDream,
  onDeleteDream,
  onDeriveGoalFromDream,
  onSelectGoal,
  onResetSampleDreams,
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState<string>('Tous');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newHorizon, setNewHorizon] = useState<DreamHorizon>('3 à 5 ans');
  const [newMotivation, setNewMotivation] = useState('');
  const [editingDream, setEditingDream] = useState<Reve | null>(null);

  const handleCreateDream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMotivation.trim()) return;

    sound.click();
    onAddDream({
      titre: newTitle.trim(),
      horizon: newHorizon,
      motivation: newMotivation.trim(),
      objectifsAssociesIds: [],
    });

    setNewTitle('');
    setNewMotivation('');
    setIsAddingOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDream || !editingDream.titre.trim() || !editingDream.motivation.trim()) return;

    sound.click();
    onUpdateDream(editingDream);
    setEditingDream(null);
  };

  const filteredDreams = dreams.filter((dream) => {
    if (selectedHorizon === 'Tous') return true;
    return dream.horizon === selectedHorizon;
  });

  return (
    <div id="dreams-vision-screen" className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">
      {/* Vision Header */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="p-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900/40">
            <Compass className="w-4 h-4" />
          </span>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
            Vision Long Terme
          </p>
        </div>
        <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Vos Rêves & Aspirations
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          Donnez une boussole à vos journées. Définissez vos grandes visions, rappelez-vous pourquoi elles comptent, et dérivez des étapes concrètes.
        </p>
      </div>

      {/* Quick Add Toggle / Form */}
      <div className="mb-8">
        {!isAddingOpen ? (
          <button
            type="button"
            onClick={() => setIsAddingOpen(true)}
            className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-purple-50/40 to-indigo-50/30 dark:from-purple-950/20 dark:to-indigo-950/20 hover:from-purple-50/80 hover:to-indigo-50/60 dark:hover:from-purple-950/30 dark:hover:to-indigo-950/30 border border-dashed border-purple-300/80 dark:border-purple-800/60 rounded-3xl text-left transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-zinc-700 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                <Mountain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-serif font-bold text-slate-900 dark:text-slate-100 block">
                  Définir une nouvelle vision de vie...
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Horizon 1 an, 3 à 5 ans, 10 ans ou vision globale de vie
                </span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-purple-600 text-white shadow-xs group-hover:bg-purple-700 transition-colors">
              <Plus className="w-4 h-4" />
            </div>
          </button>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateDream}
            className="bg-white dark:bg-[#1E1E1E] border border-purple-200/70 dark:border-purple-900/50 rounded-3xl p-5 sm:p-6 shadow-md space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-serif font-bold text-base">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Nouveau Rêve ou Aspiration</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dream Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Titre du Rêve *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex : Vivre en bord de mer, publier mon premier livre, fonder une école..."
                className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-serif"
                autoFocus
              />
            </div>

            {/* Horizon */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Horizon temporel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {HORIZONS.map((h) => {
                  const isSelected = newHorizon === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setNewHorizon(h)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium transition-all text-center ${
                        isSelected
                          ? 'bg-[#1A237E] text-white shadow-xs font-semibold'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Motivation Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Pourquoi ce rêve compte pour moi ? *</span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                  Votre boussole émotionnelle
                </span>
              </label>
              <textarea
                value={newMotivation}
                onChange={(e) => setNewMotivation(e.target.value)}
                placeholder="Décrivez ce que vous ressentirez, l'impact sur votre vie, vos proches et pourquoi cela donne du sens à vos efforts quotidiens..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none leading-relaxed"
                required
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
                disabled={!newTitle.trim() || !newMotivation.trim()}
                className="py-2.5 px-5 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Enregistrer la vision</span>
              </button>
            </div>
          </motion.form>
        )}
      </div>

      {/* Horizon Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 no-scrollbar">
        <button
          type="button"
          onClick={() => setSelectedHorizon('Tous')}
          className={`py-1.5 px-3.5 rounded-full text-xs font-medium shrink-0 transition-all ${
            selectedHorizon === 'Tous'
              ? 'bg-slate-900 text-white dark:bg-zinc-100 dark:text-slate-900 font-semibold shadow-2xs'
              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
          }`}
        >
          Tous les horizons ({dreams.length})
        </button>
        {HORIZONS.map((h) => {
          const count = dreams.filter((d) => d.horizon === h).length;
          const isSelected = selectedHorizon === h;
          return (
            <button
              key={h}
              type="button"
              onClick={() => setSelectedHorizon(h)}
              className={`py-1.5 px-3.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {h} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Dreams Cards */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredDreams.map((dream) => {
            const badge = HORIZON_BADGES[dream.horizon] || HORIZON_BADGES['3 à 5 ans'];
            // Find linked concrete goals
            const linkedGoals = goals.filter(
              (g) =>
                g.linkedDreamId === dream.id ||
                (dream.objectifsAssociesIds && dream.objectifsAssociesIds.includes(g.id))
            );

            return (
              <motion.div
                key={dream.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#1E1E1E] rounded-3xl p-6 border border-slate-100 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden"
              >
                {/* Top Bar: Horizon Badge & Actions */}
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge.bg} ${badge.darkBg}`}
                  >
                    Horizon : {dream.horizon}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingDream(dream)}
                      title="Modifier ce rêve"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Supprimer cette aspiration de vos rêves ?')) {
                          onDeleteDream(dream.id);
                        }
                      }}
                      title="Supprimer ce rêve"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dream Title in Playfair / Serif */}
                <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-4 leading-snug">
                  {dream.titre}
                </h3>

                {/* Motivation Box */}
                <div className="relative bg-gradient-to-br from-purple-50/50 to-indigo-50/30 dark:from-purple-950/30 dark:to-indigo-950/20 p-4 rounded-2xl border border-purple-100/70 dark:border-purple-900/40 mb-5">
                  <Quote className="w-5 h-5 text-purple-300 dark:text-purple-700/60 absolute top-3 right-3" />
                  <p className="text-xs uppercase tracking-widest font-bold text-purple-800/80 dark:text-purple-300 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Pourquoi ce rêve compte pour moi</span>
                  </p>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic font-serif leading-relaxed">
                    « {dream.motivation} »
                  </p>
                </div>

                {/* Linked Concrete Goals Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#1A237E] dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Objectifs concrets associés ({linkedGoals.length})
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeriveGoalFromDream(dream)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 bg-[#1A237E]/10 hover:bg-[#1A237E]/20 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/70 text-[#1A237E] dark:text-indigo-300 rounded-xl font-semibold text-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Dériver un objectif</span>
                    </button>
                  </div>

                  {/* List of Linked Goals */}
                  {linkedGoals.length > 0 ? (
                    <div className="space-y-2">
                      {linkedGoals.map((goal) => {
                        const totalSteps = goal.etapes.length;
                        const completedSteps = goal.etapes.filter((s) => s.termine).length;
                        const isFinished = totalSteps > 0 && completedSteps === totalSteps;

                        return (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => onSelectGoal(goal.id)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/70 hover:bg-slate-100 dark:hover:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 text-left transition-all group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                  isFinished
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400'
                                    : 'bg-indigo-100 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-300'
                                }`}
                              >
                                {isFinished ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Target className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                  {goal.titre}
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                  {completedSteps} / {totalSteps} étapes validées
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-slate-400 group-hover:text-[#1A237E] dark:group-hover:text-indigo-400 transition-colors shrink-0">
                              <span className="text-[11px] font-medium hidden sm:inline-block">
                                Ouvrir
                              </span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-zinc-900/40 border border-dashed border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Aucun objectif d'action n'est encore rattaché à ce rêve.
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeriveGoalFromDream(dream)}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 text-white rounded-xl font-medium text-xs transition-all shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Créer la première étape d'action</span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredDreams.length === 0 && (
          <div className="py-14 px-6 text-center bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-100 dark:border-zinc-800 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1">
              Aucun rêve dans cet horizon
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-4">
              Prenez quelques instants pour imaginer votre vie idéale et ancrer votre première aspiration.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedHorizon('Tous');
                setIsAddingOpen(true);
              }}
              className="py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Formuler un rêve</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Dream Modal */}
      <AnimatePresence>
        {editingDream && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100">
                  Modifier le rêve
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingDream(null)}
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
                    value={editingDream.titre}
                    onChange={(e) =>
                      setEditingDream({ ...editingDream, titre: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-serif font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Horizon temporel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {HORIZONS.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() =>
                          setEditingDream({ ...editingDream, horizon: h })
                        }
                        className={`py-1.5 px-3 rounded-xl text-xs font-medium transition-all ${
                          editingDream.horizon === h
                            ? 'bg-[#1A237E] text-white font-semibold'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Pourquoi ce rêve compte pour moi
                  </label>
                  <textarea
                    value={editingDream.motivation}
                    onChange={(e) =>
                      setEditingDream({ ...editingDream, motivation: e.target.value })
                    }
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 leading-relaxed"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingDream(null)}
                    className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
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
      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={onResetSampleDreams}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800 uppercase tracking-widest font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Recharger les exemples de rêves</span>
        </button>
      </div>
    </div>
  );
};
