/**
 * Date helper utilities for calendar & agenda features
 */

export function getTodayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseISODate(isoString: string): Date {
  const [year, month, day] = isoString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Returns an array of 7 Date objects corresponding to Monday..Sunday for the week containing the given reference date
 */
export function getWeekDates(referenceDate: Date): Date[] {
  const date = new Date(referenceDate);
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const currentDay = date.getDay();
  // We want Monday as start of week (0 = Monday ... 6 = Sunday)
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + distanceToMonday);
  monday.setHours(0, 0, 0, 0);

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    week.push(nextDay);
  }
  return week;
}

export interface MonthGridDay {
  date: Date;
  dateISO: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generates the full 35-42 days grid for a month calendar starting on Monday.
 */
export function getMonthCalendarGrid(year: number, monthIndex: number): MonthGridDay[] {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const todayISO = getTodayISO();
  
  // Day of week for first day (0 = Sunday, 1 = Monday, ...)
  const startDay = firstDayOfMonth.getDay();
  const leadingDays = startDay === 0 ? 6 : startDay - 1; // Days from previous month to display

  const startDate = new Date(year, monthIndex, 1 - leadingDays);
  const grid: MonthGridDay[] = [];

  // 6 weeks * 7 days = 42 cells or 35 cells
  for (let i = 0; i < 42; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dateISO = formatISODate(d);
    grid.push({
      date: d,
      dateISO,
      dayNumber: d.getDate(),
      isCurrentMonth: d.getMonth() === monthIndex,
      isToday: dateISO === todayISO,
    });
  }

  // If the last 7 days are entirely next month, slice to 35
  const lastRow = grid.slice(35);
  const allNextMonth = lastRow.every((item) => !item.isCurrentMonth);
  return allNextMonth ? grid.slice(0, 35) : grid;
}

const MONTH_NAMES_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
];

const MONTH_NAMES_CAPITAL_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAY_NAMES_SHORT_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_NAMES_MINI_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES_FULL_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function getShortDayNameFR(date: Date): string {
  return DAY_NAMES_SHORT_FR[date.getDay()];
}

export function getFullDayNameFR(date: Date): string {
  return DAY_NAMES_FULL_FR[date.getDay()];
}

export function getMonthNameFR(date: Date): string {
  return MONTH_NAMES_CAPITAL_FR[date.getMonth()];
}

export function getMonthNameByIndexFR(monthIndex: number): string {
  return MONTH_NAMES_CAPITAL_FR[monthIndex] || '';
}

/**
 * Formats a YYYY-MM-DD string into French text:
 * e.g. "Aujourd'hui", "Demain", "28 août", or "15 sept. 2027"
 */
export function formatPlannedDateFriendly(isoString?: string | null): string {
  if (!isoString) return '';
  
  const todayISO = getTodayISO();
  
  // Check tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = formatISODate(tomorrow);

  // Check yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = formatISODate(yesterday);

  if (isoString === todayISO) {
    return "Aujourd'hui";
  }
  if (isoString === tomorrowISO) {
    return 'Demain';
  }
  if (isoString === yesterdayISO) {
    return 'Hier';
  }

  const d = parseISODate(isoString);
  const currentYear = new Date().getFullYear();
  const dayNumber = d.getDate();
  const monthName = MONTH_NAMES_FR[d.getMonth()];

  if (d.getFullYear() === currentYear) {
    return `${dayNumber} ${monthName}`;
  }
  return `${dayNumber} ${monthName} ${d.getFullYear()}`;
}

/**
 * Formats planned date AND time cleanly:
 * e.g. "Prévu le 28 août à 14h30", "Prévu aujourd'hui à 09:00", "Prévu demain", etc.
 */
export function formatPlannedDateWithTime(
  isoString?: string | null,
  heure?: string | null
): string {
  if (!isoString) return '';
  const dateFriendly = formatPlannedDateFriendly(isoString);
  
  // Format hour (e.g. 14:30 -> 14h30)
  let formattedTime = '';
  if (heure && heure.trim()) {
    const parts = heure.trim().split(':');
    if (parts.length >= 2) {
      formattedTime = ` à ${parts[0]}h${parts[1]}`;
    } else {
      formattedTime = ` à ${heure}`;
    }
  }

  const isRelative = dateFriendly === "Aujourd'hui" || dateFriendly === 'Demain' || dateFriendly === 'Hier';
  const prefix = isRelative ? 'Prévu ' : 'Prévu le ';

  return `${prefix}${dateFriendly.toLowerCase() === "aujourd'hui" ? "aujourd'hui" : dateFriendly}${formattedTime}`;
}

/**
 * Formats time string: "14:30" -> "14h30", or range "14:30" - "15:30" -> "14h30 - 15h30"
 */
export function formatTimeDisplay(heure?: string, heureFin?: string): string {
  if (!heure) return '';
  const cleanStart = heure.replace(':', 'h');
  if (!heureFin) return cleanStart;
  const cleanEnd = heureFin.replace(':', 'h');
  return `${cleanStart} - ${cleanEnd}`;
}

/**
 * Compares two optional time strings (HH:mm) for chronological sorting.
 * Items without time come first (all-day / sans heure précise).
 */
export function compareTimes(
  aTime?: string | null,
  bTime?: string | null
): number {
  if (!aTime && !bTime) return 0;
  if (!aTime) return -1; // Untimed first
  if (!bTime) return 1;
  return aTime.localeCompare(bTime);
}

/**
 * Full readable date: "Lundi 24 août 2026"
 */
export function formatFullDateHeader(date: Date): string {
  const dayName = DAY_NAMES_FULL_FR[date.getDay()];
  const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const dayNumber = date.getDate();
  const monthName = MONTH_NAMES_FR[date.getMonth()];
  const year = date.getFullYear();

  return `${capitalizedDayName} ${dayNumber} ${monthName} ${year}`;
}
