import { Goal, Step, RecurrenceType } from '../types';

export interface InAppNotification {
  id: string;
  goalId: string;
  goalTitle: string;
  stepId: string;
  stepText: string;
  timestamp: number;
}

type NotificationCallback = (notif: InAppNotification) => void;
const listeners = new Set<NotificationCallback>();

export function subscribeToInAppNotifications(cb: NotificationCallback): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Erreur lors de la demande de permission de notification:', err);
    return 'denied';
  }
}

/**
 * Sends both a native system notification (if permitted) and an in-app banner
 */
export function triggerStepNotification(goal: Goal, step: Step): void {
  const notifData: InAppNotification = {
    id: `${goal.id}-${step.id}-${Date.now()}`,
    goalId: goal.id,
    goalTitle: goal.titre,
    stepId: step.id,
    stepText: step.texte,
    timestamp: Date.now(),
  };

  // 1. Native System Notification
  if (isNotificationSupported() && Notification.permission === 'granted') {
    try {
      const systemNotif = new Notification(goal.titre, {
        body: step.texte,
        icon: '/favicon.ico',
        tag: `step-${step.id}`,
      });

      systemNotif.onclick = () => {
        window.focus();
        systemNotif.close();
      };
    } catch (e) {
      console.warn('Impossible de déclencher la notification système native:', e);
    }
  }

  // 2. Broadcast to In-App listener
  listeners.forEach((listener) => {
    try {
      listener(notifData);
    } catch (err) {
      console.error('Erreur dans le listener de notification in-app:', err);
    }
  });
}

/**
 * Formats an ISO string (e.g. 2026-08-25T14:30) to friendly French text
 */
export function formatReminderDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}h${minutes}`;

  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  }
  if (isTomorrow) {
    return `Demain à ${timeStr}`;
  }

  const monthNames = [
    'janv.',
    'févr.',
    'mars',
    'avr.',
    'mai',
    'juin',
    'juil.',
    'août',
    'sept.',
    'oct.',
    'nov.',
    'déc.',
  ];

  return `${date.getDate()} ${monthNames[date.getMonth()]} à ${timeStr}`;
}

/**
 * Calculates the shifted reminder date for recurring goals (daily, weekly, monthly)
 */
export function shiftReminderForRecurrence(
  dateStr?: string,
  recurrence: RecurrenceType = 'none'
): string | undefined {
  if (!dateStr || recurrence === 'none') return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;

  if (recurrence === 'daily') {
    d.setDate(d.getDate() + 1);
  } else if (recurrence === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (recurrence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
