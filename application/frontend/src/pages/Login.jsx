import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Home, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import './Login.css';

const Login = ({ initialMode = 'login' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  /* ── Scene tinting ────────────────────────────────────────── */
  useEffect(() => {
    const prev = document.body.dataset.scene;
    document.body.dataset.scene = 'login';
    return () => {
      if (document.body.dataset.scene === 'login') {
        if (prev) document.body.dataset.scene = prev;
        else delete document.body.dataset.scene;
      }
    };
  }, []);

  useEffect(() => {
    setIsRegister(initialMode === 'register');
    setError('');
  }, [initialMode]);

  const handleAuthModeToggle = () => {
    const nextModeIsRegister = !isRegister;
    setIsRegister(nextModeIsRegister);
    setError('');
    navigate(nextModeIsRegister ? '/register' : '/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await authAPI.signup(email, password);
        const response = await authAPI.login(email, password);
        login(response.data.access_token);
      } else {
        const response = await authAPI.login(email, password);
        login(response.data.access_token);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Framer Motion variants ───────────────────────────────── */
  const panelVariants = {
    hidden:  { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
    exit:    { opacity: 0, x: -30, transition: { duration: 0.35 } },
  };

  const heroVariants = {
    hidden:  { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.14, delayChildren: 0.1 },
    },
  };

  const fadeUp = {
    hidden:  { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  };

  return (
    <div className="auth-split-layout">
      {/* ── LEFT: Cinematic hero (Marcelo) ─────────────────── */}
      <div className="auth-hero">
        {/* Brand logo */}
        <motion.div
          layoutId="global-brand-logo"
          className="auth-hero-content auth-logo"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <Home size={22} aria-hidden="true" />
          Home4U
        </motion.div>

        {/* Editorial headline */}
        <motion.div
          className="auth-hero-content auth-quote"
          variants={heroVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 variants={fadeUp}>
            {isRegister ? (
              <>Start your next<br /><em>room project.</em></>
            ) : (
              <>Interior planning,<br /><em>organized clearly.</em></>
            )}
          </motion.h2>
          <motion.p variants={fadeUp}>
            Home4U is a precision design platform — upload room photos,
            evaluate style directions, and generate AI-assisted plans.
          </motion.p>
        </motion.div>

        {/* Footer attribution mark */}
        <motion.div
          className="auth-hero-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="auth-hero-footer-line" />
          <span className="auth-hero-footer-text">Premium Architecture Platform · 2026</span>
        </motion.div>
      </div>

      {/* ── RIGHT: Form panel (Adrien) ──────────────────────── */}
      <div className="auth-form-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={isRegister ? 'register' : 'login'}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="auth-form-header">
              <h3>{isRegister ? 'Create your account' : 'Sign in to Home4U'}</h3>
              <p>
                {isRegister
                  ? 'Create an account to start planning your next room project.'
                  : 'Enter your credentials to return to your workspace.'}
              </p>
            </div>

            {error && (
              <motion.div
                className="error-message"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="modern-form">
              <label className="input-floating" htmlFor="email">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete="email"
                />
                <span className="input-floating-label">Email Address</span>
              </label>

              <label className="input-floating" htmlFor="password">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <span className="input-floating-label">Password</span>
              </label>

              <button
                type="submit"
                className="btn-cinematic"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 size={16} className="spin" aria-hidden="true" /> Authenticating…</>
                ) : (
                  <>{isRegister ? 'Create Account' : 'Sign In'} <ArrowRight size={16} aria-hidden="true" /></>
                )}
              </button>
            </form>

            <div className="auth-switch">
              {isRegister ? 'Already have an account?' : 'Need an account?'}
              <button onClick={handleAuthModeToggle} type="button">
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </div>

            <div className="auth-exploration">
              <button onClick={() => navigate('/')} type="button">
                <Sparkles size={12} aria-hidden="true" />
                View Platform Overview
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
