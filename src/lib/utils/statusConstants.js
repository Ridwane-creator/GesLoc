// src/lib/utils/statusConstants.js
// Centralized status definitions for MyGesLoc

export const STATUS_LABELS = {
  paye: 'À jour',
  retard: 'En retard',
  avance: 'En avance'
};

export const STATUS_COLORS = {
  paye: { label: 'À jour', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  retard: { label: 'En retard', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  avance: { label: 'En avance', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' }
};

/**
 * Returns the configuration object for a given status
 * @param {'paye'|'retard'|'avance'} status
 * @returns {object} with label, bg, text, dot
 */
export function getStatusConfig(status) {
  return STATUS_COLORS[status] || STATUS_COLORS.retard; // default to retard
}