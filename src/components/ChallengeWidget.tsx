import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, CheckCircle2, Circle, Sparkles, Loader2 } from 'lucide-react';
import { Challenge } from '../types';
import { getStoredChallenge, saveStoredChallenge } from '../utils/storage';
import { MotionConfetti } from './MotionConfetti';
import { sound } from '../utils/audio';

export const ChallengeWidget: React.FC = () => {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Load existing challenge on mount
    const current = getStoredChallenge();
    setChallenge(current);
  }, []);

  const handleToggle = () => {
    if (!challenge) return;
    const isDone = !challenge.termine;
    
    sound.click();
    
    const updated = {
      ...challenge,
      termine: isDone,
      completedAt: isDone ? Date.now() : undefined
    };
    
    setChallenge(updated);
    saveStoredChallenge(updated);

    if (isDone) {
      sound.playGoalComplete();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  };

  const handleGenerateCustom = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const currentKey = localStorage.getItem('gemini_coach_key');
      if (!currentKey) {
        // Fallback to random if no key
        alert("Clé API Gemini requise pour un défi personnalisé. Un défi aléatoire va être généré.");
        throw new Error("No key");
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Génère un micro-objectif hebdomadaire (défi) aléatoire et original lié au bien-être, à la productivité ou à la créativité. 
Format JSON:
{
  "titre": "Titre court",
  "description": "Une description motivante en une phrase."
}` }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (!res.ok) throw new Error("Erreur génération");
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No text");
      
      const parsed = JSON.parse(text);
      
      const newChallenge: Challenge = {
        id: `challenge-${Date.now()}`,
        titre: parsed.titre,
        description: parsed.description,
        dateCreation: Date.now(),
        termine: false
      };
      
      setChallenge(newChallenge);
      saveStoredChallenge(newChallenge);

    } catch (e) {
      console.error(e);
      // Fallback: force new random challenge
      localStorage.removeItem('une_etape_challenge_v1');
      setChallenge(getStoredChallenge());
    } finally {
      setIsGenerating(false);
    }
  };

  if (!challenge) return null;

  return (
    <div className="mb-6">
      <MotionConfetti active={showConfetti} />
      
      <motion.div 
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl p-5 border shadow-sm transition-all duration-500 ${
          challenge.termine 
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200/50 dark:border-emerald-800/30' 
            : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/30'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy className={`w-4 h-4 ${challenge.termine ? 'text-emerald-500' : 'text-amber-500'}`} />
              <h3 className={`text-[11px] font-bold uppercase tracking-wider ${
                challenge.termine ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}>
                Défi de la semaine
              </h3>
            </div>
            
            <h4 className={`text-base font-serif font-bold mb-1 ${
              challenge.termine ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-slate-100'
            } ${challenge.termine ? 'line-through decoration-emerald-300 dark:decoration-emerald-700' : ''}`}>
              {challenge.titre}
            </h4>
            
            <p className={`text-xs leading-relaxed ${
              challenge.termine ? 'text-emerald-700/80 dark:text-emerald-300/80' : 'text-slate-600 dark:text-slate-400'
            }`}>
              {challenge.description}
            </p>
          </div>
          
          <button
            onClick={handleToggle}
            className={`shrink-0 rounded-full transition-transform hover:scale-110 active:scale-95 p-1 ${
              challenge.termine ? 'text-emerald-500' : 'text-amber-400 hover:text-amber-500'
            }`}
          >
            {challenge.termine ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : (
              <Circle className="w-8 h-8" />
            )}
          </button>
        </div>

        {!challenge.termine && (
          <div className="mt-4 flex justify-end">
             <button
              onClick={handleGenerateCustom}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors disabled:opacity-50"
             >
               {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
               Nouveau défi IA
             </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
