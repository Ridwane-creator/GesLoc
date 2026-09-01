import { X } from 'lucide-react';

export default function Modal({ ouverte, titre, onFermer, children }) {
  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">{titre}</h3>
          <button
            onClick={onFermer}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}