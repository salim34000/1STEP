import React, { useState, useRef } from 'react';
import { Goal, FinancialData, AgendaEvent, IdeeProjet, Reve, JournalEntry, BackupData } from '../types';
import {
  generateBackupData,
  parseAndValidateBackupJSON,
  saveStoredGoals,
  saveStoredFinances,
  saveStoredAgendaEvents,
  saveStoredIdees,
  saveStoredReves,
  saveStoredJournal,
} from '../utils/storage';
import {
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileJson,
  X,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { sound } from '../utils/audio';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  finances: FinancialData;
  agendaEvents: AgendaEvent[];
  idees: IdeeProjet[];
  reves: Reve[];
  journal: JournalEntry[];
  onRestoreData: (data: {
    goals: Goal[];
    finances: FinancialData;
    agendaEvents: AgendaEvent[];
    idees: IdeeProjet[];
    reves: Reve[];
    journal?: JournalEntry[];
  }) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  goals,
  finances,
  agendaEvents,
  idees,
  reves,
  journal,
  onRestoreData,
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      sound.click();
      const backup = generateBackupData(goals, finances, agendaEvents, idees, reves, journal);
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `un-pas-sauvegarde-${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setImportStatus({
        type: 'success',
        message: 'Fichier de sauvegarde exporté avec succès !',
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: 'Erreur lors de l’exportation : ' + err?.message,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = parseAndValidateBackupJSON(content);
      if (result.success && result.data) {
        sound.playStepDone();
        // Save to storage
        saveStoredGoals(result.data.goals);
        saveStoredFinances(result.data.finances);
        saveStoredAgendaEvents(result.data.agendaEvents);
        saveStoredIdees(result.data.idees);
        saveStoredReves(result.data.reves);
        if (result.data.journal) {
          saveStoredJournal(result.data.journal);
        }

        // Notify App
        onRestoreData(result.data);

        setImportStatus({
          type: 'success',
          message: `Restauration réussie ! (${result.data.goals.length} objectifs, ${result.data.agendaEvents.length} événements, ${result.data.journal?.length || 0} entrées journal, ${result.data.idees.length} idées, ${result.data.reves.length} rêves).`,
        });
      } else {
        setImportStatus({
          type: 'error',
          message: result.error || 'Fichier de sauvegarde invalide.',
        });
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      id="modal-backup-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#1E1E1E] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-2xl space-y-5 relative overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1A237E]/10 dark:bg-indigo-950/60 text-[#1A237E] dark:text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-slate-900 dark:text-slate-100">
                Sauvegarde & Restauration
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Vos données 100 % privées et locales
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status notification if any */}
        {importStatus && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 ${
              importStatus.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#388E3C] dark:text-emerald-300 border border-emerald-200/50'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50'
            }`}
          >
            {importStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{importStatus.message}</span>
          </div>
        )}

        {/* Data summary */}
        <div className="bg-slate-50 dark:bg-zinc-900/60 rounded-2xl p-3.5 border border-slate-100 dark:border-zinc-800 text-xs space-y-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Contenu actuel de votre espace :
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <div>• Objectifs : <strong className="text-slate-700 dark:text-slate-200">{goals.length}</strong></div>
            <div>• Événements : <strong className="text-slate-700 dark:text-slate-200">{agendaEvents.length}</strong></div>
            <div>• Journal du jour : <strong className="text-slate-700 dark:text-slate-200">{journal.length}</strong></div>
            <div>• Idées & Projets : <strong className="text-slate-700 dark:text-slate-200">{idees.length}</strong></div>
            <div>• Rêves & Vision : <strong className="text-slate-700 dark:text-slate-200">{reves.length}</strong></div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-1">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#1A237E] hover:bg-[#283593] dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-medium text-xs transition-all shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4" />
              <span>Télécharger une sauvegarde complète (.json)</span>
            </div>
            <FileJson className="w-4 h-4 opacity-80" />
          </button>

          {/* Import Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
              id="backup-file-input"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 font-medium text-xs transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Upload className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Restaurer depuis un fichier JSON</span>
              </div>
              <RotateCcw className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center pt-2">
          Vos fichiers restent sur votre navigateur. Aucun compte ni serveur externe n'est requis.
        </div>
      </motion.div>
    </div>
  );
};
