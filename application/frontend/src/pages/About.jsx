import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Home, DollarSign, Palette, Lightbulb, CheckSquare, Smartphone, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './About.css';

const About = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = Boolean(token);
  const [isLoaded, setIsLoaded] = useState(false);
  const [animatedCounters, setAnimatedCounters] = useState({});
  const [openFaq, setOpenFaq] = useState(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [formNotice, setFormNotice] = useState('');
  const [newsletterNotice, setNewsletterNotice] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  
  const bgShapesRef = useRef(null);
  const memberModalRef = useRef(null);
  const memberModalCloseRef = useRef(null);
  const previousFocusedRef = useRef(null);
  const counterIntervalRef = useRef(null);
  const contactSubmitTimeoutRef = useRef(null);
  const contactNoticeTimeoutRef = useRef(null);
  const newsletterNoticeTimeoutRef = useRef(null);

  const closeMemberModal = () => setSelectedMember(null);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const prevScene = document.body.dataset.scene;
    document.body.dataset.scene = 'about';

    setIsLoaded(true);
    const clearCounterInterval = () => {
      if (counterIntervalRef.current === null) return;
      window.clearInterval(counterIntervalRef.current);
      counterIntervalRef.current = null;
    };

    const animateCounters = () => {
      const targets = { users: 1000, projects: 500, styles: 50 };
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;

      let step = 0;
      clearCounterInterval();
      counterIntervalRef.current = window.setInterval(() => {
        step++;
        const progress = step / steps;
        const eased = 1 - Math.pow(1 - progress, 3);

        setAnimatedCounters({
          users: Math.floor(targets.users * eased),
          projects: Math.floor(targets.projects * eased),
          styles: Math.floor(targets.styles * eased)
        });

        if (step >= steps) clearCounterInterval();
      }, interval);
    };

    animateCounters();
    
    return () => {
      clearCounterInterval();
      if (contactSubmitTimeoutRef.current !== null) {
        window.clearTimeout(contactSubmitTimeoutRef.current);
        contactSubmitTimeoutRef.current = null;
      }
      if (contactNoticeTimeoutRef.current !== null) {
        window.clearTimeout(contactNoticeTimeoutRef.current);
        contactNoticeTimeoutRef.current = null;
      }
      if (newsletterNoticeTimeoutRef.current !== null) {
        window.clearTimeout(newsletterNoticeTimeoutRef.current);
        newsletterNoticeTimeoutRef.current = null;
      }
      if (document.body.dataset.scene === 'about') {
        if (prevScene) document.body.dataset.scene = prevScene;
        else delete document.body.dataset.scene;
      }
    };
  }, []);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (contactSubmitTimeoutRef.current !== null) {
      window.clearTimeout(contactSubmitTimeoutRef.current);
      contactSubmitTimeoutRef.current = null;
    }
    if (contactNoticeTimeoutRef.current !== null) {
      window.clearTimeout(contactNoticeTimeoutRef.current);
      contactNoticeTimeoutRef.current = null;
    }
    setFormStatus('sending');
    contactSubmitTimeoutRef.current = window.setTimeout(() => {
      contactSubmitTimeoutRef.current = null;
      setFormStatus('success');
      setContactForm({ name: '', email: '', message: '' });
      setFormNotice('Contact form submissions are unavailable in this preview environment.');
      contactNoticeTimeoutRef.current = window.setTimeout(() => {
        contactNoticeTimeoutRef.current = null;
        setFormNotice('');
      }, 3500);
    }, 1000);
  };

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterNoticeTimeoutRef.current !== null) {
      window.clearTimeout(newsletterNoticeTimeoutRef.current);
      newsletterNoticeTimeoutRef.current = null;
    }
    setNewsletterNotice(`Newsletter signup for ${newsletterEmail} is unavailable in this preview environment.`);
    newsletterNoticeTimeoutRef.current = window.setTimeout(() => {
      newsletterNoticeTimeoutRef.current = null;
      setNewsletterNotice('');
    }, 3500);
    setNewsletterEmail('');
  };

  const features = [
    { icon: <Home size={28} />, title: 'Room Planning', desc: 'Launch room-specific projects with clear scope, milestones, and design context.' },
    { icon: <DollarSign size={28} />, title: 'Budget Oversight', desc: 'Track approved budgets, estimated costs, and remaining room allocations in one place.' },
    { icon: <Palette size={28} />, title: 'Style Library', desc: 'Compare interior directions, materials, and signatures before committing to a concept.' },
    { icon: <Lightbulb size={28} />, title: 'AI Recommendations', desc: 'Generate design suggestions shaped by room type, style direction, and project priorities.' },
    { icon: <CheckSquare size={28} />, title: 'Project Tracking', desc: 'Move recommendations into action with task planning and completion history.' },
    { icon: <Smartphone size={28} />, title: 'Cross-device Access', desc: 'Review projects, room previews, and design updates from any modern device.' }
  ];

  const steps = [
    { number: '01', title: 'Create Project', desc: 'Define the room, scope, and project context.' },
    { number: '02', title: 'Set Budget', desc: 'Establish the spending range and financial guardrails.' },
    { number: '03', title: 'Choose Style', desc: 'Review direction, materials, and preferred mood.' },
    { number: '04', title: 'Generate Plan', desc: 'Receive AI-assisted recommendations and next steps.' }
  ];

  const teamMembers = [
    { 
      name: 'Project Lead',
      role: 'System Architecture',
      emoji: 'PL',
      color: 'var(--color-camel-400)',
      bio: 'Led technical planning, architecture decisions, and delivery coordination for the Home4U product.',
      skills: ['System Design', 'React', 'Cloud Architecture'],
      linkedin: '',
      github: ''
    },
    { 
      name: 'Backend Engineer',
      role: 'API and AI Integration',
      emoji: 'BE',
      color: 'var(--color-primary-slate)',
      bio: 'Built reliable FastAPI services, authentication flows, upload handling, and optional AI-assisted room analysis.',
      skills: ['Python', 'FastAPI', 'Machine Learning', 'Database Design'],
      linkedin: '',
      github: ''
    },
    { 
      name: 'Frontend Engineer',
      role: 'Interface Development',
      emoji: 'FE',
      color: 'var(--color-action-emerald)',
      bio: 'Created responsive React screens, interaction states, accessibility checks, and visual polish across the app.',
      skills: ['React', 'CSS/SASS', 'UI/UX Design', 'Animation'],
      linkedin: '',
      github: ''
    },
    { 
      name: 'Data Engineer',
      role: 'Scoring Engine',
      emoji: 'DE',
      color: 'var(--color-chocolate-700)',
      bio: 'Designed the structured style-tag data model and resemblance scoring workflow behind recommendation quality.',
      skills: ['Data Science', 'Python', 'Algorithms', 'Analytics'],
      linkedin: '',
      github: ''
    },
    { 
      name: 'Database Engineer',
      role: 'Persistence and Migrations',
      emoji: 'DA', 
      color: 'var(--color-text-300)',
      bio: 'Designed database persistence, migrations, and query paths that keep project plans and analysis history reliable.',
      skills: ['SQLAlchemy', 'PostgreSQL', 'Alembic', 'Database Design', 'Python'],
      linkedin: '',
      github: ''
    }
  ];

  const testimonials = [
    { quote: "Home4U transformed my living room! The budget tracking feature saved me thousands.", author: "Sarah M.", role: "Homeowner" },
    { quote: "Finally, an app that makes interior design accessible. Love the style recommendations!", author: "James K.", role: "First-time Buyer" },
    { quote: "The resemblance scoring is incredible. My home now matches my vision perfectly.", author: "Emily R.", role: "Design Enthusiast" }
  ];

  const faqs = [
    { question: "Is Home4U free to use?", answer: "Home4U includes a free tier with core features, with expanded capabilities planned." },
    { question: "How does the AI recommendation work?", answer: "Our AI analyzes your room type, budget, and style preferences to suggest products that match your vision." },
    { question: "Can I use Home4U on multiple devices?", answer: "Yes. Your projects sync across devices through your account." },
    { question: "How accurate is the style matching?", answer: "Our resemblance scoring algorithm provides 85%+ accuracy based on user feedback and testing." }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.16 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration: 0.58, ease: [0.16, 1, 0.3, 1] }
    }
  };

  useEffect(() => {
    if (!selectedMember) return;

    previousFocusedRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const focusFirstInDialog = () => {
      const root = memberModalRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll(focusableSelector);
      const firstFocusable = focusables[0] || memberModalCloseRef.current || root;
      if (firstFocusable?.focus) firstFocusable.focus();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMemberModal();
        return;
      }
      if (event.key !== 'Tab') return;

      const root = memberModalRef.current;
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
    window.requestAnimationFrame(focusFirstInDialog);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow || '';
      const previous = previousFocusedRef.current;
      if (previous?.focus) previous.focus();
    };
  }, [selectedMember]);

  return (
    <div className={`about-page ${isLoaded ? 'loaded' : ''}`}>
      <div className="bg-shapes" ref={bgShapesRef}>
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      {isAuthenticated ? (
        <Navbar />
      ) : (
        <header className="about-header">
          <div className="header-content">
            <button type="button" className="logo" onClick={() => navigate('/')} aria-label="Go to landing page">
              <Home size={16} aria-hidden="true" /> Home4U
            </button>
            <nav className="header-nav" aria-label="Guest navigation">
              <button type="button" onClick={() => navigate('/login')} className="nav-link">Sign In</button>
              <button type="button" onClick={() => navigate('/register')} className="nav-link">Sign Up</button>
            </nav>
          </div>
        </header>
      )}

      <motion.section 
        className="hero-section"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="hero-content">
          <motion.span variants={itemVariants} className="hero-badge">Platform Overview</motion.span>
          <motion.h2 variants={itemVariants} className="hero-title">
            Plan interior projects <span>with clarity and control.</span>
          </motion.h2>
          <motion.p variants={itemVariants} className="hero-description">
            Home4U helps homeowners and design teams organize room plans, compare style directions, track budgets, and produce AI-assisted concept previews without losing operational clarity.
          </motion.p>
          <motion.div variants={itemVariants} className="hero-buttons">
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="primary-btn"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Create Account'} <ArrowRight size={18} />
            </button>
            <button type="button" onClick={() => scrollToSection('features')} className="secondary-btn">Review Capabilities</button>
          </motion.div>
          <motion.div variants={itemVariants} className="hero-stats">
            <div className="hero-stat"><span className="stat-number">6+</span><span className="stat-text">Room workflows</span></div>
            <div className="hero-stat"><span className="stat-number">5+</span><span className="stat-text">Design styles</span></div>
            <div className="hero-stat"><span className="stat-number">24/7</span><span className="stat-text">Project access</span></div>
          </motion.div>
        </div>
        
        <motion.div 
          className="hero-visual"
          variants={{
            hidden: { opacity: 0, scale: 0.9, x: 50 },
            visible: { opacity: 1, scale: 1, x: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } }
          }}
        >
          <div className="hero-card" data-parallax-card>
            <div className="card-glow"></div>
            <div className="card-content">
              <div className="card-icon">SC</div>
              <div className="card-text">Scandinavian Concept</div>
              <div className="card-progress"><div className="progress-fill"></div></div>
              <div className="card-meta">
                <span>Allocated: $12,400</span>
                <span>Direction: Nordic</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      <motion.section 
        className="app-preview-section"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
      >
        <div className="section-header">
          <h3>Platform</h3>
          <h2>Operational Workspace</h2>
          <p className="section-subtitle">A connected workflow for planning, style review, and AI-assisted concept generation.</p>
        </div>
        
        <div className="app-preview-wrapper">
          <div className="app-preview">
            <div className="preview-header">
              <div className="preview-url-bar">
                <span className="url-dot"></span>
                <span className="url-dot"></span>
                <span className="url-dot"></span>
                <span className="url-bar">home4u.app/dashboard</span>
              </div>
            </div>
            
            <div className="preview-body">
              <div className="preview-sidebar">
                <div className="preview-logo">Home4U</div>
                <nav className="preview-nav">
                  <div className="nav-item active">
                    <span className="nav-icon">DB</span>
                    <span>Dashboard</span>
                  </div>
                  <div className="nav-item">
                    <span className="nav-icon">PR</span>
                    <span>Projects</span>
                  </div>
                  <div className="nav-item">
                    <span className="nav-icon">WS</span>
                    <span>Workspace</span>
                  </div>
                  <div className="nav-item">
                    <span className="nav-icon">AI</span>
                    <span>Recommendations</span>
                  </div>
                </nav>
              </div>
              
              <div className="preview-main">
                <div className="preview-header-bar">
                  <h3>Operations Dashboard</h3>
                  <div className="preview-user">User: John D.</div>
                </div>
                
                <div className="preview-cards">
                  <div className="preview-card">
                    <span className="card-emoji">BR</span>
                    <span className="card-name">Bedroom</span>
                    <span className="card-budget">$3,500</span>
                    <div className="card-progress-bar"><div className="progress" style={{width: '65%'}}></div></div>
                  </div>
                  <div className="preview-card">
                    <span className="card-emoji">LR</span>
                    <span className="card-name">Living Room</span>
                    <span className="card-budget">$5,000</span>
                    <div className="card-progress-bar"><div className="progress" style={{width: '40%'}}></div></div>
                  </div>
                  <div className="preview-card">
                    <span className="card-emoji">KT</span>
                    <span className="card-name">Kitchen</span>
                    <span className="card-budget">$8,000</span>
                    <div className="card-progress-bar"><div className="progress" style={{width: '80%'}}></div></div>
                  </div>
                </div>
                
                <div className="preview-recommendations">
                  <h4>Recommended Actions</h4>
                  <div className="rec-items">
                    <div className="rec-item">
                      <span className="rec-img">CH</span>
                      <span className="rec-name">Vitra Chair</span>
                      <span className="rec-price">$1,299</span>
                    </div>
                    <div className="rec-item">
                      <span className="rec-img">LP</span>
                      <span className="rec-name">Arco Lamp</span>
                      <span className="rec-price">$2,149</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section 
        id="features" 
        className="features-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="section-header">
          <h3>Capabilities</h3>
          <h2>Core Platform</h2>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="feature-card"
            >
              <div className="feature-icon-wrapper">
                <span className="feature-icon">{feature.icon}</span>
              </div>
              <h4>{feature.title}</h4>
              <p>{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section 
        className="testimonials-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="section-header">
          <h3>Feedback</h3>
          <h2>User Perspectives</h2>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="testimonial-card"
            >
              <div className="testimonial-quote">"{testimonial.quote}"</div>
              <div className="testimonial-author">
                <div className="author-avatar">{testimonial.author[0]}</div>
                <div>
                  <div className="author-name">{testimonial.author}</div>
                  <div className="author-role">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <section className="counter-section">
        <div className="counter-grid">
          <div className="counter-item scroll-animate">
            <span className="counter-number">{animatedCounters.users || 0}+</span>
            <span className="counter-label">Active Users</span>
          </div>
          <div className="counter-item scroll-animate" style={{ transitionDelay: '0.15s' }}>
            <span className="counter-number">{animatedCounters.projects || 0}+</span>
            <span className="counter-label">Projects Planned</span>
          </div>
          <div className="counter-item scroll-animate" style={{ transitionDelay: '0.3s' }}>
            <span className="counter-number">{animatedCounters.styles || 0}+</span>
            <span className="counter-label">Style Directions</span>
          </div>
        </div>
      </section>

      <motion.section 
        className="team-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="section-header">
          <h3>Team</h3>
          <h2>Built by Home4U</h2>
        </div>
        <div className="team-grid">
          {teamMembers.map((member, index) => (
            <motion.button
              type="button"
              whileHover={{ y: -4 }}
              variants={itemVariants}
              key={index} 
              className="team-card"
              style={{ '--member-color': member.color }}
              onClick={() => setSelectedMember(member)}
              aria-haspopup="dialog"
            >
              <div className="team-avatar">{member.emoji}</div>
              <h4>{member.name}</h4>
              <span className="team-role">{member.role}</span>
              <span className="team-cta">View Role</span>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Team Member Modal */}
      {selectedMember && (
        <div className="member-modal-overlay" role="presentation" onClick={closeMemberModal}>
          <div
            ref={memberModalRef}
            className="member-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-modal-title"
            aria-describedby="member-modal-description"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" ref={memberModalCloseRef} className="modal-close" onClick={closeMemberModal} aria-label="Close profile dialog">×</button>
            <div className="modal-header">
              <div className="modal-avatar" style={{ background: selectedMember.color }}>
                {selectedMember.emoji}
              </div>
              <h2 id="member-modal-title">{selectedMember.name}</h2>
              <p className="modal-role">{selectedMember.role}</p>
            </div>
            <div className="modal-body">
              <p className="modal-bio" id="member-modal-description">{selectedMember.bio}</p>
              <div className="modal-skills">
                <h4>Skills</h4>
                <div className="skills-list">
                  {selectedMember.skills.map((skill, i) => (
                    <span key={i} className="skill-tag">{skill}</span>
                  ))}
                </div>
              </div>
              {(selectedMember.linkedin || selectedMember.github) && (
                <div className="modal-links">
                  {selectedMember.linkedin && (
                    <a href={selectedMember.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                      LinkedIn
                    </a>
                  )}
                  {selectedMember.github && (
                    <a href={selectedMember.github} target="_blank" rel="noopener noreferrer" className="social-link github">
                      GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <motion.section 
        className="company-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        <div className="company-content">
          <motion.div variants={containerVariants} initial="hidden" whileInView="visible" className="company-text">
            <motion.h3 variants={itemVariants}>Company</motion.h3>
            <motion.h2 variants={itemVariants}>Why Home4U</motion.h2>
            <motion.p variants={itemVariants}>Home4U was created to make interior planning easier to understand, easier to compare, and easier to execute for real households and design-led teams.</motion.p>
            <div className="company-values">
              <motion.div variants={itemVariants} className="value-item">
                <span className="value-icon">01</span>
                <div><h4>Our Mission</h4><p>Make confident room planning accessible without sacrificing design quality.</p></div>
              </motion.div>
              <motion.div variants={itemVariants} className="value-item">
                <span className="value-icon">02</span>
                <div><h4>Principles</h4><p>Clarity, measurable decisions, and a workflow users can trust.</p></div>
              </motion.div>
            </div>
          </motion.div>
          <motion.div 
            className="company-visual"
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="company-badge">
              <span className="badge-year">2026</span>
              <span className="badge-text">Est. SF Studio</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      <motion.section 
        className="how-it-works-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="section-header">
          <h3>Workflow</h3>
          <h2>How the platform works</h2>
        </div>
        <div className="steps-container">
          {steps.map((step, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className="step-card"
            >
              <span className="step-number">{step.number}</span>
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section 
        className="faq-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <div className="section-header">
          <h3>FAQ</h3>
          <h2>Frequently Asked Questions</h2>
        </div>
        <div className="faq-grid">
          {faqs.map((faq, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              className={`faq-item ${openFaq === index ? 'open' : ''}`}
            >
              <button
                type="button"
                className="faq-question"
                aria-expanded={openFaq === index}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <span>{faq.question}</span>
                <span className="faq-toggle">{openFaq === index ? '−' : '+'}</span>
              </button>
              <AnimatePresence>
                {openFaq === index && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="faq-answer"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <section className="contact-section">
        <div className="section-header">
          <h3>Contact</h3>
          <h2>Talk to the team</h2>
        </div>
        <form className="contact-form" onSubmit={handleContactSubmit}>
          {formNotice && <div className="form-notice">{formNotice}</div>}
          <div className="form-row">
            <label className="sr-only" htmlFor="contact-name">Full name</label>
            <input 
              id="contact-name"
              type="text" 
              placeholder="Full name"
              value={contactForm.name}
              onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
              required 
            />
            <label className="sr-only" htmlFor="contact-email">Email address</label>
            <input 
              id="contact-email"
              type="email" 
              placeholder="Email address"
              value={contactForm.email}
              onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
              required 
            />
          </div>
          <label className="sr-only" htmlFor="contact-message">Project summary</label>
          <textarea 
            id="contact-message"
            placeholder="Project summary"
            value={contactForm.message}
            onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
            required
          ></textarea>
          <button type="submit" className="submit-btn" disabled={formStatus === 'sending'}>
            {formStatus === 'sending' ? 'Sending...' : formStatus === 'success' ? 'Message sent' : 'Send Inquiry'}
          </button>
        </form>
      </section>

      <section className="newsletter-section">
        <div className="newsletter-content">
          <h2>Product Updates</h2>
          <p>Receive release notes, design updates, and platform news.</p>
          <form className="newsletter-form" onSubmit={handleNewsletterSubmit}>
            <label className="sr-only" htmlFor="newsletter-email">Email Address</label>
            <input 
              id="newsletter-email"
              type="email" 
              placeholder="Enter your email" 
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              required 
            />
            <button type="submit">Subscribe</button>
          </form>
          {newsletterNotice && <div className="form-notice">{newsletterNotice}</div>}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>{isAuthenticated ? 'Ready to review your next room?' : 'Ready to start your first room review?'}</h2>
          <p>{isAuthenticated ? 'Open the workspace and start a new concept preview.' : 'Create an account or sign in to launch the workspace and start a concept preview.'}</p>
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
            className="cta-btn"
          >
            {isAuthenticated ? 'Open Dashboard' : 'Create Account'}
          </button>
        </div>
      </section>

      <footer className="about-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Home4U</h3>
            <p>Interior planning workspace for modern renovation teams and homeowners.</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Navigation</h4>
              {isAuthenticated ? (
                <button type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
              ) : (
                <button type="button" onClick={() => navigate('/register')}>Sign Up</button>
              )}
              {isAuthenticated ? (
                <button type="button" onClick={handleLogout}>Logout</button>
              ) : (
                <button type="button" onClick={() => navigate('/login')}>Login</button>
              )}
            </div>
            <div className="footer-column">
              <h4>About</h4>
              <p>Version 1.0.0</p>
              <p>Built by the Home4U team</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Home4U. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
