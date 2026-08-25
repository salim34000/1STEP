import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles, X, Volume2, Key, AlertTriangle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { sound } from '../utils/audio';

type CoachState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

const FALLBACK_PHRASES = [
  "Un pas après l'autre. Quelle est la toute petite action que vous pouvez faire aujourd'hui ?",
  "Découpez votre objectif en étapes de 5 minutes. C'est le meilleur moyen de démarrer.",
  "Ne cherchez pas la perfection, cherchez le progrès continu.",
  "Rappelez-vous de votre 'pourquoi'. Chaque petite action compte."
];

export const VoiceAgentWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [coachState, setCoachState] = useState<CoachState>('idle');
  const [message, setMessage] = useState("Prêt à décomposer vos objectifs");
  
  const [apiKey, setApiKey] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_coach_key');
    if (storedKey) setApiKey(storedKey);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleWidget = () => {
    sound.click();
    if (isOpen) {
      stopAll();
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (!apiKey && navigator.onLine) {
        setShowKeyInput(true);
        setMessage("Configuration requise.");
      } else {
        startSession();
      }
    }
  };

  const saveKey = () => {
    if (tempKey.trim()) {
      localStorage.setItem('gemini_coach_key', tempKey.trim());
      setApiKey(tempKey.trim());
      setShowKeyInput(false);
      startSession(tempKey.trim());
    }
  };

  const startSession = (overrideKey?: string) => {
    const currentKey = overrideKey || apiKey;
    if (isOffline) {
      provideOfflineCoaching();
      return;
    }
    if (!currentKey) {
      setShowKeyInput(true);
      return;
    }

    startListening(currentKey);
  };

  const startListening = (currentKey: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage("Reconnaissance vocale non supportée sur ce navigateur.");
      setCoachState('error');
      return;
    }

    if (window.speechSynthesis) {
      const prime = new SpeechSynthesisUtterance('');
      prime.volume = 0;
      window.speechSynthesis.speak(prime);
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'fr-FR';
      recognition.interimResults = false;
      
      recognition.onstart = () => {
        setCoachState('listening');
        setMessage("Je vous écoute...");
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        setMessage(`« ${transcript} »`);
        await fetchCoachResponse(transcript, currentKey);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          setCoachState('idle');
          setMessage("Prêt à vous écouter.");
          return;
        }
        setMessage("Erreur de compréhension. Réessayez.");
        setCoachState('error');
      };

      recognition.onend = () => {
        if (coachState === 'listening') {
          setCoachState('idle');
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setMessage("Impossible d'activer le microphone.");
      setCoachState('error');
    }
  };

  const fetchCoachResponse = async (userText: string, currentKey: string) => {
    setCoachState('thinking');
    setMessage("Réflexion en cours...");
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    let responseText = "";
    let errorEncountered = false;

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${currentKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Tu es un coach en productivité expert (voix masculine, ton encourageant et direct). L'utilisateur te dit : "${userText}". Réponds en 2-3 phrases courtes pour l'aider à avancer ou à décomposer son problème. Ne mets pas de Markdown, parle naturellement.` }] }]
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('gemini_coach_key');
          setApiKey('');
          throw new Error("Clé API invalide (401)");
        }
        if (res.status === 429) throw new Error("Quota API dépassé (429)");
        throw new Error(`Erreur serveur (${res.status})`);
      }

      const data = await res.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Je n'ai pas pu générer de réponse.";
    } catch (err: any) {
      errorEncountered = true;
      if (err.name === 'AbortError') {
        setMessage("Connexion impossible, réessayez (délai dépassé).");
      } else {
        setMessage(`Erreur : ${err.message}`);
      }
    } finally {
      clearTimeout(timeoutId);
      if (errorEncountered) {
        setCoachState('error');
      } else {
        speakText(responseText);
      }
    }
  };

  const provideOfflineCoaching = () => {
    const phrase = FALLBACK_PHRASES[Math.floor(Math.random() * FALLBACK_PHRASES.length)];
    speakText(phrase);
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      setMessage(text);
      setCoachState('idle');
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.lang.includes('fr') && v.name.toLowerCase().includes('male'));
    if (maleVoice) utterance.voice = maleVoice;

    utterance.onstart = () => {
      setCoachState('speaking');
      setMessage(text);
    };
    
    utterance.onend = () => {
      setCoachState('idle');
      setMessage("Prêt à vous écouter à nouveau.");
    };
    
    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setCoachState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopAll = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch(e) {}
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setCoachState('idle');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="bg-white dark:bg-[#1E1E1E] border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-2xl w-80 origin-bottom-right flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold font-serif">
                <Sparkles className="w-4 h-4" />
                <span>Coach IA</span>
                {isOffline && <WifiOff className="w-3.5 h-3.5 text-slate-400 ml-1" title="Mode hors-ligne" />}
              </div>
              <button
                onClick={toggleWidget}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {showKeyInput ? (
              <div className="flex flex-col gap-3 py-2">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-xs text-indigo-800 dark:text-indigo-300 mb-2 leading-relaxed">
                    Pour discuter avec le coach, une clé API Gemini est requise (gratuite).
                  </p>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    Obtenir ma clé sur AI Studio
                  </a>
                </div>
                <input 
                  type="password" 
                  value={tempKey} 
                  onChange={(e) => setTempKey(e.target.value)} 
                  placeholder="AIzaSy..." 
                  className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={() => {
                      setShowKeyInput(false);
                      provideOfflineCoaching();
                    }} 
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
                  >
                    Mode Secours
                  </button>
                  <button 
                    onClick={saveKey} 
                    disabled={!tempKey.trim()}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 flex flex-col items-center gap-4">
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                  coachState === 'listening' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 
                  coachState === 'error' ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' : 
                  coachState === 'speaking' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' :
                  'bg-slate-100 dark:bg-zinc-800 text-slate-400'
                }`}>
                  {coachState === 'thinking' ? (
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  ) : coachState === 'error' ? (
                    <AlertTriangle className="w-8 h-8" />
                  ) : coachState === 'speaking' ? (
                    <Volume2 className="w-8 h-8 animate-pulse" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                  
                  {coachState === 'listening' && (
                    <span className="absolute inset-0 rounded-full ring-2 ring-indigo-500/30 animate-ping"></span>
                  )}
                  {coachState === 'speaking' && (
                    <>
                      <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-pulse"></span>
                      <span className="absolute -inset-2 rounded-full border-2 border-emerald-300 animate-ping opacity-50"></span>
                    </>
                  )}
                </div>

                <div className="w-full">
                  <p className={`text-sm font-semibold transition-colors leading-relaxed ${
                    coachState === 'error' ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {message}
                  </p>
                </div>

                {coachState !== 'thinking' && coachState !== 'speaking' && coachState !== 'listening' && (
                  <button
                    onClick={() => startSession()}
                    className="mt-2 py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                  >
                    {coachState === 'error' ? "Réessayer" : "Parler au coach"}
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                )}
                
                {coachState === 'speaking' && (
                  <button
                    onClick={stopAll}
                    className="mt-2 py-2.5 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl transition-colors"
                  >
                    Interrompre
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={toggleWidget}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 group relative"
          title="Coach IA - Décomposez vos objectifs"
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 border-2 border-white dark:border-[#121212] rounded-full animate-bounce"></span>
        </motion.button>
      )}
    </div>
  );
};
