import { useEffect } from 'react'
import { Routes, Route } from 'react-router'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import Layout from './components/Layout'
import Home from './pages/Home'
import Explore from './pages/Explore'
import SessionDetail from './pages/SessionDetail'
import CreateSession from './pages/CreateSession'
import Dashboard from './pages/Dashboard'
import Venues from './pages/Venues'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import RequireAuth from './components/RequireAuth'

gsap.registerPlugin(ScrollTrigger)

/** Global Lenis smooth scrolling, synced with GSAP ScrollTrigger. */
function useSmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const lenis = new Lenis({ lerp: 0.1, anchors: true })
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
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="explorer" element={<Explore />} />
        <Route path="session/:id" element={<SessionDetail />} />
        <Route path="creer" element={<RequireAuth><CreateSession /></RequireAuth>} />
        <Route path="mes-sessions" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="salles" element={<Venues />} />
        <Route path="profil" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="connexion" element={<Login />} />
        <Route path="bienvenue" element={<Onboarding />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
