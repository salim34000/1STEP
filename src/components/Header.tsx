import React, { useState, useEffect } from 'react';
import { ArrowLeft, Volume2, VolumeX, Info, Sparkles, X, Bell, BellRing, Moon, Sun, Monitor, HardDrive } from 'lucide-react';
import { sound } from '../utils/audio';
import { motion, AnimatePresence } from 'motion/react';
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  triggerStepNotification,
} from '../utils/notifications';
import { ThemeMode, getStoredTheme, saveStoredTheme, applyTheme } from '../utils/theme';

interface HeaderProps {
  title?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onOpenBackup?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Un Pas.',
  onBack,
  showBack = false,
  rightAction,
  onOpenBackup,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(sound.isEnabled());
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [notifPermission, setNotifPermission] = useState<string>('default');
  const [theme, setTheme] = useState<ThemeMode>(() => getStoredTheme());
  const [isDarkEffective, setIsDarkEffective] = useState<boolean>(false);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
    const dark = applyTheme(theme);
    setIsDarkEffective(dark);

    // Listen to system preference changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        const d = applyTheme('system');
        setIsDarkEffective(d);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleCycleTheme = () => {
    // Cycle light -> dark -> system -> light
    let nextTheme: ThemeMode = 'dark';
    if (theme === 'light') nextTheme = 'dark';
    else if (theme === 'dark') nextTheme = 'system';
    else nextTheme = 'light';

    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
    const dark = applyTheme(nextTheme);
    setIsDarkEffective(dark);
  };

  const handleToggleSound = () => {
    const next = sound.toggle();
    setSoundEnabled(next);
  };

  const handleEnableNotifications = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  const handleSendTestNotification = () => {
    triggerStepNotification(
      {
        id: 'test-goal',
        titre: 'Routine & Focus',
        createdAt: Date.now(),
        etapes: [],
      },
      {
        id: 'test-step',
        texte: 'Prendre 5 minutes de pause pour respirer et s’étirer.',
        ordre: 1,
        termine: false,
      }
    );
  };

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-30 w-full bg-[#FDFDFD]/90 dark:bg-[#121212]/90 backdrop-blur-md border-b border-slate-100 dark:border-zinc-800/80 px-6 py-4 transition-colors"
      >
        <div className="max-w-xl md:max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {showBack && onBack ? (
              <button
                id="btn-header-back"
                type="button"
                onClick={onBack}
                aria-label="Retour à la liste"
                className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 active:bg-slate-100 dark:active:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A237E]/20"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-[#1A237E] dark:bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
            )}

            <div>
              <h1 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                {title}
              </h1>
              {!showBack && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold hidden sm:block">
                  Gestion d'objectifs & finances
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {rightAction}

            {/* Dark Mode Toggle */}
            <button
              id="btn-header-theme"
              type="button"
              onClick={handleCycleTheme}
              aria-label={
                theme === 'dark'
                  ? 'Thème sombre (Nuit Profonde activé)'
                  : theme === 'light'
                  ? 'Thème clair'
                  : 'Thème automatique (Système)'
              }
              title={
                theme === 'dark'
                  ? 'Thème : Nuit Profonde (forcé)'
                  : theme === 'light'
                  ? 'Thème : Clair (forcé)'
                  : 'Thème : Système (automatique)'
              }
              className="p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-[#1A237E] dark:hover:text-amber-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors relative"
            >
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" strokeWidth={1.5} />
              ) : theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              ) : (
                <Monitor className="w-4 h-4 text-slate-400 dark:text-slate-300" strokeWidth={1.5} />
              )}
            </button>

            {/* Notification permission / settings modal button */}
            <button
              id="btn-header-notifications"
              type="button"
              onClick={() => setShowNotifModal(true)}
              aria-label="Paramètres de rappels et notifications"
              title="Rappels & Notifications"
              className={`p-2 rounded-xl transition-colors ${
                notifPermission === 'granted'
                  ? 'text-[#1A237E] dark:text-indigo-400 bg-[#1A237E]/5 dark:bg-indigo-950/40'
                  : 'text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              {notifPermission === 'granted' ? (
                <BellRing className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Bell className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>

            <button
              id="btn-header-sound"
              type="button"
              onClick={handleToggleSound}
              aria-label={soundEnabled ? 'Désactiver le son zen' : 'Activer le son zen'}
              title={soundEnabled ? 'Son zen activé' : 'Son désactivé'}
              className={`p-2 rounded-xl transition-colors ${
                soundEnabled
                  ? 'text-[#1A237E] dark:text-indigo-400 bg-[#1A237E]/5 dark:bg-indigo-950/40'
                  : 'text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" strokeWidth={1.5} /> : <VolumeX className="w-4 h-4" strokeWidth={1.5} />}
            </button>

            {onOpenBackup && (
              <button
                id="btn-header-backup"
                type="button"
                onClick={onOpenBackup}
                aria-label="Sauvegarde et restauration des données"
                title="Sauvegarde & Export"
                className="p-2 rounded-xl text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
              >
                <HardDrive className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}

            <button
              id="btn-header-info"
              type="button"
              onClick={() => setShowInfoModal(true)}
              aria-label="Philosophie de l'application"
              className="p-2 rounded-xl text-slate-400 hover:text-[#1A237E] dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <Info className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {/* Notifications Settings Modal */}
      <AnimatePresence>
        {showNotifModal && (
          <div
            id="modal-notif-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowNotifModal(false)}
          >
            <motion.div
              id="modal-notif-card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl border border-slate-100 dark:border-zinc-800 p-6 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A237E] dark:bg-indigo-500"></div>

              <div className="flex items-center justify-between mb-4 pl-1">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold mb-0.5">
                    Rappels
                  </p>
                  <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100">Notifications</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                <p className="text-xs">
                  Vous pouvez associer une date et une heure de rappel à chaque étape d'un objectif.
                </p>

                <div className="bg-[#F8F9F9] dark:bg-[#282828] rounded-2xl p-3.5 border border-slate-100 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Notifications navigateur
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        notifPermission === 'granted'
                          ? 'bg-[#1A237E]/10 text-[#1A237E] dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {notifPermission === 'granted' ? 'Activées' : 'Non autorisées'}
                    </span>
                  </div>

                  {notifPermission !== 'granted' && isNotificationSupported() && (
                    <button
                      type="button"
                      onClick={handleEnableNotifications}
                      className="w-full py-2 px-3 bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-xl text-xs font-medium transition-colors"
                    >
                      Autoriser les notifications
                    </button>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#1A237E] dark:text-indigo-400" />
                    <span>Envoyer un rappel de test</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNotifModal(false)}
                className="mt-5 w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-2xl font-medium text-sm transition-all shadow-xs"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Modal on Principle */}
      <AnimatePresence>
        {showInfoModal && (
          <div
            id="modal-info-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs"
            onClick={() => setShowInfoModal(false)}
          >
            <motion.div
              id="modal-info-card"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1E1E1E] rounded-3xl shadow-xl border border-slate-100 dark:border-zinc-800 p-6 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#1A237E] dark:bg-indigo-500"></div>

              <div className="flex items-center justify-between mb-4 pl-1">
                <div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold mb-0.5">
                    Philosophie
                  </p>
                  <h2 className="text-lg font-serif font-bold text-slate-900 dark:text-slate-100">Le principe</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                <p>
                  <strong className="text-slate-900 dark:text-slate-100 font-semibold">Une seule étape à la fois.</strong>{' '}
                  Pour éviter la surcharge mentale et la dispersion, le futur reste invisible.
                </p>
                <p>
                  Concentrez-vous pleinement sur l'action présente. Quand vous validez l'étape en cours, la suivante se révèle.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  🔁 <strong>Objectifs récurrents :</strong> Réinitialisation automatique à la fin du cycle (quotidien, hebdomadaire, mensuel).
                </p>
                <div className="bg-[#F8F9F9] dark:bg-[#282828] rounded-2xl p-4 text-xs text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-zinc-700/60">
                  🍃 Vos données et rappels sont conservés localement sur votre appareil, sans inscription ni serveur.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-slate-900 text-white rounded-2xl font-medium text-sm transition-all shadow-xs"
              >
                Compris
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

