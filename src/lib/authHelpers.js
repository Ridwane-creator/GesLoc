/**
 * Détecte si l'identifiant saisi est un email ou un numéro de téléphone,
 * et retourne l'objet à passer aux méthodes Supabase Auth
 * (signInWithPassword / signUp acceptent { email, password } OU { phone, password }).
 */
export function construireIdentifiant(saisie) {
  const valeur = saisie.trim();
  const estEmail = valeur.includes('@');

  if (estEmail) {
    return { email: valeur.toLowerCase() };
  }

  // Normalisation basique du numéro (retire espaces, tirets, points)
  const numeroNettoye = valeur.replace(/[\s.-]/g, '');
  return { phone: numeroNettoye };
}

export function messageErreurAuth(erreur) {
  if (!erreur) return null;

  const message = erreur.message || '';

  if (message.includes('Invalid login credentials')) {
    return 'Email/téléphone ou mot de passe incorrect.';
  }
  if (message.includes('User already registered')) {
    return 'Un compte existe déjà avec cet identifiant.';
  }
  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }

  return "Une erreur est survenue. Réessaie dans quelques instants.";
}