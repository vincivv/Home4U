import { motion } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import './SessionLoadingGate.css';

export default function SessionLoadingGate() {
  return (
    <div className="session-gate" aria-busy="true" aria-label="Loading your session">
      <div className="session-gate__aurora" aria-hidden="true" />
      <div className="session-gate__grid" aria-hidden="true" />

      <div className="session-gate__orb session-gate__orb--0" aria-hidden="true" />
      <div className="session-gate__orb session-gate__orb--1" aria-hidden="true" />
      <div className="session-gate__orb session-gate__orb--2" aria-hidden="true" />

      <motion.div
        className="session-gate__card"
        initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="session-gate__brand">
          <span className="session-gate__logo" aria-hidden="true">
            <Sparkles size={22} strokeWidth={1.75} />
          </span>
          <span className="session-gate__title">Home4U</span>
        </div>

        <div className="session-gate__shimmer" aria-hidden="true">
          <div className="session-gate__shimmer-bar" />
        </div>

        <p className="session-gate__kicker">Studio session</p>
        <h1 className="session-gate__headline">Preparing your space</h1>
        <p className="session-gate__sub">
          Restoring your canvas, syncing preferences, and warming the design engine.
        </p>

        <div className="session-gate__footer">
          <Loader2 className="session-gate__spin" size={18} aria-hidden="true" />
          <span>Authenticating…</span>
        </div>
      </motion.div>
    </div>
  );
}
