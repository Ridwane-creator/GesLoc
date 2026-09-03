/**
 * Prépare l'objet à passer aux méthodes Supabase Auth (email uniquement
 * pour l'instant — l'authentification par téléphone nécessiterait un
 * fournisseur SMS configuré côté Supabase, non activé sur ce projet).
 */
export function construireIdentifiant(saisie) {
  return { email: saisie.trim().toLowerCase() };
}

export function messageErreurAuth(erreur) {
  if (!erreur) return null;

  const message = erreur.message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (message.includes('User already registered')) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  return "Une erreur est survenue. Réessaie dans quelques instants.";
}