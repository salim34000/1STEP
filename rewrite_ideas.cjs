const fs = require('fs');
let code = fs.readFileSync('src/components/IdeasView.tsx', 'utf8');

// We will use replace to insert new imports and functions.

// 1. Add new icons
code = code.replace(
  'import {\n  Lightbulb,\n  Plus,\n  Mic,\n  MicOff,\n  Trash2,\n  Edit3,\n  ArrowRight,\n  Sparkles,\n  CheckCircle2,\n  Search,\n  X,\n  RefreshCw,\n  Zap,\n} from \'lucide-react\';',
  'import { Lightbulb, Plus, Mic, MicOff, Trash2, Edit3, ArrowRight, Sparkles, CheckCircle2, Search, X, RefreshCw, Zap, Star, Archive, Loader2, AlertTriangle, Play } from \'lucide-react\';'
);

// 2. Add developing states
code = code.replace(
  'const [editingIdea, setEditingIdea] = useState<IdeeProjet | null>(null);',
  `const [editingIdea, setEditingIdea] = useState<IdeeProjet | null>(null);
  const [developingIdeaId, setDevelopingIdeaId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);`
);

// 3. Add handleDevelopIdea
code = code.replace(
  'const handleUpdate = (updated: IdeeProjet) => {',
  `const handleDevelopIdea = async (idea: IdeeProjet) => {
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
      alert('Erreur lors du développement de l\\'idée.');
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
    const parts = text.split(new RegExp(\`(\${query})\`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <span key={i} className="bg-amber-200/50 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-sm">{part}</span> 
        : part
    );
  };

  const handleUpdate = (updated: IdeeProjet) => {`
);

// 4. Update filtering & sorting
code = code.replace(
  `const filteredIdeas = (Array.isArray(safeIdees) ? safeIdees : []).filter((idea) => {
    if (!idea) return false;
    const cat = idea.categorie || 'Autre';
    const matchesCategory = selectedCategory === 'Tous' || cat === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const titleMatch = (idea.titre || '').toLowerCase().includes(q);
    const notesMatch = idea.notes ? idea.notes.toLowerCase().includes(q) : false;
    const matchesSearch = !q || titleMatch || notesMatch;
    return matchesCategory && matchesSearch;
  });`,
  `const filteredIdeas = (Array.isArray(safeIdees) ? safeIdees : [])
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
    });`
);

// 5. Add "Archivées" toggle button in category pills
code = code.replace(
  `{CATEGORIES.map((cat) => {`,
  `{CATEGORIES.map((cat) => {` // Keep the same
);
// Actually, let's insert the archive toggle after the categories loop
code = code.replace(
  `          })}
        </div>
      </div>

      {/* Ideas List */}`,
  `          })}
          <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1 self-center shrink-0" />
          <button
            type="button"
            onClick={() => {
              setShowArchived(!showArchived);
              setSelectedCategory('Tous');
            }}
            className={\`py-1.5 px-3 rounded-full text-xs font-medium shrink-0 transition-all flex items-center gap-1.5 \${
              showArchived
                ? 'bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-slate-200 shadow-2xs font-semibold'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }\`}
          >
            <Archive className="w-3.5 h-3.5" />
            Archives
          </button>
        </div>
      </div>

      {/* Ideas List */}`
);

// 6. Update Idea card rendering (title highlighting, note highlighting, badges)
code = code.replace(
  `                  <div className="flex items-center gap-2">
                    <span
                      className={\`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border \${style.bg} \${style.darkBg}\`}
                    >
                      {idea.categorie || 'Autre'}
                    </span>
                    {isConverted && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#388E3C] dark:text-emerald-400 border border-emerald-200/50 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Objectif créé
                      </span>
                    )}
                  </div>`,
  `                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={\`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border \${style.bg} \${style.darkBg}\`}
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
                  </div>`
);

// 7. Idea actions
code = code.replace(
  `                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingIdea(idea)}`,
  `                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTogglePin(idea)}
                      title={idea.pinned ? "Désépingler" : "Épingler en haut"}
                      className={\`p-1.5 rounded-lg transition-colors \${idea.pinned ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'}\`}
                    >
                      <Star className={\`w-3.5 h-3.5 \${idea.pinned ? 'fill-current' : ''}\`} />
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
                      onClick={() => setEditingIdea(idea)}`
);

// 8. Highlight title and notes
code = code.replace(
  `                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1.5 leading-snug">
                  {idea.titre}
                </h3>

                {/* Notes */}
                {idea.notes && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 mb-3 whitespace-pre-wrap leading-relaxed">
                    {idea.notes}
                  </p>
                )}`,
  `                <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100 mb-1.5 leading-snug pr-8">
                  {highlightText(idea.titre, searchQuery)}
                </h3>

                {/* Notes */}
                {idea.notes && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-100 dark:border-zinc-800/80 mb-3 whitespace-pre-wrap leading-relaxed">
                    {highlightText(idea.notes, searchQuery)}
                  </p>
                )}`
);

// 9. AI Expansion and Buttons
code = code.replace(
  `                {/* Footer and Transform Action */}`,
  `                {/* AI Expansion */}
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

                {/* Footer and Transform Action */}`
);

// 10. AI Button in footer
code = code.replace(
  `                  {isConverted && linkedGoal && handleNavigate ? (`,
  `                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 justify-end flex-1">
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

                  {isConverted && linkedGoal && handleNavigate ? (`
);

code = code.replace(
  `                  ) : null}
                </div>`,
  `                  ) : null}
                  </div>
                </div>`
);

// Bottom padding
code = code.replace(
  'className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32"',
  'className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32 sm:pb-40"' // Enough padding for bottom nav
);


fs.writeFileSync('src/components/IdeasView.tsx', code);
