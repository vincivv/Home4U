import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import './App.css'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import ErrorBoundary from './components/ErrorBoundary'
import Navbar from './components/Navbar'
import PageMotion from './components/PageMotion'
import ApiStatusBanner from './components/ApiStatusBanner'
import SessionLoadingGate from './components/SessionLoadingGate'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ProjectDetails = lazy(() => import('./pages/ProjectDetails'))
const About = lazy(() => import('./pages/About'))
const Workspace = lazy(() => import('./pages/Workspace'))

const RouteChunkFallback = () => (
  <div className="page-shell route-loading-state" role="status" aria-live="polite">
    <div className="route-loading-state__dot" aria-hidden="true" />
    <p>Loading screen…</p>
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth()
  const hidesGlobalNavbar = false
  
  if (loading) {
    return <SessionLoadingGate />
  }
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return (
    <div className="app-layout">
      {!hidesGlobalNavbar && <Navbar />}
      <main className={`app-main-content ${hidesGlobalNavbar ? 'app-main-content--standalone' : 'app-main-content--with-nav'}`}>
        <PageMotion>
          {children}
        </PageMotion>
      </main>
    </div>
  )
}

function App() {
  const { loading } = useAuth()
  const location = useLocation();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (prefersReducedMotion || !finePointer) return

    let activeEl = null
    let rafId = 0
    let pointerX = 0
    let pointerY = 0

    const resetEl = (el) => {
      if (!el) return
      el.classList.remove('is-tilting')
      el.style.removeProperty('--tilt-mx')
      el.style.removeProperty('--tilt-my')
      el.style.removeProperty('--tilt-rx')
      el.style.removeProperty('--tilt-ry')
    }

    const tick = () => {
      rafId = 0
      if (!activeEl) return
      const rect = activeEl.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      const x = Math.max(0, Math.min(1, (pointerX - rect.left) / rect.width))
      const y = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height))

      const rx = (0.5 - y) * 8
      const ry = (x - 0.5) * 10

      activeEl.style.setProperty('--tilt-mx', `${(x * 100).toFixed(1)}%`)
      activeEl.style.setProperty('--tilt-my', `${(y * 100).toFixed(1)}%`)
      activeEl.style.setProperty('--tilt-rx', `${rx.toFixed(2)}deg`)
      activeEl.style.setProperty('--tilt-ry', `${ry.toFixed(2)}deg`)
    }

    const requestTick = () => {
      if (rafId) return
      rafId = window.requestAnimationFrame(tick)
    }

    const onPointerMove = (event) => {
      if (!(event.target instanceof Element)) return
      const next = event.target.closest('[data-tilt]') || null
      if (next !== activeEl) {
        resetEl(activeEl)
        activeEl = next
        if (activeEl) activeEl.classList.add('is-tilting')
      }

      if (!activeEl) return
      pointerX = event.clientX
      pointerY = event.clientY
      
      // Update Global Spotlight Coordinates
      document.documentElement.style.setProperty('--cursor-x', `${pointerX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${pointerY}px`);

      requestTick()
    }

    const onScroll = () => {
      if (!activeEl) return
      requestTick()
    }

    const onBlur = () => {
      resetEl(activeEl)
      activeEl = null
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('blur', onBlur)
      if (rafId) window.cancelAnimationFrame(rafId)
      resetEl(activeEl)
      activeEl = null
    }
  }, [])

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    let activeMagnetic = null
    const strength = 0.2

    const clearMagnetic = () => {
      if (activeMagnetic) {
        activeMagnetic.style.transform = ''
        activeMagnetic = null
      }
    }

    const onPointerMove = (event) => {
      const el = event.target?.closest?.('[data-magnetic-button]')
      if (el !== activeMagnetic) {
        clearMagnetic()
        activeMagnetic = el ?? null
      }
      if (!activeMagnetic) return
      const r = activeMagnetic.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = (event.clientX - cx) * strength
      const dy = (event.clientY - cy) * strength
      activeMagnetic.style.transform = `translate(${dx}px, ${dy}px)`
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') clearMagnetic()
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', clearMagnetic, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', clearMagnetic)
      document.removeEventListener('visibilitychange', onVisibility)
      clearMagnetic()
    }
  }, [])

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduced) return

    let parallaxEl = null

    const clearParallax = () => {
      if (parallaxEl) {
        parallaxEl.style.removeProperty('--rx')
        parallaxEl.style.removeProperty('--ry')
        parallaxEl = null
      }
    }

    const onPointerMove = (event) => {
      const next = event.target?.closest?.('[data-parallax-card]')
      if (next !== parallaxEl) {
        clearParallax()
        parallaxEl = next ?? null
      }
      if (!parallaxEl) return
      const r = parallaxEl.getBoundingClientRect()
      const x = (event.clientX - r.left) / r.width - 0.5
      const y = (event.clientY - r.top) / r.height - 0.5
      parallaxEl.style.setProperty('--rx', `${y * -4}deg`)
      parallaxEl.style.setProperty('--ry', `${x * 5}deg`)
    }

    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', clearParallax, { passive: true })

    return () => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', clearParallax)
      clearParallax()
    }
  }, [])

  return (
    <ErrorBoundary>
      <ApiStatusBanner />
      <div className="spotlight-engine" aria-hidden="true" />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageMotion><Login /></PageMotion>} />
          <Route path="/register" element={<PageMotion><Login initialMode="register" /></PageMotion>} />
          <Route
            path="/about"
            element={
              loading ? (
                <SessionLoadingGate />
              ) : (
                <PageMotion>
                  <Suspense fallback={<RouteChunkFallback />}>
                    <About />
                  </Suspense>
                </PageMotion>
              )
            }
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteChunkFallback />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/project/:id" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteChunkFallback />}>
                  <ProjectDetails />
                </Suspense>
              </ProtectedRoute>
            } 
          />
          <Route path="/virtual-tour" element={<Navigate to="/workspace" replace />} />
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteChunkFallback />}>
                  <Workspace />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <PageMotion>
                <Suspense fallback={<RouteChunkFallback />}>
                  <About />
                </Suspense>
              </PageMotion>
            }
          />
          {/* Catch-all route for undefined paths */}
          <Route path="*" element={<PageMotion><NotFound /></PageMotion>} />
        </Routes>
      </AnimatePresence>
    </ErrorBoundary>
  )
}

export default App
