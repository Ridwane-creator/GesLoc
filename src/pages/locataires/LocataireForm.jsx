export default function LocataireForm({ formulaire, setFormulaire }) {
  // Fonction de validation du numéro de téléphone
  const validerTelephone = (paysCode, numeroLocal) => {
    // Champ obligatoire maintenant
    if (!paysCode || !numeroLocal) {
      return false;
    }

    // Construire le numéro complet pour validation
    const telephoneComplet = `${paysCode}${numeroLocal.replace(/\s/g, '')}`;

    // Autoriser seulement les chiffres et le signe + en début
    const regexAutorises = /^[\d\+]+$/;
    if (!regexAutorises.test(telephoneComplet)) {
      return false;
    }

    // Vérifier la longueur selon le pays
    const chiffres = telephoneComplet.replace(/\+/g, '');

    if (paysCode === '+229') {
      // Bénin: 8 chiffres après le +229 (total 11 avec indicatif)
      return chiffres.length === 11 && chiffres.startsWith('229');
    } else if (paysCode === '+225') {
      // Côte d'Ivoire: 8 chiffres après le +225 (total 11 avec indicatif)
      return chiffres.length === 11 && chiffres.startsWith('225');
    }

    return false;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
        <input
          type="text"
          value={formulaire.nom}
          onChange={(e) => setFormulaire((f) => ({ ...f, nom: e.target.value }))}
          placeholder="Ex : Koffi Kouamé"
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
        <div className="flex gap-3">
          <select
            value={formulaire.paysCode || '+225'}
            onChange={(e) => setFormulaire((f) => ({ ...f, paysCode: e.target.value }))}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
          >
            <option value="+229">+229 (Bénin)</option>
            <option value="+225">+225 (Côte d'Ivoire)</option>
          </select>
          <input
            type="text"
            value={formulaire.numeroLocal || ''}
            onChange={(e) => setFormulaire((f) => ({ ...f, numeroLocal: e.target.value }))}
            placeholder="XX XX XX XX"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
          />
        </div>
        {(!formulaire.paysCode || !formulaire.numeroLocal || !validerTelephone(formulaire.paysCode, formulaire.numeroLocal)) && formulaire.paysCode !== undefined && (
          <p className="text-sm text-red-600 mt-1">
            Numéro de téléphone invalide. Format attendu : +229 XX XX XX XX ou +225 XX XX XX XX
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Loyer mensuel (FCFA)
          </label>
          <input
            type="number"
            min="0"
            value={formulaire.loyer_mensuel_du}
            onChange={(e) =>
              setFormulaire((f) => ({ ...f, loyer_mensuel_du: e.target.value }))
            }
            placeholder="250000"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Jour d'échéance (1-28)
          </label>
          <input
            type="number"
            min="1"
            max="28"
            value={formulaire.date_echeance}
            onChange={(e) => setFormulaire((f) => ({ ...f, date_echeance: e.target.value }))}
            placeholder="Ex : 5"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/40 focus:border-[#4F46E5]"
          />
        </div>
      </div>
    </div>
  );
}