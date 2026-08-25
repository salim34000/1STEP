import React, { useEffect, useState } from 'react';
import { InAppNotification, subscribeToInAppNotifications } from '../utils/notifications';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ArrowRight, X } from 'lucide-react';
import { sound } from '../utils/audio';


interface NotificationBannerProps {
  onNavigateToGoal: (goalId: string) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  onNavigateToGoal,
}) => {
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToInAppNotifications((notif) => {
      setActiveNotification(notif);
      // Play a pleasant reminder chime
      sound.playStepDone();

      // Auto dismiss after 8 seconds if not clicked
      const timer = setTimeout(() => {
        setActiveNotification((current) => (current?.id === notif.id ? null : current));
      }, 8000);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  if (!activeNotification) return null;

  return (
    <AnimatePresence>
      <div className="fixed top-4 left-0 right-0 z-50 pointer-events-none px-4 flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: -25, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-auto w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 overflow-hidden relative"
        >
          {/* Geometric accent line */}
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#5C8D89]" />

          <div className="flex items-start justify-between gap-3 pl-1">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-xl bg-[#F0F5F4] text-[#5C8D89] flex items-center justify-center shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] uppercase tracking-widest font-semibold text-[#5C8D89]">
                    Rappel d'étape
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-semibold text-slate-800 truncate">
                    {activeNotification.goalTitle}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-snug">
                  {activeNotification.stepText}
                </p>

                <button
                  type="button"
                  onClick={() => {
                    onNavigateToGoal(activeNotification.goalId);
                    setActiveNotification(null);
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#5C8D89] hover:text-[#466e6b] transition-colors"
                >
                  <span>Accéder à l'étape</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveNotification(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
