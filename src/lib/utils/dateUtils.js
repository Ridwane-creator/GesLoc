// src/lib/utils/dateUtils.js
// Centralized date formatting utilities for MyGesLoc

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Returns the current month in YYYY-MM-01 format (local time, no timezone shift)
 * @returns {string} e.g. '2026-09-01'
 */
export function getCurrentMonthISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}-01`;
}

/**
 * Returns a label for a month in YYYY-MM format (or YYYY-MM-01)
 * @param {string} monthISO - e.g. '2026-09-01' or '2026-09'
 * @returns {string} e.g. 'Septembre 2026'
 */
export function formatMonthLabel(monthISO) {
  const [year, month] = monthISO.split('-');
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex < MONTHS_FR.length) {
    return `${MONTHS_FR[monthIndex]} ${year}`;
  }
  return monthISO; // fallback
}

/**
 * Formats an ISO date string (YYYY-MM-DD) to French locale date (dd/mm/yyyy)
 * @param {string} dateISO - e.g. '2026-09-15'
 * @returns {string} e.g. '15 sept. 2026'
 */
export function formatDate(dateISO) {
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Date(dateISO).toLocaleDateString('fr-FR', options);
}

export { MONTHS_FR };