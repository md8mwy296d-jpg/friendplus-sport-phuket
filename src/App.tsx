import { lazy, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import Layout from './components/Layout'
import Home from './pages/Home'
import RequireAuth from './components/RequireAuth'
import { countVisit } from './lib/visits'

// L'accueil reste dans le bundle principal ; les autres pages sont chargées à la demande.
const Explore = lazy(() => import('./pages/Explore'))
const Arrival = lazy(() => import('./pages/Arrival'))
const OfferPage = lazy(() => import('./pages/OfferPage'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Bookings = lazy(() => import('./pages/Bookings'))
const BookingDetail = lazy(() => import('./pages/BookingDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Admin = lazy(() => import('./pages/Admin'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))

export default function App() {
  useEffect(countVisit, [])
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explorer" element={<Explore />} />
        <Route path="mon-arrivee" element={<Arrival />} />
        <Route path="offre/:slug" element={<OfferPage />} />
        <Route path="reserver/:slug" element={<RequireAuth><Checkout /></RequireAuth>} />
        <Route path="reservations" element={<RequireAuth><Bookings /></RequireAuth>} />
        <Route path="reservations/:id" element={<RequireAuth><BookingDetail /></RequireAuth>} />
        <Route path="profil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="admin" element={<RequireAuth><Admin /></RequireAuth>} />
        <Route path="connexion" element={<Login />} />
        <Route path="bienvenue" element={<Onboarding />} />
        <Route path="conditions" element={<Terms />} />
        <Route path="confidentialite" element={<Privacy />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
