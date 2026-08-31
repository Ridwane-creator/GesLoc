import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import LogementsList from './pages/logements/LogementsList'
import LocatairesList from './pages/locataires/LocatairesList'
import Dashboard from './pages/dashboard/Dashboard'
import PaiementForm from './pages/paiements/PaiementForm';
import RouteProtegee from './components/RouteProtegee';

// À compléter au fur et à mesure que les écrans sont prêts.
// Penser à protéger les routes privées une fois l'authentification branchée
// (rediriger vers /login si aucun utilisateur connecté).

export default function AppRoutes() {
  return (
    <BrowserRouter>
     <Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/signup" element={<Signup />} />

  <Route path="/logements" element={<RouteProtegee><LogementsList /></RouteProtegee>} />
  <Route path="/locataires/:logementId" element={<RouteProtegee><LocatairesList /></RouteProtegee>} />
  <Route path="/dashboard" element={<RouteProtegee><Dashboard /></RouteProtegee>} />
  <Route path="/paiements/nouveau" element={<RouteProtegee><PaiementForm /></RouteProtegee>} />

  <Route path="/" element={<RouteProtegee><Dashboard /></RouteProtegee>} />
</Routes> 
    </BrowserRouter>
  )
}
