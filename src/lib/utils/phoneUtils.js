// src/lib/utils/phoneUtils.js
// Centralized phone validation and formatting for MyGesLoc

/**
 * Validates a phone number given country code and local number.
 * Supports +229 (Bénin) and +225 (Côte d'Ivoire).
 * @param {string} paysCode - e.g. '+229' or '+225'
 * @param {string} numeroLocal - local number with spaces, e.g. 'XX XX XX XX'
 * @returns {boolean} true if valid
 */
export function validatePhone(paysCode, numeroLocal) {
  if (!paysCode || !numeroLocal) return false;

  // Build full number without spaces
  const telephoneComplet = `${paysCode}${numeroLocal.replace(/\s/g, '')}`;

  // Only digits and leading plus allowed
  const regexAutorises = /^[\d\+]+$/;
  if (!regexAutorises.test(telephoneComplet)) return false;

  // Remove leading plus for digit checks
  const chiffres = telephoneComplet.replace(/\+/g, '');

  if (paysCode === '+229') {
    // Bénin: 11 digits total, starts with 229
    return chiffres.length === 11 && chiffres.startsWith('229');
  } else if (paysCode === '+225') {
    // Côte d'Ivoire: 11 digits total, starts with 225
    return chiffres.length === 11 && chiffres.startsWith('225');
  }
  return false;
}

/**
 * Formats a phone number to international format without spaces.
 * @param {string} paysCode - e.g. '+229' or '+225'
 * @param {string} numeroLocal - local number with spaces
 * @returns {string} e.g. '+229XXXXXXXXX' or empty string if invalid
 */
export function formatPhone(paysCode, numeroLocal) {
  if (!validatePhone(paysCode, numeroLocal)) return '';
  return `${paysCode}${numeroLocal.replace(/\s/g, '')}`;
}

/**
 * Returns the default country code for the user's locale (fallback to +225)
 * @returns {string}
 */
export function getDefaultPaysCode() {
  // Could be based on user prefs; default to Côte d'Ivoire as in original code
  return '+225';
}