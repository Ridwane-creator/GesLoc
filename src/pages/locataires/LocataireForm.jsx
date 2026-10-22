import { validatePhone } from '../../lib/utils/phoneUtils';

export default function LocataireForm({ formulaire, setFormulaire }) {

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
            value={formulaire.paysCode || '+229'}
            onChange={(e) => setFormulaire((f) => ({ ...f, paysCode: e.target.value }))}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
          >
            <option value="+229">+229 (Bénin)</option>
            <option value="+225">+225 (Côte d'Ivoire)</option>
          </select>
          <input
            type="text"
            value={formulaire.numeroLocal || ''}
            onChange={(e) => setFormulaire((f) => ({ ...f, numeroLocal: e.target.value.replace(/[^0-9 ]/g, '').slice(0, 14) }))}
            inputMode="tel"
            placeholder="01 XX XX XX XX"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-600"
          />
        </div>
        {(!formulaire.paysCode || !formulaire.numeroLocal || !validatePhone(formulaire.paysCode, formulaire.numeroLocal)) && formulaire.paysCode !== undefined && (
          <p className="text-sm text-red-600 mt-1">
            Numéro invalide. Bénin : 01 + 8 chiffres (ex. 01 97 12 34 56). Côte d'Ivoire : 10 chiffres.
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