// src/lib/utils/phoneUtils.js
// Validation et formatage des numéros de téléphone MyGesLoc.
//
// Plans de numérotation actuels (10 chiffres) :
//   - Bénin (+229)         : 01 XX XX XX XX  (le préfixe 01 est obligatoire depuis le 30/11/2024)
//   - Côte d'Ivoire (+225) : 10 chiffres
// Un ancien numéro béninois à 8 chiffres est converti automatiquement en ajoutant 01.

const PAYS = {
  '+229': { nom: 'Bénin', longueurLocale: 10, prefixeObligatoire: '01' },
  '+225': { nom: "Côte d'Ivoire", longueurLocale: 10 },
}

function chiffres(valeur) {
  return String(valeur ?? '').replace(/\D/g, '')
}

/**
 * Numéro local normalisé (chiffres uniquement).
 * Bénin : un numéro à 8 chiffres reçoit le préfixe 01.
 */
export function normaliserNumeroLocal(paysCode, numeroLocal) {
  let local = chiffres(numeroLocal)
  if (paysCode === '+229' && local.length === 8) local = '01' + local
  return local
}

/**
 * @param {string} paysCode - '+229' ou '+225'
 * @param {string} numeroLocal - numéro local, avec ou sans espaces
 * @returns {boolean}
 */
export function validatePhone(paysCode, numeroLocal) {
  const pays = PAYS[paysCode]
  if (!pays || !numeroLocal) return false

  const local = normaliserNumeroLocal(paysCode, numeroLocal)
  if (local.length !== pays.longueurLocale) return false
  if (pays.prefixeObligatoire && !local.startsWith(pays.prefixeObligatoire)) return false
  return true
}

/**
 * Numéro au format international sans espaces, ex. '+2290197123456'.
 * Retourne '' si le numéro est invalide.
 */
export function formatPhone(paysCode, numeroLocal) {
  if (!validatePhone(paysCode, numeroLocal)) return ''
  return `${paysCode}${normaliserNumeroLocal(paysCode, numeroLocal)}`
}

/**
 * Découpe un numéro enregistré (ex. '+2290197123456' ou ancien '+22997123456')
 * en { paysCode, numeroLocal } pour préremplir le formulaire.
 */
export function decomposerTelephone(telephone) {
  const brut = String(telephone ?? '').trim()
  const nb = chiffres(brut)

  if (brut.startsWith('+')) {
    for (const paysCode of Object.keys(PAYS)) {
      const indicatif = paysCode.slice(1)
      if (nb.startsWith(indicatif) && nb.length > indicatif.length) {
        return { paysCode, numeroLocal: normaliserNumeroLocal(paysCode, nb.slice(indicatif.length)) }
      }
    }
  }
  return { paysCode: '+229', numeroLocal: normaliserNumeroLocal('+229', nb) }
}

/**
 * Indicatif par défaut (le projet cible le Bénin).
 */
export function getDefaultPaysCode() {
  return '+229'
}