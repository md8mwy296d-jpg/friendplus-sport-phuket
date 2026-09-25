import { lazy, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Layout from './components/Layout'
import Home from './pages/Home'
import RequireAuth from './components/RequireAuth'
import { countVisit } from './lib/visits'

// L'accueil reste dans le bundle principal ; les autres pages sont chargées à la demande.
const Explore = lazy(() => import('./pages/Explore'))
const SessionDetail = lazy(() => import('./pages/SessionDetail'))
const CreateSession = lazy(() => import('./pages/CreateSession'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Venues = lazy(() => import('./pages/Venues'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Club = lazy(() => import('./pages/Club'))
const Conversation = lazy(() => import('./pages/Conversation'))
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'))
const PostPage = lazy(() => import('./pages/PostPage'))
const Privacy = lazy(() => import('./pages/Privacy'))

gsap.registerPlugin(ScrollTrigger)

/** Global Lenis smooth scrolling, synced with GSAP ScrollTrigger. */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.15, anchors: true })
    lenis.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
    }
  }, [])
}

export default function App() {
  useSmoothScroll()
  useEffect(countVisit, [])
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explorer" element={<Explore />} />
        <Route path="session/:id" element={<SessionDetail />} />
        <Route path="creer" element={<RequireAuth><CreateSession /></RequireAuth>} />
        <Route path="mes-sessions" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="salles" element={<Venues />} />
        <Route path="club" element={<RequireAuth><Club /></RequireAuth>} />
        <Route path="club/:id" element={<RequireAuth><Conversation /></RequireAuth>} />
        <Route path="profil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="joueur/:id" element={<PlayerProfile />} />
        <Route path="publication/:id" element={<PostPage />} />
        <Route path="connexion" element={<Login />} />
        <Route path="confidentialite" element={<Privacy />} />
        <Route path="bienvenue" element={<Onboarding />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
