import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import LogementsList from './pages/logements/LogementsList'
import LocatairesList from './pages/locataires/LocatairesList'
import Dashboard from './pages/dashboard/Dashboard'
import PaiementForm from './pages/paiements/PaiementForm'
import PaiementPublic from './pages/PaiementPublic'
import RouteProtegee from './components/RouteProtegee'
import BilanMensuel from './pages/dashboard/BilanMensuel'
import Abonnement from './pages/abonnement/Abonnement'

// Pages publiques : Home et PaiementPublic (lien de paiement direct)
// Toutes les autres pages internes restent protégées.

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
       <Route path="/payer/:locataireId/:moisConcerne" element={<PaiementPublic />} />
        <Route path="/logements" element={<RouteProtegee><LogementsList /></RouteProtegee>} />
        <Route path="/locataires/:logementId" element={<RouteProtegee><LocatairesList /></RouteProtegee>} />
        <Route path="/dashboard" element={<RouteProtegee><Dashboard /></RouteProtegee>} />
        <Route path="/paiements/nouveau" element={<RouteProtegee><PaiementForm /></RouteProtegee>} />
        <Route path="/bilans-mensuels" element={<RouteProtegee><BilanMensuel /></RouteProtegee>} />
        <Route path="/abonnement" element={<RouteProtegee><Abonnement /></RouteProtegee>} />
      </Routes>
    </BrowserRouter>
  )
}