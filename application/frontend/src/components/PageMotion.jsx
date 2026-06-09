import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAmbience } from '../context/AmbienceContext';

const pageVariants = {
  initial: { opacity: 0, y: 28, scale: 0.985, filter: 'blur(10px)' },
  in: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  out: { opacity: 0, y: -18, scale: 0.99, filter: 'blur(6px)' },
};

const pageTransition = {
  type: 'spring',
  stiffness: 118,
  damping: 24,
  mass: 0.72,
};

const PageMotion = ({ children, className = '' }) => {
  const location = useLocation();
  const { playWhoosh } = useAmbience();

  useEffect(() => {
    playWhoosh();
  }, [location.pathname, playWhoosh]);

  return (
    <motion.div
      key={location.pathname}
      className={`page-motion ${className}`.trim()}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
};

export default PageMotion;
