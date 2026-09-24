export function estVeilleDeLoyer(dateEcheance) {
  if (!dateEcheance) return false
  const demain = new Date()
  demain.setDate(demain.getDate() + 1)
  return demain.getDate() === Number(dateEcheance)
}

function nettoyerNumero(telephone) {
  return (telephone || '').replace(/[^\d]/g, '')
}

export function genererLienRappelWhatsApp({ telephone, nom, loyerMensuelDu, dateEcheance }) {
  const numero = nettoyerNumero(telephone)
  if (!numero) return null

  const montant = Number(loyerMensuelDu || 0).toLocaleString('fr-FR')
  const veille = estVeilleDeLoyer(dateEcheance)

  const message = veille
    ? `Bonjour ${nom}, ceci est un rappel amical : demain est votre jour de paiement du loyer (${montant} FCFA). Merci de faire le nécessaire.`
    : `Bonjour ${nom}, ceci est un rappel concernant votre loyer de ${montant} FCFA. Merci de votre attention.`

  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`
}