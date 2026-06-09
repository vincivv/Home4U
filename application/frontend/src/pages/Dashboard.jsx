import React, { useState, useEffect, useRef, useCallback, useId } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { DollarSign, FolderKanban, Home, Palette, SearchX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectsAPI, stylesAPI, searchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { serializeStyleContext, styleSlug } from '../utils/styleContext';
import './Dashboard.css';

// Cinematic transitions, but restrained enough for a product shell.
const marceloTransition = { duration: 0.85, ease: [0.16, 1, 0.3, 1] };
const marceloStagger = {
  animate: {
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.14
    }
  }
};
const marceloItem = {
  initial: { opacity: 0, y: 22, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: marceloTransition }
};

// Default styles with rich visuals
const defaultStyles = [
  { 
    id: 1, 
    name: 'Modern', 
    description: 'Clean lines, minimal clutter, and functional design with neutral colors',
    emoji: '🪟',
    gradient: 'linear-gradient(135deg, #24313a 0%, #53656e 100%)',
    palette: ['#172026', '#53656e', '#c8d0d5', '#ffffff'],
    materials: ['Glass', 'Polished concrete'],
    signature: 'Statement lighting + negative space',
    previewEmojis: ['🛋️', '📐', '💡', '🪟'],
    previewFeatures: ['Clean Lines', 'Neutral Palette', 'Statement Lighting', 'Open Spaces']
  },
  { 
    id: 2, 
    name: 'Traditional', 
    description: 'Classic elegance with rich colors, ornate details, and quality craftsmanship',
    emoji: '🕰️',
    gradient: 'linear-gradient(135deg, #5b4034 0%, #8c6a57 100%)',
    palette: ['#2b221d', '#8c6a57', '#d8c5b5', '#faf8f5'],
    materials: ['Mahogany', 'Velvet'],
    signature: 'Molding, symmetry, and heirloom pieces',
    previewEmojis: ['🕰️', '🪞', '🕯️', '🏺'],
    previewFeatures: ['Rich Fabrics', 'Antique Details', 'Crown Molding', 'Classic Furniture']
  },
  { 
    id: 3, 
    name: 'Scandinavian', 
    description: 'Cozy minimalism with natural materials, light colors, and hygge atmosphere',
    emoji: '🪵',
    gradient: 'linear-gradient(135deg, #8a958f 0%, #c7d0ca 100%)',
    palette: ['#334038', '#9aa69e', '#e7ece8', '#ffffff'],
    materials: ['Light oak', 'Linen'],
    signature: 'Warm neutrals + soft texture layers',
    previewEmojis: ['🌿', '🪵', '🧸', '🕯️'],
    previewFeatures: ['Natural Wood', 'Indoor Plants', 'Cozy Textiles', 'Warm Lighting']
  },
  { 
    id: 4, 
    name: 'Industrial', 
    description: 'Raw materials, exposed elements, and urban-inspired aesthetics',
    emoji: '⚙️',
    gradient: 'linear-gradient(135deg, #20252a 0%, #5e666d 100%)',
    palette: ['#16191c', '#565d63', '#a4abb1', '#f5f5f3'],
    materials: ['Steel', 'Brick'],
    signature: 'Raw texture + high contrast lighting',
    previewEmojis: ['⚙️', '🧱', '💡', '🪜'],
    previewFeatures: ['Exposed Brick', 'Metal Accents', 'Edison Bulbs', 'Open Ductwork']
  },
  { 
    id: 5, 
    name: 'Bohemian', 
    description: 'Eclectic, colorful, and free-spirited with layered textures and patterns',
    emoji: '🧶',
    gradient: 'linear-gradient(135deg, #7a5c44 0%, #b6946d 100%)',
    palette: ['#2b2118', '#a1784f', '#d7bc93', '#faf5ef'],
    materials: ['Rattan', 'Woven textiles'],
    signature: 'Layered patterns + collected decor',
    previewEmojis: ['🌺', '💐', '🎭', '🪭'],
    previewFeatures: ['Layered Rugs', 'Vintage Finds', 'Art Displays', 'Pattern Mix']
  },
  { 
    id: 6, 
    name: 'Mid-Century', 
    description: 'Retro sophistication with bold colors, organic shapes, and timeless appeal',
    emoji: '🛋️',
    gradient: 'linear-gradient(135deg, #5a6a55 0%, #a58b67 100%)',
    palette: ['#20241e', '#6f7b66', '#a58b67', '#f6f1eb'],
    materials: ['Teak', 'Leather'],
    signature: 'Tapered legs + warm wood tones',
    previewEmojis: ['🪑', '📺', '🪵', '🌵'],
    previewFeatures: ['Tapered Legs', 'Bold Colors', 'Organic Curves', 'Retro Appliances']
  },
  { 
    id: 7, 
    name: 'Mediterranean', 
    description: 'Warm, inviting spaces with terracotta, wrought iron, and rustic textures',
    emoji: '🍋',
    gradient: 'linear-gradient(135deg, #6f8379 0%, #d2b48c 100%)',
    palette: ['#25312b', '#71857a', '#c8a67a', '#faf6f0'],
    materials: ['Terracotta', 'Wrought iron'],
    signature: 'Arches, tiles, and sun-washed warmth',
    previewEmojis: ['🌞', '🍋', '🏺', '🪴'],
    previewFeatures: ['Terracotta', 'Arched Doorways', 'Wrought Iron', 'Clay Tiles']
  },
  { 
    id: 8, 
    name: 'Japanese', 
    description: 'Serene simplicity with natural materials, clean spaces, and zen harmony',
    emoji: '🎍',
    gradient: 'linear-gradient(135deg, #3b4640 0%, #b3aa98 100%)',
    palette: ['#1e221e', '#5c655d', '#c6bcaa', '#faf9f6'],
    materials: ['Cedar', 'Rice paper'],
    signature: 'Low furniture + calm negative space',
    previewEmojis: ['🗿', '🎋', '🧘', '🍵'],
    previewFeatures: ['Shoji Screens', 'Floor Cushions', 'Zen Garden', 'Minimal Decor']
  }
];

const normalizeStyleName = (name) => (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const canonicalStyleKey = (name) => {
  const n = normalizeStyleName(name);
  if (!n) return '';
  if (n.includes('midcentury')) return 'midcentury';
  if (n.includes('scandinav')) return 'scandinavian';
  if (n.includes('mediterr')) return 'mediterranean';
  if (n.includes('industr')) return 'industrial';
  if (n.includes('bohem')) return 'bohemian';
  if (n.includes('minimal')) return 'minimalist';
  if (n.includes('farm')) return 'farmhouse';
  if (n.includes('japan') || n.includes('zen')) return 'japanese';
  if (n.includes('trad') || n.includes('classic')) return 'traditional';
  if (n.includes('modern')) return 'modern';
  return n;
};

// Style-specific fallback element sets (used when the API doesn't provide rich per-style details).
const styleElementSets = {
  modern: {
    previewEmojis: ['📐', '🪟', '💡', '⚪️'],
    previewFeatures: ['Clean Lines', 'Neutral Palette', 'Statement Lighting', 'Open Spaces'],
  },
  traditional: {
    previewEmojis: ['🕯️', '🏛️', '🪞', '🧵'],
    previewFeatures: ['Crown Molding', 'Classic Furniture', 'Rich Fabrics', 'Warm Woods'],
  },
  scandinavian: {
    previewEmojis: ['🪵', '🧸', '🕯️', '🌿'],
    previewFeatures: ['Light Wood', 'Cozy Textiles', 'Soft Lighting', 'Calm Neutrals'],
  },
  industrial: {
    previewEmojis: ['🧱', '🔩', '💡', '🪜'],
    previewFeatures: ['Exposed Brick', 'Metal Accents', 'Edison Bulbs', 'Open Ductwork'],
  },
  bohemian: {
    previewEmojis: ['🧶', '🎭', '🪭', '🌺'],
    previewFeatures: ['Layered Rugs', 'Pattern Mix', 'Vintage Finds', 'Art Displays'],
  },
  midcentury: {
    previewEmojis: ['🪑', '🪵', '🟧', '📺'],
    previewFeatures: ['Tapered Legs', 'Warm Woods', 'Bold Accents', 'Organic Curves'],
  },
  mediterranean: {
    previewEmojis: ['🏺', '🧱', '🌞', '🍋'],
    previewFeatures: ['Terracotta', 'Arched Doorways', 'Wrought Iron', 'Clay Tiles'],
  },
  japanese: {
    previewEmojis: ['🎋', '🍵', '🧘', '🪵'],
    previewFeatures: ['Shoji Screens', 'Low Furniture', 'Natural Materials', 'Zen Calm'],
  },
  minimalist: {
    previewEmojis: ['🗄️', '⚪️', '🪑', '🪟'],
    previewFeatures: ['Hidden Storage', 'Neutral Palette', 'Floating Furniture', 'Natural Light'],
  },
  farmhouse: {
    previewEmojis: ['🪵', '🚪', '🚰', '🔩'],
    previewFeatures: ['Reclaimed Wood', 'Barn Doors', 'Apron Sink', 'Vintage Metal'],
  },
};

const resolveStyleElements = (style) => {
  const key = canonicalStyleKey(style?.name);
  const fallback = styleElementSets[key] || {};

  const previewEmojisRaw = Array.isArray(style?.previewEmojis) && style.previewEmojis.length
    ? style.previewEmojis
    : fallback.previewEmojis;

  const previewFeaturesRaw =
    (Array.isArray(style?.previewFeatures) && style.previewFeatures.length ? style.previewFeatures : null) ||
    (Array.isArray(style?.features) && style.features.length ? style.features : null) ||
    fallback.previewFeatures;

  const previewEmojis = (previewEmojisRaw || ['📐', '🎨', '💡', '🧱']).slice(0, 4);
  const previewFeatures = (previewFeaturesRaw || ['Layout', 'Palette', 'Materials', 'Lighting']).slice(0, 4);

  return { key, previewEmojis, previewFeatures };
};

const resolveStyleMonogram = (style) => {
  const canonical = canonicalStyleKey(style?.name);
  const monograms = {
    modern: 'MO',
    traditional: 'TR',
    scandinavian: 'SC',
    industrial: 'IN',
    bohemian: 'BO',
    midcentury: 'MC',
    mediterranean: 'ME',
    japanese: 'JP',
    minimalist: 'MN',
    farmhouse: 'FH',
  };
  if (monograms[canonical]) return monograms[canonical];
  return String(style?.name || 'ST')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ST';
};

const mergeStylesWithDefaults = (incoming = []) => {
  const merged = new Map();
  defaultStyles.forEach((s) => merged.set(canonicalStyleKey(s.name), s));
  incoming.forEach((s) => {
    const key = canonicalStyleKey(s.name);
    const base = merged.get(key) || {};
    merged.set(key, { ...base, ...s });
  });
  return Array.from(merged.values());
};

const scoreSearchField = (query, value, weight) => {
  if (!value) return 0;

  const normalizedValue = String(value).toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);

  if (!normalizedValue || !tokens.length) return 0;
  if (normalizedValue === query) return weight * 2;
  if (normalizedValue.includes(query)) return weight;
  if (tokens.every((token) => normalizedValue.includes(token))) return weight * 0.85;
  if (tokens.some((token) => normalizedValue.includes(token))) return weight * 0.4;
  return 0;
};

const buildLocalStyleSearchResults = (styles, query, limit = 20) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return { results: [], total: 0 };
  }

  const matches = styles
    .map((style) => {
      const { previewFeatures } = resolveStyleElements(style);
      const tags = [
        ...(Array.isArray(style.materials) ? style.materials : []),
        ...(Array.isArray(previewFeatures) ? previewFeatures : []),
      ]
        .filter(Boolean)
        .map((item) => String(item));

      const score =
        scoreSearchField(normalizedQuery, style.name, 6) +
        scoreSearchField(normalizedQuery, style.description, 3) +
        scoreSearchField(normalizedQuery, style.signature, 2) +
        tags.reduce((sum, tag) => sum + scoreSearchField(normalizedQuery, tag, 2), 0);

      if (!score) return null;

      return {
        id: `local-${styleSlug(style.name) || normalizeStyleName(style.name) || style.id}`,
        type: 'style',
        title: style.name,
        snippet: style.description || style.signature || '',
        tags: Array.from(new Set(tags)).slice(0, 4),
        score: Number(score.toFixed(3)),
        rank: 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const results = matches.slice(0, limit).map((result, index) => ({
    ...result,
    rank: index + 1,
  }));

  return { results, total: matches.length };
};

const getSearchResultKey = (result) =>
  normalizeStyleName(result?.title) || `${result?.type || 'result'}-${result?.id}`;

const mergeSearchResults = (localResults, remoteResults, limit = 20) => {
  const merged = new Map();

  localResults.forEach((result) => {
    merged.set(getSearchResultKey(result), result);
  });

  remoteResults.forEach((result) => {
    const key = getSearchResultKey(result);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, result);
      return;
    }

    merged.set(key, {
      ...existing,
      ...result,
      tags: result.tags?.length ? result.tags : existing.tags,
      snippet: result.snippet || existing.snippet,
      score: Math.max(existing.score || 0, result.score || 0),
    });
  });

  return Array.from(merged.values())
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit)
    .map((result, index) => ({
      ...result,
      rank: index + 1,
    }));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatLoadError = (err) => {
  if (!err) return 'Could not load dashboard data.';

  const status = err.response?.status;
  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'Access denied for this resource.';
  if (status && status >= 500) return 'Server error while loading dashboard data.';
  if (status && status >= 400) return err.response?.data?.detail || 'Request failed while loading dashboard data.';
  if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (err.message?.toLowerCase().includes('network')) {
    return 'Network issue: unable to reach API. Check backend/proxy configuration.';
  }
  return 'Could not load dashboard data. Please refresh.';
};

const formatActionError = (err, fallback = 'Could not complete this dashboard action.') => {
  if (!err) return fallback;

  const status = err.response?.status;
  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'Access denied for this action.';
  if (status && status >= 500) return err.response?.data?.detail || 'Server error while saving dashboard changes.';
  if (status && status >= 400) return err.response?.data?.detail || fallback;
  if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (err.message?.toLowerCase().includes('network')) {
    return 'Network issue: unable to reach API. Check backend/proxy configuration.';
  }
  return fallback;
};

const formatSearchError = (err) => {
  if (!err) return 'Search failed.';

  const status = err.response?.status;
  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'Access denied for style search.';
  if (status && status >= 500) return err.response?.data?.detail || 'Search service unavailable.';
  if (status && status >= 400) return err.response?.data?.detail || 'Search failed.';
  if (err.code === 'ECONNABORTED') return 'Search timed out. Please try again.';
  if (err.message?.toLowerCase().includes('network')) return 'Search service unavailable.';
  return 'Search failed.';
};

const getProjectDisplayName = (project) => project?.name || project?.room_type || 'Project';

const withRetry = async (fn, retries = 2, delay = 350) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) await sleep(delay * (attempt + 1));
    }
  }
  throw lastError;
};

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [styles, setStyles] = useState([]);
  const [apiStyles, setApiStyles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshingData, setIsRefreshingData] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadNotice, setLoadNotice] = useState('');
  const [newProjectType, setNewProjectType] = useState('');
  const [newProjectStyle, setNewProjectStyle] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRevision, setSearchRevision] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMeta, setSearchMeta] = useState({ total: 0, page: 1, hasMore: false });
  const [searchError, setSearchError] = useState(null);
  const [searchNotice, setSearchNotice] = useState('');
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [renameProjectTarget, setRenameProjectTarget] = useState(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [savingRenameProjectId, setSavingRenameProjectId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [initStyle, setInitStyle] = useState(null);
  const [initLoading, setInitLoading] = useState(false);
  const [selectedStyleDrawer, setSelectedStyleDrawer] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerTriggerRef = useRef(null);
  const drawerFirstFocusRef = useRef(null);
  const projectsRef = useRef([]);
  const stylesRef = useRef([]);
  const [drawerStages, setDrawerStages] = useState({ preview: false, compat: false, dna: false });
  const [hoveredTrait, setHoveredTrait] = useState('');
  const [selectedTrait, setSelectedTrait] = useState('');
  const drawerTitleId = useId();
  const drawerDescriptionId = useId();
  const drawerHintId = useId();
  const activeTrait = hoveredTrait || selectedTrait;
  
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const parallaxRef = useRef(null);
  const heroInViewRef = useRef(true);
  const initPanelRef = useRef(null);
  const initLoadingTimeoutRef = useRef(null);
  const drawerFocusTimeoutRef = useRef(null);
  const drawerStageTimeoutsRef = useRef([]);

  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  useEffect(() => {
    stylesRef.current = styles;
  }, [styles]);

  const clearInitLoadingTimeout = useCallback(() => {
    if (initLoadingTimeoutRef.current === null) return;
    window.clearTimeout(initLoadingTimeoutRef.current);
    initLoadingTimeoutRef.current = null;
  }, []);

  const clearDrawerFocusTimeout = useCallback(() => {
    if (drawerFocusTimeoutRef.current === null) return;
    window.clearTimeout(drawerFocusTimeoutRef.current);
    drawerFocusTimeoutRef.current = null;
  }, []);

  const clearDrawerStageTimeouts = useCallback(() => {
    drawerStageTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    drawerStageTimeoutsRef.current = [];
  }, []);

  function navigateToWorkspace(style) {
    const selectedStyle = serializeStyleContext(style);
    const slug = selectedStyle?.slug || '';
    const query = slug ? `?style=${encodeURIComponent(slug)}` : '';

    navigate(`/workspace${query}`, selectedStyle ? { state: { selectedStyle } } : undefined);
  }

  function openDrawer(style, triggerEl) {
    setSelectedStyleDrawer(style);
    setIsDrawerOpen(true);
    drawerTriggerRef.current = triggerEl || document.activeElement;
    setDrawerStages({ preview: false, compat: false, dna: false });
    setHoveredTrait('');
    setSelectedTrait('');
    clearDrawerStageTimeouts();
    drawerStageTimeoutsRef.current = [
      window.setTimeout(() => setDrawerStages((s) => ({ ...s, preview: true })), 150),
      window.setTimeout(() => setDrawerStages((s) => ({ ...s, compat: true })), 350),
      window.setTimeout(() => setDrawerStages((s) => ({ ...s, dna: true })), 500),
    ];
  }

  const closeDrawer = useCallback(() => {
    clearDrawerStageTimeouts();
    clearDrawerFocusTimeout();
    setIsDrawerOpen(false);
    setSelectedStyleDrawer(null);
    setHoveredTrait('');
    setSelectedTrait('');
    if (drawerTriggerRef.current && drawerTriggerRef.current.focus) {
      drawerTriggerRef.current.focus();
    }
  }, [clearDrawerFocusTimeout, clearDrawerStageTimeouts]);

  function handleStyleSelect(style, triggerEl) {
    openDrawer(style, triggerEl);
  }

  function startAiFromDrawer() {
    if (!selectedStyleDrawer) return;
    const style = selectedStyleDrawer;
    closeDrawer();
    navigateToWorkspace(style);
  }

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- initial dashboard load should run once on mount.
  }, []);

  useEffect(() => () => {
    clearInitLoadingTimeout();
    clearDrawerFocusTimeout();
    clearDrawerStageTimeouts();
  }, [
    clearDrawerFocusTimeout,
    clearDrawerStageTimeouts,
    clearInitLoadingTimeout,
  ]);

  useEffect(() => {
    const prevScene = document.body.dataset.scene;
    document.body.dataset.scene = 'dashboard';
    return () => {
      if (document.body.dataset.scene === 'dashboard') {
        if (prevScene) document.body.dataset.scene = prevScene;
        else delete document.body.dataset.scene;
      }
    };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 900px) and (hover: hover) and (pointer: fine)');
    const apply = (on) => {
      document.documentElement.classList.toggle('dash-snap', on);
      document.body.classList.toggle('dash-snap', on);
    };
    const update = () => apply(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
      apply(false);
    };
  }, []);

  useEffect(() => {
    const root = parallaxRef.current;
    if (!root) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let rafId = 0;
    let pointer = { x: 0, y: 0, active: false };
    let rect = null;
    let needsMeasure = true;
    let io = null;
    const lastValues = { progress: '', mx: '', my: '' };

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const measure = () => {
      rect = root.getBoundingClientRect();
      needsMeasure = false;
      return rect;
    };

    const tick = () => {
      rafId = 0;
      if (!heroInViewRef.current) return;

      const nextRect = needsMeasure || !rect ? measure() : rect;
      if (!nextRect.height) return;

      // 0 -> 1 as the hero scrolls past the top of the viewport; used for fade + depth.
      const progress = clamp((-nextRect.top) / nextRect.height, 0, 1);

      let mx = 0;
      let my = 0;
      if (pointer.active && nextRect.width > 0 && nextRect.height > 0) {
        mx = clamp(((pointer.x - nextRect.left) / nextRect.width - 0.5) * 2, -1, 1);
        my = clamp(((pointer.y - nextRect.top) / nextRect.height - 0.5) * 2, -1, 1);
      }

      const nextProgress = progress.toFixed(4);
      const nextMx = mx.toFixed(4);
      const nextMy = my.toFixed(4);

      if (lastValues.progress !== nextProgress) {
        root.style.setProperty('--p-s', nextProgress);
        lastValues.progress = nextProgress;
      }
      if (lastValues.mx !== nextMx) {
        root.style.setProperty('--p-mx', nextMx);
        lastValues.mx = nextMx;
      }
      if (lastValues.my !== nextMy) {
        root.style.setProperty('--p-my', nextMy);
        lastValues.my = nextMy;
      }
    };

    const requestTick = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      needsMeasure = true;
      requestTick();
    };
    const onResize = () => {
      needsMeasure = true;
      requestTick();
    };

    const onPointerMove = (event) => {
      if (!heroInViewRef.current) return;
      pointer = { x: event.clientX, y: event.clientY, active: true };
      requestTick();
    };

    const onPointerLeave = () => {
      pointer = { x: 0, y: 0, active: false };
      requestTick();
    };

    // Initialize variables before first paint.
    root.style.setProperty('--p-s', '0');
    root.style.setProperty('--p-mx', '0');
    root.style.setProperty('--p-my', '0');
    lastValues.progress = '0';
    lastValues.mx = '0';
    lastValues.my = '0';
    requestTick();

    // Only update hero parallax while the hero is near the viewport.
    io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        heroInViewRef.current = !!entry?.isIntersecting;
        if (heroInViewRef.current) {
          needsMeasure = true;
          requestTick();
        }
      },
      { threshold: 0, rootMargin: '240px 0px 240px 0px' }
    );
    io.observe(root);

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    if (finePointer) {
      root.addEventListener('pointermove', onPointerMove, { passive: true });
      root.addEventListener('pointerleave', onPointerLeave, { passive: true });
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      if (finePointer) {
        root.removeEventListener('pointermove', onPointerMove);
        root.removeEventListener('pointerleave', onPointerLeave);
      }
      if (rafId) window.cancelAnimationFrame(rafId);
      if (io) io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!styles.length) return;
    const params = new URLSearchParams(location.search);
    const styleParam = params.get('style');
    clearInitLoadingTimeout();
    if (!styleParam) {
      setInitStyle(null);
      setInitLoading(false);
      return;
    }
    const param = styleParam.toLowerCase();
    const match = styles.find((s) => {
      const byName = (s.name || '').toLowerCase();
      return byName === param || styleSlug(s.name) === param;
    });
    if (match) {
      setInitLoading(true);
      setInitStyle(match);
      initLoadingTimeoutRef.current = window.setTimeout(() => {
        initLoadingTimeoutRef.current = null;
        setInitLoading(false);
      }, 800);
    } else {
      setInitStyle(null);
      setInitLoading(false);
    }
    return () => {
      clearInitLoadingTimeout();
    };
  }, [clearInitLoadingTimeout, location.search, styles]);

  useEffect(() => {
    if (initStyle && !initLoading && initPanelRef.current) {
      initPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initStyle, initLoading]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = prevOverflow || '';
    }
    return () => {
      document.body.style.overflow = prevOverflow || '';
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
      }
      if (e.key === 'Tab') {
        const drawer = document.querySelector('.style-drawer');
        if (!drawer) return;
        const focusables = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    clearDrawerFocusTimeout();
    drawerFocusTimeoutRef.current = window.setTimeout(() => {
      drawerFocusTimeoutRef.current = null;
      if (drawerFirstFocusRef.current) drawerFirstFocusRef.current.focus();
    }, 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearDrawerFocusTimeout();
    };
  }, [clearDrawerFocusTimeout, closeDrawer, isDrawerOpen]);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.16 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [projects, styles, showNewProject]);

  useEffect(() => {
    if (!actionMessage) return;
    const timer = setTimeout(() => setActionMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [actionMessage]);

  const fetchData = useCallback(async ({ showSkeleton = true, preserveData = false } = {}) => {
    if (showSkeleton) setLoading(true);
    else setIsRefreshingData(true);

    let nextLoadError = '';
    let nextLoadNotice = '';
    let shouldKeepProjects = false;
    let shouldKeepStyles = false;

    try {
      setLoadError('');
      setLoadNotice('');
      const [projectsResult, stylesResult] = await Promise.allSettled([
        withRetry(() => projectsAPI.getAll()),
        withRetry(() => stylesAPI.getAll()),
      ]);

      if (projectsResult.status === 'fulfilled') {
        projectsRef.current = projectsResult.value.data;
        setProjects(projectsResult.value.data);
      } else {
        console.error('Error fetching projects:', projectsResult.reason);
        const status = projectsResult.reason?.response?.status;
        if (status === 401 || status === 403) {
          logout();
          navigate('/login', { replace: true });
          return false;
        }
        nextLoadError = formatLoadError(projectsResult.reason);
        shouldKeepProjects = preserveData && projectsRef.current.length > 0;
        if (!shouldKeepProjects) {
          projectsRef.current = [];
          setProjects([]);
        }
      }

      if (stylesResult.status === 'fulfilled') {
        const styleData = stylesResult.value.data;
        const merged = styleData && styleData.length > 0 ? mergeStylesWithDefaults(styleData) : defaultStyles;
        stylesRef.current = merged;
        setStyles(merged);
        if (styleData && styleData.length > 0) setApiStyles(styleData);
      } else {
        console.error('Error fetching styles:', stylesResult.reason);
        shouldKeepStyles = preserveData && stylesRef.current.length > 0;
        if (shouldKeepStyles) {
          setStyles(stylesRef.current);
        } else {
          stylesRef.current = defaultStyles;
          setStyles(defaultStyles);
        }
        nextLoadNotice = shouldKeepStyles
          ? 'Could not refresh styles. Showing the last synced style library.'
          : 'Styles service unavailable. Showing default styles.';
      }

      if (shouldKeepProjects) {
        nextLoadNotice = nextLoadNotice || 'Could not refresh projects. Showing the last synced dashboard data.';
      }

      if (nextLoadError && !shouldKeepProjects) {
        setLoadError(nextLoadError);
      } else {
        setLoadError('');
      }

      setLoadNotice(nextLoadNotice);
      if (!nextLoadError || shouldKeepProjects || nextLoadNotice) {
        return true;
      }
      return false;
    } finally {
      if (showSkeleton) setLoading(false);
      else setIsRefreshingData(false);
    }
  }, [logout, navigate]);

  // Debounced search hitting backend /search
  useEffect(() => {
    const trimmedQuery = searchTerm.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      setSearchNotice('');
      setSearchMeta({ total: 0, page: 1, hasMore: false });
      return;
    }

    let cancelled = false;
    const handle = setTimeout(async () => {
      const localSearch = buildLocalStyleSearchResults(styles, trimmedQuery, 20);
      try {
        if (cancelled) return;
        setSearching(true);
        setSearchError(null);
        setSearchNotice('');
        setSearchResults(localSearch.results);
        setSearchMeta({
          total: localSearch.total,
          page: 1,
          hasMore: false,
        });

        const res = await searchAPI.searchStyles(trimmedQuery, 20, 1);
        if (cancelled) return;

        const remoteResults = res.data?.results || [];
        const mergedResults = mergeSearchResults(localSearch.results, remoteResults, 20);
        const remoteKeys = new Set(remoteResults.map(getSearchResultKey));
        const localUniqueCount = localSearch.results.filter((result) => !remoteKeys.has(getSearchResultKey(result))).length;

        setSearchResults(mergedResults);
        setSearchMeta({
          total: Math.max(
            mergedResults.length,
            (res.data?.total || remoteResults.length) + localUniqueCount,
          ),
          page: res.data?.page || 1,
          hasMore: Boolean(res.data?.has_more),
        });
      } catch (err) {
        if (cancelled) return;
        setSearchResults(localSearch.results);
        setSearchMeta({
          total: localSearch.total,
          page: 1,
          hasMore: false,
        });
        if (localSearch.total) {
          setSearchError(null);
          setSearchNotice('Search service unavailable. Showing local style matches only.');
        } else {
          setSearchNotice('');
          setSearchError(formatSearchError(err));
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchRevision, searchTerm, styles]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectType) {
      setActionMessage({ type: 'error', text: 'Please select a room type first.' });
      return;
    }

    setIsCreatingProject(true);
    try {
      const response = await projectsAPI.create(newProjectType);
      const newProject = response.data;
      const chosenStyle = newProjectStyle;
      setNewProjectType('');
      setNewProjectStyle(null);
      setShowNewProject(false);
      if (chosenStyle) {
        navigate('/workspace', {
          state: {
            projectId: newProject.id,
            roomType: newProject.room_type,
            budget: newProject.budget ?? null,
            selectedStyle: serializeStyleContext(chosenStyle),
          },
        });
        return;
      }
      setActionMessage({ type: 'success', text: 'Project created.' });
      await fetchData({ showSkeleton: false, preserveData: true });
    } catch (err) {
      console.error('Error creating project:', err);
      setActionMessage({ type: 'error', text: formatActionError(err, 'Could not create project.') });
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    setDeletingProjectId(id);
    try {
      await projectsAPI.delete(id);
      setActionMessage({ type: 'success', text: 'Project deleted.' });
      await fetchData({ showSkeleton: false, preserveData: true });
    } catch (err) {
      console.error('Error deleting project:', err);
      setActionMessage({ type: 'error', text: formatActionError(err, 'Could not delete project.') });
    } finally {
      setDeletingProjectId(null);
    }
  };

  const handleStartRenameProject = (project) => {
    setRenameProjectTarget(project);
    setRenameDraft(getProjectDisplayName(project));
    setActionMessage(null);
  };

  const handleCancelRenameProject = () => {
    setRenameProjectTarget(null);
    setRenameDraft('');
  };

  const handleSubmitRenameProject = async (projectId) => {
    const trimmedName = renameDraft.trim();
    if (!trimmedName) {
      setActionMessage({ type: 'error', text: 'Project name cannot be empty.' });
      return;
    }

    setSavingRenameProjectId(projectId);
    try {
      const response = await projectsAPI.update(projectId, { name: trimmedName });
      setProjects((current) => current.map((project) => (
        project.id === projectId ? { ...project, ...response.data } : project
      )));
      projectsRef.current = projectsRef.current.map((project) => (
        project.id === projectId ? { ...project, ...response.data } : project
      ));
      setRenameProjectTarget(null);
      setRenameDraft('');
      setActionMessage({ type: 'success', text: 'Project renamed.' });
    } catch (err) {
      console.error('Error renaming project:', err);
      setActionMessage({ type: 'error', text: formatActionError(err, 'Could not rename project.') });
    } finally {
      setSavingRenameProjectId(null);
    }
  };

  const roomTypes = ['Bedroom', 'Living Room', 'Kitchen', 'Bathroom', 'Office', 'Dining Room'];
  const totalBudget = projects.reduce((sum, project) => sum + (Number(project.budget) || 0), 0);
  const avgBudget = projects.length > 0 ? Math.round(totalBudget / projects.length) : 0;
  const sortedProjects =
    projects.length > 0 ? [...projects].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)) : [];
  const recentProjects = sortedProjects.slice(0, 3);
  const featuredStyle = initStyle || styles[0] || null;
  const featuredStyleElements = featuredStyle ? resolveStyleElements(featuredStyle) : null;
  const currentDirectionLead = featuredStyle?.description || featuredStyleElements?.previewFeatures?.[0] || 'Curated design cues';
  const dashboardTone = canonicalStyleKey(featuredStyle?.name) || 'default';
  const dashboardStats = [
    { label: 'Projects', value: projects.length, icon: FolderKanban },
    { label: 'Styles', value: styles.length, icon: Palette },
    { label: 'Room Types', value: roomTypes.length, icon: Home },
    { label: 'Avg Budget', value: `$${avgBudget}`, icon: DollarSign },
  ];

  const openProjectWorkspace = useCallback((project) => {
    navigate('/workspace', {
      state: {
        projectId: project?.id ?? null,
        roomType: project?.room_type ?? null,
        budget: project?.budget ?? null,
        photo_url: project?.photo_url ?? null,
      },
    });
  }, [navigate]);

  // Set scene for atmosphere tinting
  useEffect(() => {
    const prev = document.body.dataset.scene;
    document.body.dataset.scene = 'dashboard';
    return () => {
      if (document.body.dataset.scene === 'dashboard') {
        if (prev) document.body.dataset.scene = prev;
        else delete document.body.dataset.scene;
      }
    };
  }, []);

  return (
    <motion.div 
      className="dashboard"
      data-style={dashboardTone}
      initial={{ opacity: 0, y: 15, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -15, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="dashboard-atmosphere" aria-hidden="true">
        <span className="dashboard-orb dashboard-orb-a"></span>
        <span className="dashboard-orb dashboard-orb-b"></span>
        <span className="dashboard-orb dashboard-orb-c"></span>
      </div>
      <div className="dashboard-shell">
        <header className="dashboard-header">
          <div className="header-left">
            <h1>Dashboard</h1>
            <span className="project-count-chip">{projects.length} Projects</span>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="header-action header-action-primary studio-btn studio-btn--primary"
              onClick={() => {
                if (!newProjectType) setNewProjectType('Living Room');
                setShowNewProject(true);
                requestAnimationFrame(() => {
                  document.querySelector('.projects-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
            >
              + New Project
            </button>
          </div>
        </header>
      {loadError && (
        <div className="status-banner status-error" role="alert" aria-live="assertive">
          {loadError}
        </div>
      )}
      {loadError && (
        <div className="status-banner-actions">
          <button
            type="button"
            className="status-retry-btn"
            onClick={() => fetchData({ showSkeleton: !projects.length && !styles.length, preserveData: true })}
            disabled={isRefreshingData}
          >
            {isRefreshingData ? 'Retrying…' : 'Retry Loading'}
          </button>
        </div>
      )}
      {loadNotice && (
        <div className="status-banner status-notice" role="status" aria-live="polite">
          {loadNotice}
        </div>
      )}
      {actionMessage && (
        <div
          className={`status-banner ${actionMessage.type === 'success' ? 'status-success' : 'status-error'}`}
          role={actionMessage.type === 'success' ? 'status' : 'alert'}
          aria-live="polite"
        >
          {actionMessage.text}
        </div>
      )}

      {/* ── Adrien greeting strip (Marcelo type) ────────────────── */}
      <motion.section 
        className="dashboard-greeting" 
        aria-label="Workspace greeting"
        initial="initial"
        animate="animate"
        variants={marceloStagger}
      >
        <div className="greeting-left">
          <motion.p className="greeting-eyebrow" variants={marceloItem}>
            Home4U AI Studio
          </motion.p>
          <motion.h1 className="greeting-heading" variants={marceloItem}>
            Your&nbsp;<em>Design</em><br />Workspace
          </motion.h1>
        </div>
        <motion.div className="greeting-right" variants={marceloItem}>
          <div className="greeting-actions">
            <button
              type="button"
              className="cta-primary studio-btn studio-btn--primary"
              onClick={() => navigate('/workspace')}
            >
              Open Workspace
            </button>
            <button
              type="button"
              className="cta-secondary studio-btn studio-btn--secondary"
              onClick={() => document.getElementById('styles-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Browse Style Library
            </button>
          </div>
          {featuredStyle && (
            <div className="greeting-spotlight">
              <span className="spotlight-label">Current Direction</span>
              <div className="spotlight-head">
                <strong>Room Preview Ready</strong>
                <span>{currentDirectionLead}</span>
              </div>
              <div className="spotlight-meta">
                <span>{projects.length} active projects</span>
                <span>{avgBudget ? `$${avgBudget}` : '$0'} avg budget</span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.section>

      {/* ── Stats band — Adrien: immediately visible after greeting ── */}
      <section className="stats-row-section" aria-label="Dashboard statistics">
        <div className="stats-row">
          {dashboardStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="stats-row-item">
                <span className="stats-row-icon" aria-hidden="true">
                  <Icon size={14} strokeWidth={2} />
                </span>
                <span className="stats-row-label">{stat.label}</span>
                <span className="stats-row-value">{stat.value}</span>
              </article>
            );
          })}
        </div>
      </section>

      <motion.section
        className="recent-projects reveal-on-scroll"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="section-intro studio-section-intro">
          <h2 className="studio-section-title">Recent Activity</h2>
        </div>
        {recentProjects.length ? (
          <div className="recent-projects-grid">
            {recentProjects.map((project, idx) => (
              <motion.button
                key={project.id}
                type="button"
                className="recent-project-card"
                initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ ...marceloTransition, delay: idx * 0.1 }}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <div className="recent-project-top">
                  <span className="recent-project-title">{getProjectDisplayName(project)}</span>
                  <span className="recent-project-date">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="recent-project-meta">
                  <span className="recent-project-chip">
                    Budget {project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'}
                  </span>
                  <span className="recent-project-chip subtle">Active</span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Your studio activity will appear here once you initiate a project.</p>
          </div>
        )}
      </motion.section>


	      <div className="dashboard-grid">
        <aside className="metrics-rail">
          <div className="metrics-card reveal-on-scroll" style={{ '--delay': '0s' }}>
            <p className="metrics-label">Account Overview</p>
            <h3 className="metrics-user">{user?.full_name || user?.email || 'Designer'}</h3>
            <p className="metrics-subtle">Review current work and move the next room forward.</p>
          </div>
        </aside>

	      <div className="dashboard-main">
	        {/* What We Do - Introduction Section */}
          <motion.section 
            className="search-section reveal-on-scroll" 
            id="search-section"
            initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={marceloTransition}
          >
            <div className="section-intro studio-section-intro">
              <h2 className="studio-section-title">Design Studio Explorer</h2>
              <p className="studio-section-copy">Search over 4,000 architectural motifs and curated design signatures.</p>
            </div>

          {/* Search bar */}
          <div className="search-panel">
            <div className="search-row">
              <label className="sr-only" htmlFor="dashboard-style-search">
                Search design styles
              </label>
              <input
                id="dashboard-style-search"
                type="search"
                placeholder="Search styles (e.g., modern, industrial, cozy)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="cta-secondary studio-btn studio-btn--secondary studio-btn--compact"
                onClick={() => {
                  const trimmedQuery = searchTerm.trim();
                  if (!trimmedQuery) return;
                  if (trimmedQuery !== searchTerm) {
                    setSearchTerm(trimmedQuery);
                    return;
                  }
                  setSearchRevision((revision) => revision + 1);
                }}
                disabled={!searchTerm.trim()}
              >
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>
            {searchError && <p className="search-error" role="alert">{searchError}</p>}
            {searchNotice && <p className="search-notice" role="status" aria-live="polite">{searchNotice}</p>}
            {!searching && searchTerm && searchResults.length === 0 && !searchError && (
              <AnimatePresence>
                <motion.div 
                  className="search-empty-cinematic"
                  initial={{ opacity: 0, y: 18, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div 
                    className="empty-icon-glow"
                    animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <SearchX size={48} strokeWidth={1.5} />
                  </motion.div>
                  <h3>No Results Found</h3>
                  <p>No styles matched "{searchTerm}". Try refining your search terms.</p>
                </motion.div>
              </AnimatePresence>
            )}
            {searchResults.length > 0 && (
              <div className="search-gallery-grid">
                <AnimatePresence>
                  {searchResults.map((r, idx) => (
                    <motion.div 
                      key={`${r.type}-${getSearchResultKey(r)}`} 
                      className="search-gallery-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="gallery-card-backdrop" />
                      <div className="gallery-card-content">
                        <div className="result-head">
                          <span className="result-rank">#{r.rank}</span>
                          <span className="result-type">{r.type}</span>
                          <span className="result-score">Score {r.score.toFixed(2)}</span>
                        </div>
                        <h4>{r.title}</h4>
                        {r.snippet && <p className="result-snippet">{r.snippet}</p>}
                        {r.tags?.length ? (
                          <div className="result-tags">
                            {r.tags.map((t) => (
                              <span key={t} className="tag-pill">{t}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div className="search-meta gallery-meta">
                  <span>{searchMeta.total} results</span>
                  {searchMeta.hasMore && <span>Showing first page</span>}
                </div>
              </div>
            )}
          </div>
            
          </motion.section>

          {/* Explore Design Styles with Hover Preview Cards */}
          <motion.section 
            className="styles-section reveal-on-scroll" 
            id="styles-section"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
          >
            <div className="section-intro studio-section-intro">
              <h2 className="studio-section-title">Explore Design Styles</h2>
              <p className="studio-section-copy">Select a style to preview palette, materials, and a tailored AI direction.</p>
            </div>
            
            {initStyle && (
              <section ref={initPanelRef} className={`style-init-panel inline ${initLoading ? 'is-loading' : ''}`}>
                {initLoading ? (
                  <p className="init-status">Preparing the {initStyle.name} workspace...</p>
                ) : (
                  <>
                    <p className="virtual-eyebrow">Style Activated</p>
                    <div className="init-head">
                      <h3>{initStyle.name} Style Activated</h3>
                      <span className="init-meta">{resolveStyleElements(initStyle).previewFeatures.slice(0, 3).join(' • ')}</span>
                    </div>
                    <p className="init-copy">AI will analyze your room geometry and apply {initStyle.name} design principles.</p>
                    <div className="init-actions">
                      <button
                        type="button"
                        className="init-primary studio-btn studio-btn--primary"
                        onClick={() => navigateToWorkspace(initStyle)}
                      >
                        Open Design Workspace
                      </button>
                      <div className="init-secondary">
                        <button type="button" className="studio-btn studio-btn--secondary studio-btn--compact" onClick={() => setShowNewProject(true)}>Upload Room Photo</button>
                      </div>
                    </div>
                    <div className="init-stats">
                      <span><strong>AI Confidence:</strong> 92%</span>
                      <span><strong>Detected Improvements:</strong> 4</span>
                      <ul>
                        <li>Lighting warmed by 18%</li>
                        <li>Wall tone adjusted to ivory</li>
                        <li>Layout symmetry optimized</li>
                        <li>Accent materials added</li>
                      </ul>
                    </div>
                  </>
                )}
              </section>
            )}
            
            <div className="styles-showcase">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={`skel-style-${i}`} className="style-preview-card skeleton-card">
                    <div className="skeleton skeleton-img"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-text-sm"></div>
                  </div>
                ))
              ) : (
                styles.map((style, index) => (
                  <div 
                    key={styleSlug(style.name) || canonicalStyleKey(style.name) || style.id} 
                    className="style-preview-card reveal-on-scroll"
                    data-parallax-card
                    style={{ '--index': index, '--delay': `${0.05 + index * 0.04}s` }}
                  >
                  {/** resolve per-card emoji with unique fallback */} 
                  {(() => {
                    const styleCardKey = styleSlug(style.name) || canonicalStyleKey(style.name) || String(style.id);
                    const styleMonogram = resolveStyleMonogram(style);
                    const { key: styleKey, previewFeatures } = resolveStyleElements(style);
                    const palette = Array.isArray(style.palette) && style.palette.length
                      ? style.palette.slice(0, 4)
                      : [
                          style.accent || 'var(--color-action-emerald)',
                          style.accentTwo || 'var(--color-camel-400)',
                          style.base || 'var(--color-primary-slate)',
                          'var(--color-secondary-arctic)',
                        ].slice(0, 4);
                    const materials = Array.isArray(style.materials) && style.materials.length ? style.materials.slice(0, 2) : [];
                    const styleSummary = style.signature || style.description || 'A modern interior style.';
                    const styleTags = (materials.length ? materials : previewFeatures).slice(0, 2);
                    return (
                      <button
                        type="button"
                        className={`style-card-main${styleKey ? ` style-${styleKey}` : ''}`}
                        data-tilt
                        aria-label={`Explore ${style.name} style`}
                        onClick={(e) => handleStyleSelect(style, e.currentTarget)}
                        style={{ 
                          '--card-bg': style.gradient || 'linear-gradient(135deg, #24313a 0%, #53656e 100%)',
                          '--style-accent': style.accent || (style.name === 'Scandinavian' ? '#ffffff' : style.name === 'Industrial' ? '#a58b67' : style.name === 'Bohemian' ? '#53656e' : '#a58b67'),
                          '--style-accent-2': style.accentTwo || (style.name === 'Scandinavian' ? '#a58b67' : style.name === 'Industrial' ? '#1c2328' : style.name === 'Bohemian' ? '#42535b' : '#53656e'),
                          '--style-base': style.base || '#201915'
                        }}
                      >
                        <div className="style-card-head">
                          <div className="style-icon-wrapper" aria-hidden="true">
                            <span className="style-monogram">{styleMonogram}</span>
                          </div>
                          <div className="style-card-headtext">
                            <h3 className="style-card-title">{style.name}</h3>
                            <p className="style-card-desc" title={styleSummary}>{styleSummary}</p>
                            <div className="style-card-details">
                              <div className="style-palette" aria-label={`${style.name} palette`}>
                                {palette.map((color, i) => (
                                  <span key={`${styleCardKey}-sw-${i}`} className="style-swatch" style={{ '--swatch': color }} aria-hidden="true" />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="style-chips" aria-label="Style highlights">
                          {styleTags.map((item, i) => (
                            <span
                              key={`${styleCardKey}-chip-${i}`}
                              className="style-chip"
                              title={item}
                            >
                              <span className="chip-text">{item}</span>
                            </span>
                          ))}
                        </div>

                        <div className="style-cta-strip" aria-hidden="true">
                          <span className="cta-left">
                            <span className="cta-label">Open Brief</span>
                          </span>
                          <span className="cta-arrow">→</span>
                        </div>
                      </button>
                    );
                  })()}
                </div>
              )))}
            </div>
          </motion.section>

          {isDrawerOpen && selectedStyleDrawer && (
            <div className="style-drawer-backdrop" role="presentation" onClick={closeDrawer}>
              <aside
                className="style-drawer open"
                role="dialog"
                aria-modal="true"
                aria-labelledby={drawerTitleId}
                aria-describedby={`${drawerDescriptionId} ${drawerHintId}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="drawer-header">
                  <div>
                    <p className="virtual-eyebrow">AI Style Lab</p>
                    <h3 id={drawerTitleId} className="drawer-title">{selectedStyleDrawer.name} Studio</h3>
                    <p id={drawerDescriptionId} className="drawer-tagline">
                      AI will adapt {selectedStyleDrawer.name} principles to your room layout.
                    </p>
                  </div>
                  <button type="button" className="drawer-close" onClick={closeDrawer} aria-label="Close style drawer">✕</button>
                </div>

                <div className="drawer-body">
                  <div className={`style-preview-card ${drawerStages.preview ? 'reveal-in' : 'pre-reveal'}`}>
                    <div className="style-preview-label">Style Preview</div>
                    <div
                      className={`style-preview-visual ${activeTrait ? 'preview-highlight' : ''}`}
                      style={{
                        backgroundImage: selectedStyleDrawer.previewImage
                          ? `linear-gradient(140deg, rgba(12,10,20,0.55), rgba(12,10,20,0.2)), url(${selectedStyleDrawer.previewImage})`
                          : 'linear-gradient(160deg, #20142f, #120c1e 40%, #0c0916)',
                      }}
                    >
                      <div className="style-preview-overlay" aria-hidden="true" />
                      <div className="style-preview-grid" aria-hidden="true" />
                      <div className="style-preview-geo" aria-hidden="true" />
                      <div className="scan-line" aria-hidden="true" />
                      <p className="style-preview-copy inline inside">
                        {(selectedStyleDrawer.description || 'Clean lines, minimal decor, balanced palette').slice(0, 110)}
                      </p>
                    </div>
                  </div>

                  <div className={`drawer-section ${drawerStages.compat ? 'reveal-in' : 'pre-reveal'}`}>
                    <div className="drawer-section-head">
                      <span className="section-label">AI Compatibility</span>
                      <span className="compat-value">92% Match</span>
                    </div>
                    <div className="compat-bar">
                      <span className="compat-fill" style={{ width: '92%' }} />
                    </div>
                  </div>

                  <div className={`drawer-section ${drawerStages.compat ? 'reveal-in' : 'pre-reveal'}`}>
                    <div className="drawer-section-head">
                      <span className="section-label">AI Detected From Your Space</span>
                    </div>
                    <ul className="why-style-list detected-list">
                      {(selectedStyleDrawer.detected || [
                        'Natural lighting detected',
                        'Open wall layout',
                        'Neutral existing tones',
                        'Low furniture density',
                      ]).slice(0, 4).map((reason, idx) => (
                        <li key={idx} className="why-style-item">
                          <span className="reason-icon">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`drawer-section ${drawerStages.compat ? 'reveal-in' : 'pre-reveal'}`}>
                    <div className="drawer-section-head">
                      <span className="section-label">Why This Style Works</span>
                    </div>
                    <ul className="why-style-list">
                      {(selectedStyleDrawer.reasons || [
                        'Clean geometry improves spatial flow',
                        'Neutral palette adapts to most rooms',
                        'Minimal decor increases perceived space',
                        'Lighting-focused layouts enhance comfort',
                      ]).slice(0, 4).map((reason, idx) => (
                        <li
                          key={idx}
                          className={`why-style-item ${activeTrait && reason.toLowerCase().includes(activeTrait.toLowerCase()) ? 'reason-highlight' : ''}`}
                        >
                          <span className="reason-icon">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={`drawer-section ${drawerStages.dna ? 'reveal-in' : 'pre-reveal'}`}>
                    <div className="drawer-section-head">
                      <span className="section-label">Style DNA</span>
                    </div>
                    <div className="drawer-dna">
                      {resolveStyleElements(selectedStyleDrawer).previewFeatures.slice(0, 3).map((item, idx) => {
                        const icons = resolveStyleElements(selectedStyleDrawer).previewEmojis;
                        const icon = icons[idx % icons.length];
                        return (
                          <button
                            key={idx}
                            className="dna-chip dna-chip-interactive"
                            type="button"
                            aria-pressed={selectedTrait === item}
                            onMouseEnter={() => setHoveredTrait(item)}
                            onMouseLeave={() => setHoveredTrait('')}
                            onFocus={() => setHoveredTrait(item)}
                            onBlur={() => setHoveredTrait('')}
                            onClick={() => setSelectedTrait((current) => (current === item ? '' : item))}
                          >
                            <span className="dna-icon">{icon}</span>
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="drawer-section actions">
                    <p id={drawerHintId} className="drawer-microcopy">Transform your room using AI-powered {selectedStyleDrawer.name} design principles. Select a Style DNA chip to highlight matching cues.</p>
                  </div>
                </div>

                <div className="drawer-footer">
                  <button
                    ref={drawerFirstFocusRef}
                    type="button"
                    className="init-primary studio-btn studio-btn--primary"
                    onClick={startAiFromDrawer}
                  >
                    Open Design Workspace
                  </button>
                  <div className="drawer-actions-inline">
                    <button type="button" className="drawer-tertiary" onClick={() => setShowNewProject(true)}>Upload Room Photo</button>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {/* Projects Section */}
          <section className="projects-section reveal-on-scroll">
            <div className="section-header">
              <h2>My Room Projects</h2>
              <button 
                type="button"
                onClick={() => { if (!newProjectType) setNewProjectType('Living Room'); setShowNewProject(!showNewProject); }}
                className="new-project-btn studio-btn studio-btn--secondary"
              >
                {showNewProject ? 'Close' : '+ New Project'}
              </button>
            </div>

            {showNewProject && (
              <form onSubmit={handleCreateProject} className="new-project-form">
                <div className="form-text">
                  <p className="form-title">Create a new room project</p>
                  <p className="form-subtitle">Pick a room type and style direction to get started.</p>
                </div>
                <div className="new-project-fields">
                  <select
                    value={newProjectType}
                    onChange={(e) => setNewProjectType(e.target.value)}
                    required
                  >
                    <option value="">Select room type</option>
                    {roomTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                {(apiStyles.length > 0 || styles.length > 0) && (
                  <div className="new-project-style-picker">
                    <p className="form-subtitle">Style direction <span className="optional-label">(optional)</span></p>
                    <div className="style-pill-grid">
                      {(apiStyles.length > 0 ? apiStyles : styles).map((style) => (
                        <button
                          key={style.name}
                          type="button"
                          className={`style-pill${newProjectStyle?.name === style.name ? ' is-selected' : ''}`}
                          onClick={() => setNewProjectStyle(newProjectStyle?.name === style.name ? null : style)}
                        >
                          {style.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="new-project-form-actions">
                  <button type="submit" disabled={isCreatingProject || !newProjectType}>
                    {isCreatingProject ? 'Creating…' : newProjectStyle ? `Create with ${newProjectStyle.name}` : 'Create Project'}
                  </button>
                  <button type="button" onClick={() => { setShowNewProject(false); setNewProjectStyle(null); setNewProjectType(''); }}>Cancel</button>
                </div>
              </form>
            )}

            {loading ? (
              <div className="projects-grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`skel-proj-${i}`} className="project-card skeleton-card">
                    <div className="skeleton skeleton-text-lg"></div>
                    <div className="skeleton skeleton-text"></div>
                    <div className="skeleton skeleton-btn"></div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="empty-state projects-empty-state zero-state-onboarding"
              >
                <div className="zero-state-grid">
                  <div className="zero-state-header">
                    <motion.div 
                      initial={{ scale: 0.92, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="projects-empty-icon" 
                      aria-hidden="true"
                    >
                      <FolderKanban size={32} strokeWidth={1.7} />
                    </motion.div>
                    <p className="zero-state-eyebrow">Project Setup</p>
                    <h3>Start Your First Room Project</h3>
                    <p>Pick a template to prefill your setup, then continue into budget and style planning.</p>
                  </div>

                  <ol className="zero-state-steps" aria-label="Project setup steps">
                    <li className="zero-state-step">
                      <span className="step-index">1</span>
                      <span>Choose room type</span>
                    </li>
                    <li className="zero-state-step">
                      <span className="step-index">2</span>
                      <span>Set your plan</span>
                    </li>
                    <li className="zero-state-step">
                      <span className="step-index">3</span>
                      <span>Open design studio</span>
                    </li>
                  </ol>

                  <div className="zero-state-templates">
                    <motion.button 
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                      className={`template-card ${newProjectType === 'Living Room' ? 'is-selected' : ''}`}
                      aria-pressed={newProjectType === 'Living Room'}
                      onClick={() => { setNewProjectType('Living Room'); setShowNewProject(true); }}
                    >
                      <div className="template-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1774551351897-c64cd76a7c22?auto=format&fit=crop&q=80&w=600&h=400')" }}></div>
                      <div className="template-copy">
                        <span className="template-name">Living Room</span>
                        <span className="template-meta">Best for social spaces, layout flow, and statement furniture planning.</span>
                      </div>
                    </motion.button>
                    <motion.button 
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ y: 0 }}
                      className={`template-card ${newProjectType === 'Bedroom' ? 'is-selected' : ''}`}
                      aria-pressed={newProjectType === 'Bedroom'}
                      onClick={() => { setNewProjectType('Bedroom'); setShowNewProject(true); }}
                    >
                      <div className="template-img" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=600')" }}></div>
                      <div className="template-copy">
                        <span className="template-name">Bedroom</span>
                        <span className="template-meta">Best for comfort layering, lighting mood, and restful color systems.</span>
                      </div>
                    </motion.button>
                  </div>

                  <div className="zero-state-actions">
                    <motion.button 
                      type="button"
                      whileHover={{ y: -1 }}
                      whileTap={{ y: 0 }}
                      className="new-project-btn cta-primary studio-btn studio-btn--primary"
                      onClick={() => { if (!newProjectType) setNewProjectType('Living Room'); setShowNewProject(true); }}
                    >
                      {newProjectType ? `Continue with ${newProjectType}` : 'Create Custom Project'}
                    </motion.button>
                    <p className="zero-state-note">You can refine room details, budget, and style before launch.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="projects-grid">
                <AnimatePresence>
                  {projects.map((project, index) => (
                    <motion.div 
                      key={project.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="project-card"
                    >
                      {project.photo_url && (
                        <div className="project-card-thumb" onClick={() => openProjectWorkspace(project)}>
                          <img
                            src={
                              project.photo_url.startsWith('http') || project.photo_url.startsWith('/uploads')
                                ? project.photo_url
                                : `/uploads/${project.photo_url}`
                            }
                            alt={`${getProjectDisplayName(project)} room`}
                            loading="lazy"
                          />
                          <div className="project-card-thumb-overlay">
                            <span>Open Studio</span>
                          </div>
                        </div>
                      )}
                      <div className="project-card-header">
                        <h3>{getProjectDisplayName(project)}</h3>
                        <button
                          type="button"
                          className="rename-project-badge"
                          onClick={() => handleStartRenameProject(project)}
                          disabled={savingRenameProjectId === project.id}
                        >
                          {savingRenameProjectId === project.id ? 'Saving…' : 'Rename'}
                        </button>
                      </div>
                      <div className="project-meta">
                        <p><strong>Room:</strong> {project.room_type}</p>
                        <p><strong>Investment:</strong> ${project.budget ? Number(project.budget).toLocaleString() : 0}</p>
                        <p><strong>Initiated:</strong> {new Date(project.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="project-actions">
                        <button type="button" className="open-btn" onClick={() => openProjectWorkspace(project)}>
                          Open Studio
                        </button>
                        <button 
                          type="button"
                          onClick={() => navigate(`/project/${project.id}`)}
                          className="view-btn"
                        >
                          View Project
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(project.id)}
                        className="delete-btn ghost-danger project-archive-btn"
                        disabled={deletingProjectId === project.id}
                      >
                        {deletingProjectId === project.id ? 'Removing...' : 'Archive'}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
      </div>
      </div>

      {renameProjectTarget && (
        <div className="project-rename-modal-backdrop" role="presentation" onClick={handleCancelRenameProject}>
          <div
            className="project-rename-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-project-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="project-rename-modal-head">
              <div>
                <p className="virtual-eyebrow">Project Rename</p>
                <h3 id="rename-project-title">Rename this project</h3>
                <p className="project-rename-modal-copy">
                  Update the display name for {renameProjectTarget.room_type}. This saves to the database.
                </p>
              </div>
              <button
                type="button"
                className="project-rename-close"
                aria-label="Close rename dialog"
                onClick={handleCancelRenameProject}
                disabled={savingRenameProjectId === renameProjectTarget.id}
              >
                ×
              </button>
            </div>

            <form
              className="project-rename-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitRenameProject(renameProjectTarget.id);
              }}
            >
              <label className="project-rename-label" htmlFor="project-rename-input">Project name</label>
              <input
                id="project-rename-input"
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                maxLength={160}
                placeholder="Enter project name"
                disabled={savingRenameProjectId === renameProjectTarget.id}
                autoFocus
              />
              <div className="project-rename-modal-actions">
                <button
                  type="button"
                  className="project-rename-cancel"
                  onClick={handleCancelRenameProject}
                  disabled={savingRenameProjectId === renameProjectTarget.id}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="project-rename-save"
                  disabled={savingRenameProjectId === renameProjectTarget.id}
                >
                  {savingRenameProjectId === renameProjectTarget.id ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="dashboard-footer-content">
          <div className="dashboard-footer-brand">
            <h3>Home4U</h3>
            <p>Interior planning workspace for modern renovation teams and homeowners.</p>
          </div>
          <div className="dashboard-footer-links">
            <div className="dashboard-footer-column">
              <h4>Navigation</h4>
              <button type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button type="button" onClick={logout}>Logout</button>
            </div>
            <div className="dashboard-footer-column">
              <h4>About</h4>
              <p>Version 1.0.0</p>
              <p>Built by the Home4U team</p>
            </div>
          </div>
        </div>
        <div className="dashboard-footer-bottom">
          <p>© 2026 Home4U. All rights reserved.</p>
        </div>
      </footer>
      </div>
    </motion.div>
  );
};

export default Dashboard;
