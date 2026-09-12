import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Modal from './Modal'

export default function ModalMiseANiveau({ ouverte, onFermer, fonctionnalite }) {
  const navigate = useNavigate()

  return (
    <Modal ouverte={ouverte} titre="Fonctionnalité Pro" onFermer={onFermer}>
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#4F46E5]" />
        </div>
        <p className="text-slate-600 text-sm mb-6">
          {fonctionnalite || 'Cette fonctionnalité'} est réservée aux plans Pro et Agence.
          Passe à un plan supérieur pour la débloquer.
        </p>
        <button
          onClick={() => {
            onFermer()
            navigate('/abonnement')
          }}
          className="w-full py-2.5 rounded-lg text-white text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
        >
          Passer au plan Pro
        </button>
        <button
          onClick={onFermer}
          className="w-full mt-2 py-2.5 rounded-lg text-slate-500 text-sm font-medium"
        >
          Plus tard
        </button>
      </div>
    </Modal>
  )
}