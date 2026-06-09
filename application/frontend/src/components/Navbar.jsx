import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Compass, Brush, LogOut, Menu, X, ChevronDown, Home } from 'lucide-react';
import './Navbar.css';

const MotionNavLink = motion(NavLink);
const easeDisplay = [0.16, 1, 0.3, 1];

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const previousMobileFocusRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Workspace', path: '/workspace', icon: Brush },
    { name: 'About', path: '/about', icon: Compass },
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: -14, filter: 'blur(10px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: {
        staggerChildren: 0.07,
        delayChildren: 0.12
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -8, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.48, ease: easeDisplay }
    }
  };

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    previousMobileFocusRef.current = document.activeElement;
    const toggleEl = mobileToggleRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const focusFirst = () => {
      const root = mobileMenuRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll(focusableSelector);
      const first = focusables[0] || root;
      if (first?.focus) first.focus();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobileMenu();
        return;
      }
      if (event.key !== 'Tab') return;

      const root = mobileMenuRef.current;
      if (!root) return;
      const focusables = Array.from(root.querySelectorAll(focusableSelector)).filter(
        (el) => !el.hasAttribute('disabled')
      );
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(focusFirst);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow || '';
      if (toggleEl?.focus) {
        toggleEl.focus();
      } else if (previousMobileFocusRef.current?.focus) {
        previousMobileFocusRef.current.focus();
      }
    };
  }, [isMobileMenuOpen]);

  return (
    <motion.nav 
      className={`navbar glassmorphism-elevated ${isScrolled ? 'shrunk' : ''}`}
      initial={{ opacity: 0, y: -28, filter: 'blur(12px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.72, ease: easeDisplay }}
    >
      <div className="navbar-container">
        {/* Brand */}
        <NavLink to="/dashboard" className="navbar-brand" aria-label="Home4U Dashboard">
          <motion.div 
            layoutId="global-brand-logo" 
            className="brand-stack"
            whileHover={{ y: -1 }}
            transition={{ duration: 0.24, ease: easeDisplay }}
          >
            <div className="brand-glow" />
            <div className="brand-icon" aria-hidden="true"><Home size={16} strokeWidth={2.3} /></div>
            <motion.span 
              className="brand-text" 
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.16, duration: 0.42, ease: easeDisplay }}
            >
              Home4U
            </motion.span>
          </motion.div>
        </NavLink>

        {/* Desktop Navigation */}
        <AnimatePresence mode="wait">
          <motion.ul 
            key="desktop-nav"
            className="navbar-desktop navbar-desktop-nav"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.li key={item.path} variants={itemVariants}>
                  <MotionNavLink 
                    to={item.path} 
                    className={({ isActive }) => 
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 0 }}
                    transition={{ duration: 0.24, ease: easeDisplay }}
                  >
                    <motion.div className="nav-icon-container">
                      <Icon size={20} />
                    </motion.div>
                    <span className="nav-text">{item.name}</span>
                    <motion.div className="nav-glow" />
                  </MotionNavLink>
                </motion.li>
              );
            })}
            <motion.li 
              className="nav-divider"
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              transition={{ delay: 0.4 }}
            />
            {/* User Menu */}
            <motion.li variants={itemVariants} className="user-menu-container">
              <motion.button
                type="button"
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                whileTap={{ y: 0 }}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.24, ease: easeDisplay }}
              >
                <div className="user-avatar" aria-hidden="true">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="user-name">{user?.full_name?.split(' ')[0] || 'Designer'}</span>
                <ChevronDown size={16} className={`chevron ${userMenuOpen ? 'rotate-180' : ''}`} />
              </motion.button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.ul 
                    className="user-menu-dropdown"
                    initial={{ opacity: 0, y: -8, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
                    transition={{ duration: 0.26, ease: easeDisplay }}
                  >
                    <motion.li>
                      <button type="button" className="user-menu-item logout" onClick={handleLogout}>
                        <LogOut size={18} />
                        <span>Logout</span>
                      </button>
                    </motion.li>
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.li>
          </motion.ul>
        </AnimatePresence>

        {/* Mobile Toggle */}
        <motion.button 
          type="button"
          ref={mobileToggleRef}
          className="mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          whileTap={{ y: 0 }}
          whileHover={{ y: -1 }}
          transition={{ duration: 0.24, ease: easeDisplay }}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav-dialog"
          aria-haspopup="dialog"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </motion.button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            className="navbar-mobile-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileMenu}
            role="presentation"
          >
            <motion.div 
              ref={mobileMenuRef}
              id="mobile-nav-dialog"
              className="navbar-mobile glassmorphism-elevated"
              initial={{ opacity: 0, x: 36, filter: 'blur(12px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 32, filter: 'blur(10px)' }}
              transition={{ duration: 0.42, ease: easeDisplay }}
              role="dialog"
              aria-modal="true"
              aria-label="Primary navigation menu"
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
            >
              <ul className="mobile-nav-links">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <NavLink 
                        to={item.path} 
                        className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                        onClick={closeMobileMenu}
                      >
                        <Icon size={20} />
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  );
                })}
                <li className="mobile-divider" />
                <li>
                  <button type="button" className="mobile-nav-link logout" onClick={handleLogout}>
                    <LogOut size={20} />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;

