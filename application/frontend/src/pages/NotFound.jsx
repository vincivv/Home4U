import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Home, Compass } from 'lucide-react';
import './NotFound.css';

/* ------------------------------------------------------------------ */
/*  Animated geometric shapes for the background                      */
/* ------------------------------------------------------------------ */
const FloatingShape = ({ delay, size, x, y, rotate, duration }) => (
  <motion.div
    className="nf-shape"
    style={{ width: size, height: size, left: x, top: y }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{
      opacity: [0, 0.15, 0.08],
      scale: [0, 1, 0.95],
      rotate: [0, rotate, rotate + 15],
      y: [0, -20, 0],
    }}
    transition={{
      duration: duration || 8,
      delay,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    }}
  />
);

/* ------------------------------------------------------------------ */
/*  Stagger container for child animations                            */
/* ------------------------------------------------------------------ */
const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 40, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

const heroFade = {
  hidden: { opacity: 0, scale: 0.8, y: 30 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 1.2, ease: [0.22, 1, 0.36, 1] },
  },
};

const slideIn = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ------------------------------------------------------------------ */
/*  Glitch text effect — the "404" number cycles subtly               */
/* ------------------------------------------------------------------ */
const GlitchText = ({ text }) => {
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 200);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className={`nf-glitch ${glitch ? 'active' : ''}`} data-text={text}>
      {text}
    </span>
  );
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
const NotFound = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.body.dataset.scene;
    document.body.dataset.scene = 'notfound';
    return () => {
      if (document.body.dataset.scene === 'notfound') {
        if (prev) document.body.dataset.scene = prev;
        else delete document.body.dataset.scene;
      }
    };
  }, []);

  return (
    <div className="nf-page">
      {/* Animated geometric background */}
      <div className="nf-shapes-layer" aria-hidden="true">
        <FloatingShape delay={0} size={320} x="5%" y="10%" rotate={45} duration={12} />
        <FloatingShape delay={1.5} size={200} x="70%" y="15%" rotate={-30} duration={10} />
        <FloatingShape delay={0.8} size={160} x="80%" y="65%" rotate={60} duration={14} />
        <FloatingShape delay={2} size={240} x="15%" y="70%" rotate={-45} duration={11} />
        <FloatingShape delay={0.5} size={100} x="50%" y="50%" rotate={90} duration={9} />
      </div>

      {/* Grain overlay */}
      <div className="nf-grain" aria-hidden="true" />

      <motion.div
        className="nf-content"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {/* Editorial pre-title */}
        <motion.p className="nf-pretitle" variants={slideIn}>
          Lost in the blueprint
        </motion.p>

        {/* The "404" — editorial serif, massive */}
        <motion.h1 className="nf-hero-number" variants={heroFade}>
          <GlitchText text="404" />
        </motion.h1>

        {/* Sub-headline — sans-serif for contrast */}
        <motion.h2 className="nf-subtitle" variants={fadeUp}>
          This room doesn't exist<span className="nf-dot">.</span>
        </motion.h2>

        {/* Body copy — editorial voice */}
        <motion.p className="nf-body" variants={fadeUp}>
          The page you're looking for has been relocated, redesigned,
          or was never part of the floor plan. Let's get you back to a space that exists.
        </motion.p>

        {/* CTA buttons — high-end interactive */}
        <motion.div className="nf-actions" variants={fadeUp}>
          <motion.button
            type="button"
            className="nf-btn-primary"
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            data-magnetic-button
          >
            <Home size={18} />
            <span>Back to Dashboard</span>
          </motion.button>

          <motion.button
            type="button"
            className="nf-btn-ghost"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            data-magnetic-button
          >
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </motion.button>

          <motion.button
            type="button"
            className="nf-btn-ghost"
            onClick={() => navigate('/about')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            data-magnetic-button
          >
            <Compass size={18} />
            <span>About Home4U</span>
          </motion.button>
        </motion.div>

        {/* Decorative divider */}
        <motion.div className="nf-divider" variants={fadeUp}>
          <span className="nf-divider-line" />
          <span className="nf-divider-label">Home4U</span>
          <span className="nf-divider-line" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default NotFound;
