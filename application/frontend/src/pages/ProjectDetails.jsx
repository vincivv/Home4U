import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Sparkles,
} from 'lucide-react';
import { projectsAPI, recommendationsAPI } from '../services/api';
import { SkeletonKanbanColumn, SkeletonCard } from '../components/Skeletons';
import { styleSlug } from '../utils/styleContext';
import './ProjectDetails.css';

const containerVariants = {
  hidden: { opacity: 0, y: 12, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1], staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const deriveProjectTone = (analysis, project) => {
  const selected = analysis?.selected_style?.name || project?.room_type || '';
  return styleSlug(selected || 'default') || 'default';
};

const formatCurrency = (value) => `$${Number(value || 0).toLocaleString()}`;
const getProjectDisplayName = (project) => project?.name || project?.room_type || 'Untitled Project';

const resolveProjectImageUrl = (photoUrl) => {
  if (!photoUrl) return '';

  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }

  if (photoUrl.startsWith('/uploads')) {
    return photoUrl;
  }

  if (photoUrl.startsWith('uploads/')) {
    return `/${photoUrl}`;
  }

  return `/uploads/${photoUrl}`;
};

const SHOPPING_LANES = [
  {
    key: 'buy-first',
    title: 'Buy First',
    detail: 'Start with the item that changes the room fastest.',
  },
  {
    key: 'layer-next',
    title: 'Layer Next',
    detail: 'Add the pieces that lock in the style direction.',
  },
  {
    key: 'finish-out',
    title: 'Finish Out',
    detail: 'Use these for polish, balance, and final cohesion.',
  },
];

const getShoppingLaneKey = (index) => {
  if (index === 0) return 'buy-first';
  if (index <= 2) return 'layer-next';
  return 'finish-out';
};

const formatProjectRequestError = (err, fallback = 'Request failed for this project.') => {
  if (!err) return fallback;

  const status = err.response?.status;
  const detail = err.response?.data?.detail;
  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'Access denied for this project.';
  if (status === 404) return detail || 'This project could not be found.';
  if (status && status >= 500) return detail || 'Server error while loading project data.';
  if (status && status >= 400) return detail || fallback;
  if (err.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
  if (err.message?.toLowerCase().includes('network')) {
    return 'Network issue: unable to reach API. Check backend/proxy configuration.';
  }
  return fallback;
};

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState(null);
  const [budget, setBudget] = useState('');
  const [projectNameDraft, setProjectNameDraft] = useState('');
  const [isRenamingProject, setIsRenamingProject] = useState(false);
  const [savingProjectName, setSavingProjectName] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);
  const [completingRecommendationId, setCompletingRecommendationId] = useState(null);
  const shoppingPlan = analysis?.shopping_plan || [];

  const fetchData = useCallback(async ({ showSkeleton = true } = {}) => {
    if (showSkeleton) setLoading(true);
    try {
      setLoadError('');
      const projectRes = await projectsAPI.getById(id);
      setProject(projectRes.data);

      const [analysisRes, recsRes] = await Promise.allSettled([
        projectsAPI.getAnalysis(id),
        recommendationsAPI.getByProject(id),
      ]);

      if (analysisRes.status === 'fulfilled') {
        setAnalysis(analysisRes.value.data);
        setRecommendations(analysisRes.value.data?.recommendations || []);
      } else {
        setAnalysis(null);
        if (recsRes.status === 'fulfilled') {
          setRecommendations(recsRes.value.data || []);
        } else {
          setRecommendations([]);
        }
      }
    } catch (err) {
      console.error('Error fetching project:', err);
      setLoadError(formatProjectRequestError(err, 'Could not load this project.'));
      if (showSkeleton) {
        setProject(null);
        setAnalysis(null);
        setRecommendations([]);
      }
    } finally {
      if (showSkeleton) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const prevScene = document.body.dataset.scene;
    document.body.dataset.scene = 'project';
    return () => {
      if (document.body.dataset.scene === 'project') {
        if (prevScene) document.body.dataset.scene = prevScene;
        else delete document.body.dataset.scene;
      }
    };
  }, []);

  useEffect(() => {
    if (!actionMessage) return undefined;
    const timer = window.setTimeout(() => setActionMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [actionMessage]);

  useEffect(() => {
    setProjectNameDraft(project?.name || '');
  }, [project?.name]);

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    const nextBudget = Number(budget);
    if (!budget || !Number.isFinite(nextBudget) || nextBudget <= 0) {
      setActionMessage({ type: 'error', text: 'Enter a positive budget amount.' });
      return;
    }

    setSavingBudget(true);
    setActionMessage(null);
    try {
      await projectsAPI.update(id, { budget: nextBudget });
      setBudget('');
      setActionMessage({ type: 'success', text: 'Budget updated.' });
      await fetchData({ showSkeleton: false });
    } catch (err) {
      console.error('Error updating budget:', err);
      setActionMessage({
        type: 'error',
        text: formatProjectRequestError(err, 'Could not update the project budget.'),
      });
    } finally {
      setSavingBudget(false);
    }
  };

  const handleRenameProject = async (e) => {
    e.preventDefault();
    const trimmedName = projectNameDraft.trim();
    if (!trimmedName) {
      setActionMessage({ type: 'error', text: 'Project name cannot be empty.' });
      return;
    }

    if (trimmedName === (project?.name || '').trim()) {
      setIsRenamingProject(false);
      return;
    }

    setSavingProjectName(true);
    setActionMessage(null);
    try {
      const response = await projectsAPI.update(id, { name: trimmedName });
      setProject((current) => ({ ...current, ...response.data }));
      setProjectNameDraft(response.data.name || trimmedName);
      setIsRenamingProject(false);
      setActionMessage({ type: 'success', text: 'Project renamed.' });
    } catch (err) {
      console.error('Error renaming project:', err);
      setActionMessage({
        type: 'error',
        text: formatProjectRequestError(err, 'Could not rename this project.'),
      });
    } finally {
      setSavingProjectName(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setGenerating(true);
    setActionMessage(null);
    try {
      await recommendationsAPI.generate(id);
      setActionMessage({ type: 'success', text: 'Project plan refreshed.' });
      await fetchData({ showSkeleton: false });
    } catch (err) {
      console.error('Error generating recommendations:', err);
      setActionMessage({
        type: 'error',
        text: formatProjectRequestError(err, 'Could not refresh the project plan.'),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkComplete = async (recId) => {
    setCompletingRecommendationId(recId);
    setActionMessage(null);
    try {
      await recommendationsAPI.markComplete(recId);
      setActionMessage({ type: 'success', text: 'Task marked complete.' });
      await fetchData({ showSkeleton: false });
    } catch (err) {
      console.error('Error marking complete:', err);
      setActionMessage({
        type: 'error',
        text: formatProjectRequestError(err, 'Could not update the task status.'),
      });
    } finally {
      setCompletingRecommendationId(null);
    }
  };

  if (loading) {
    return (
      <div className="project-details">
        <div className="project-details-header">
          <div className="skeleton" style={{ width: '300px', height: '40px' }} />
        </div>
        <div className="canvas-grid">
          <div className="project-sidebar">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="project-main-stack">
            <SkeletonCard />
            <div className="kanban-board">
              <SkeletonKanbanColumn />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <motion.div
        className="project-details"
        data-style="default"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="project-atmosphere" aria-hidden="true">
          <span className="project-orb project-orb-a"></span>
          <span className="project-orb project-orb-b"></span>
          <span className="project-orb project-orb-c"></span>
        </div>

        <motion.div variants={sectionVariants} className="project-details-header">
          <div className="header-left">
            <button type="button" onClick={() => navigate('/dashboard')} className="back-btn-ghost studio-btn studio-btn--ghost">
              <ChevronLeft size={16} /> Back to Dashboard
            </button>
            <p className="project-eyebrow">Project Command Deck</p>
            <h1 className="p-title">Project unavailable</h1>
            <div className="p-meta">We could not load project #{id}. Retry the request or return to the dashboard.</div>
          </div>
        </motion.div>

        <section className="project-empty-state">
          <div className="project-status-banner project-status-banner--error" role="alert" aria-live="assertive">
            {loadError || 'Could not load this project.'}
          </div>
          <div className="project-status-actions">
            <button type="button" className="feature-secondary" onClick={() => fetchData()}>
              Retry Loading
            </button>
            <button type="button" className="feature-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </section>
      </motion.div>
    );
  }

  const tone = deriveProjectTone(analysis, project);
  const selectedStyleName = analysis?.selected_style?.name || 'Saved Project';
  const selectedStyleSlug = analysis?.selected_style?.name
    ? styleSlug(analysis.selected_style.name)
    : '';
  const projectDisplayName = getProjectDisplayName(project);
  const projectBudget = Number(project?.budget) || 0;
  const recommendationList = analysis?.recommendations || recommendations;
  const suggestedTags = analysis?.suggested_tags || [];
  const styleScores = analysis?.style_scores || [];
  const selectedScore = styleScores.find((item) => item.style_name === analysis?.selected_style?.name) || styleScores[0] || null;
  const openTasks = recommendationList.filter((item) => !item.is_completed);
  const completedTasks = recommendationList.filter((item) => item.is_completed);
  const spent = recommendationList
    .filter((item) => item.is_completed)
    .reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const remaining = projectBudget - spent;
  const shoppingTotal = shoppingPlan.reduce((sum, item) => sum + (Number(item.estimated_cost) || 0), 0);
  const nextPurchase = shoppingPlan.find((item) => !item.is_completed) || shoppingPlan[0] || null;
  const completedShoppingCount = shoppingPlan.filter((item) => item.is_completed).length;
  const remainingShoppingCount = Math.max(0, shoppingPlan.length - completedShoppingCount);
  const shoppingProgress = shoppingPlan.length ? Math.round((completedShoppingCount / shoppingPlan.length) * 100) : 0;
  const hasOutstandingPurchases = shoppingPlan.some((item) => !item.is_completed);
  const projectImageUrl = resolveProjectImageUrl(project?.photo_url);

  const purchaseBoard = (() => {
    const laneMap = new Map(
      SHOPPING_LANES.map((lane) => [lane.key, { ...lane, total: 0, items: [] }]),
    );

    shoppingPlan.forEach((item, index) => {
      const lane = laneMap.get(getShoppingLaneKey(index));
      if (!lane) return;
      lane.items.push({
        ...item,
        stepNumber: index + 1,
      });
      lane.total += Number(item.estimated_cost || 0);
    });

    return SHOPPING_LANES
      .map((lane) => laneMap.get(lane.key))
      .filter((lane) => lane && lane.items.length > 0)
      .map((lane) => ({
        ...lane,
        total: Math.round((lane.total || 0) * 100) / 100,
      }));
  })();

  return (
    <motion.div
      className="project-details"
      data-style={tone}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={sectionVariants} className="project-details-header">
        <div className="header-left">
          <button type="button" onClick={() => navigate('/dashboard')} className="back-btn-ghost studio-btn studio-btn--ghost">
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <p className="project-eyebrow">Project Command Deck</p>
          <h1 className="p-title">{projectDisplayName}</h1>
          <div className="p-meta">
            {project?.room_type} studio brief • {selectedStyleName} direction • Project #{id}
            {analysis ? ` • ${Math.round(selectedScore?.score_value || 0)}% aligned` : ''}
          </div>
          <div className="project-name-tools">
            {isRenamingProject ? (
              <form className="project-name-form" onSubmit={handleRenameProject}>
                <input
                  type="text"
                  value={projectNameDraft}
                  onChange={(e) => setProjectNameDraft(e.target.value)}
                  maxLength={160}
                  placeholder="Rename project"
                  aria-label="Project name"
                  disabled={savingProjectName}
                />
                <button type="submit" disabled={savingProjectName}>
                  {savingProjectName ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="feature-secondary"
                  onClick={() => {
                    setProjectNameDraft(project?.name || '');
                    setIsRenamingProject(false);
                  }}
                  disabled={savingProjectName}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                className="feature-secondary"
                onClick={() => setIsRenamingProject(true)}
              >
                Rename Project
              </button>
            )}
          </div>
          <div className="project-hero-metrics studio-hero-metrics">
            <div className="project-hero-card studio-hero-card">
              <span className="studio-hero-label">Budget rail</span>
              <strong className="studio-hero-value">{formatCurrency(projectBudget)}</strong>
            </div>
            <div className="project-hero-card studio-hero-card">
              <span className="studio-hero-label">Shopping total</span>
              <strong className="studio-hero-value">{formatCurrency(shoppingTotal)}</strong>
            </div>
            <div className="project-hero-card studio-hero-card">
              <span className="studio-hero-label">Open tasks</span>
              <strong className="studio-hero-value">{openTasks.length}</strong>
            </div>
          </div>
        </div>
      </motion.div>

      {(loadError || actionMessage) && (
        <div className="project-status-stack">
          {loadError && (
            <>
              <div className="project-status-banner project-status-banner--error" role="alert" aria-live="assertive">
                {loadError}
              </div>
              <div className="project-status-actions">
                <button type="button" className="feature-secondary" onClick={() => fetchData({ showSkeleton: false })}>
                  Retry Loading
                </button>
              </div>
            </>
          )}
          {actionMessage && (
            <div
              className={`project-status-banner ${
                actionMessage.type === 'success'
                  ? 'project-status-banner--success'
                  : 'project-status-banner--error'
              }`}
              role={actionMessage.type === 'success' ? 'status' : 'alert'}
              aria-live="polite"
            >
              {actionMessage.text}
            </div>
          )}
        </div>
      )}

      <div className="canvas-grid">
        <motion.aside variants={sectionVariants} className="project-sidebar">
          <div className="finance-card">
            <div className="finance-head">
              <h3>Budget Overview</h3>
              <p>Track the plan against the ceiling and keep the room realistic.</p>
            </div>

            <div className="budget-details">
              <div className="budget-item">
                <span className="lbl">Invested</span>
                <span className="val">{formatCurrency(spent)}</span>
              </div>
              <div className="budget-item">
                <span className="lbl">Budget</span>
                <span className="val">{formatCurrency(projectBudget)}</span>
              </div>
              <div className="budget-item">
                <span className="lbl">Remaining</span>
                <span className={`val ${remaining < 0 ? 'negative' : 'positive'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>

            <form onSubmit={handleUpdateBudget} className="budget-form" noValidate>
              <label className="sr-only" htmlFor="project-budget-input">Adjust budget ceiling</label>
              <input
                id="project-budget-input"
                type="number"
                min="1"
                step="1"
                placeholder="Adjust ceiling..."
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
              <button type="submit" disabled={savingBudget}>{savingBudget ? 'Saving…' : 'Update'}</button>
            </form>
          </div>

          <div className="analysis-card">
            <div className="finance-head">
              <h3>Saved Analysis</h3>
              <p>{analysis?.summary || 'Run workspace analysis to generate style signals and shopping guidance.'}</p>
            </div>

            {!!suggestedTags.length && (
              <div className="analysis-chip-row studio-chip-row">
                {suggestedTags.slice(0, 5).map((tag) => (
                  <span key={tag.id} className="analysis-chip studio-chip">{tag.name}</span>
                ))}
              </div>
            )}

            {!!selectedScore?.matched_tags?.length && (
              <div className="analysis-meta-list">
                {selectedScore.matched_tags.map((tag) => (
                  <div key={tag} className="analysis-meta-row">
                    <span>{tag}</span>
                    <span>Matched signal</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.aside>

        <motion.div variants={sectionVariants} className="project-main-stack">
          <section className="project-feature-panel">
            <div className="feature-panel-copy">
              <p className="project-eyebrow">Next Best Move</p>
              <h2>{nextPurchase?.label || 'Generate your first plan'}</h2>
              <p>
                {nextPurchase
                  ? nextPurchase.purchase_reason
                  : 'Once analysis is saved from the workspace, this panel will spotlight the highest-impact purchase.'}
              </p>
              {nextPurchase && (
                <div className="feature-panel-meta">
                  <span>{nextPurchase.priority_label}</span>
                  <span>{formatCurrency(nextPurchase.estimated_cost)}</span>
                  <span>{Math.round((nextPurchase.budget_share || 0) * 100)}% of budget</span>
                </div>
              )}
            </div>
            <div className="feature-panel-actions">
              <button
                type="button"
                className="feature-primary"
                onClick={() => navigate(
                  selectedStyleSlug
                    ? `/workspace?style=${encodeURIComponent(selectedStyleSlug)}`
                    : '/workspace',
                  {
                    state: {
                      projectId: project?.id ?? null,
                      roomType: project?.room_type ?? null,
                      budget: project?.budget ?? null,
                      ...(analysis?.selected_style ? { selectedStyle: analysis.selected_style } : {}),
                    },
                  },
                )}
              >
                Open Workspace
              </button>
              <button
                type="button"
                className="feature-secondary"
                onClick={handleGenerateRecommendations}
                disabled={generating}
              >
                {generating ? <Clock size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {generating ? 'Refreshing…' : 'Refresh Plan'}
              </button>
            </div>
          </section>

          {projectImageUrl && (
            <section className="project-photo-panel">
              <div className="kanban-header">
                <div className="purchase-board-copy">
                  <h2>Saved Room Photo</h2>
                  <p>The uploaded image linked to this project.</p>
                </div>
              </div>
              <div className="project-photo-frame">
                <img
                  src={projectImageUrl}
                  alt={`${project?.room_type || 'Room'} project`}
                  className="project-photo-image"
                  loading="lazy"
                />
              </div>
            </section>
          )}

          <section className="shopping-board">
            <div className="kanban-header purchase-board-head">
              <div className="purchase-board-copy">
                <h2>Purchase Board</h2>
                <p>Move from saved design signals to a room-by-room buying sequence.</p>
              </div>
              <div className="purchase-board-summary">
                <span className="shopping-total">{formatCurrency(shoppingTotal)}</span>
                <span className="shopping-total">{completedShoppingCount}/{shoppingPlan.length || 0} sourced</span>
                <span className="shopping-total">{remainingShoppingCount} left</span>
                <span className="shopping-total">{shoppingProgress}% complete</span>
              </div>
            </div>

            {shoppingPlan.length ? (
              <>
                {nextPurchase && (
                  <section
                    className={`purchase-spotlight ${nextPurchase.is_completed ? 'completed' : ''}`}
                  >
                    <div className="purchase-spotlight-copy">
                      <p className="project-eyebrow">
                        {hasOutstandingPurchases ? 'Buy First' : 'Plan Complete'}
                      </p>
                      <h3>{nextPurchase.label}</h3>
                      <p>{nextPurchase.purchase_reason}</p>
                      <div className="purchase-spotlight-meta">
                        <span>{nextPurchase.priority_label}</span>
                        <span>{nextPurchase.room_zone}</span>
                        <span>{formatCurrency(nextPurchase.estimated_cost)}</span>
                        <span>{Math.round((nextPurchase.budget_share || 0) * 100)}% of budget</span>
                      </div>
                      <div className="purchase-search-query">
                        <span>Look for</span>
                        <strong>{nextPurchase.search_query}</strong>
                      </div>
                    </div>
                    <div className="purchase-spotlight-actions">
                      {(nextPurchase.products || []).map((product) => (
                        <article key={product.key} className="purchase-product-card">
                          <div className={`purchase-product-thumb ${product.image_url ? 'has-image' : 'is-placeholder'}`}>
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} loading="lazy" />
                            ) : (
                              <span>{product.retailer.slice(0, 1)}</span>
                            )}
                          </div>
                          <div className="purchase-product-copy">
                            <div className="purchase-product-topline">
                              <span className="purchase-product-badge">{product.match_label}</span>
                              <span className="purchase-product-retailer">{product.retailer}</span>
                            </div>
                            <h4>{product.name}</h4>
                            <p>{product.match_reason}</p>
                            <div className="purchase-product-meta">
                              <span>{product.price_label}</span>
                              <span>{formatCurrency(product.estimated_cost)}</span>
                              <span>{product.source_kind === 'catalog' ? 'Catalog' : 'Retailer search'}</span>
                            </div>
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noreferrer"
                              className="purchase-product-link"
                            >
                              <span>View Pick</span>
                              <ArrowUpRight size={14} />
                            </a>
                          </div>
                        </article>
                      ))}
                      {!(nextPurchase.products || []).length && nextPurchase.sources.map((source) => (
                        <a
                          key={`${nextPurchase.key}-${source.retailer}`}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shopping-source-link"
                        >
                          <span>Search {source.retailer}</span>
                          <ArrowUpRight size={14} />
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                <div className="shopping-lanes">
                  {purchaseBoard.map((lane) => (
                    <section
                      key={lane.key}
                      className="shopping-lane"
                    >
                      <div className="shopping-lane-head">
                        <div className="shopping-lane-copy">
                          <p className="shopping-lane-kicker">{lane.title}</p>
                          <p>{lane.detail}</p>
                        </div>
                        <span className="shopping-lane-total">{formatCurrency(lane.total)}</span>
                      </div>
                      <div className="shopping-lane-grid">
                        {lane.items.map((item) => (
                          <article key={item.key} className={`shopping-plan-card ${item.is_completed ? 'completed' : ''}`}>
                            <div className="shopping-plan-topline">
                              <span className="shopping-plan-step">Step {item.stepNumber}</span>
                              <span className="shopping-plan-category">{item.category}</span>
                              {item.is_completed && <span className="shopping-plan-status">Completed</span>}
                            </div>
                            <h4>{item.label}</h4>
                            <p>{item.purchase_reason}</p>
                            <div className="shopping-plan-meta">
                              <span>{item.room_zone}</span>
                              <span>{formatCurrency(item.estimated_cost)}</span>
                              <span>{Math.round((item.budget_share || 0) * 100)}% of budget</span>
                            </div>
                            <div className="shopping-plan-query">
                              <span>Look for</span>
                              <strong>{item.search_query}</strong>
                            </div>
                            {!!item.products?.length && (
                              <div className="shopping-product-grid">
                                {item.products.map((product) => (
                                  <article key={product.key} className="shopping-product-card">
                                    <div className={`shopping-product-thumb ${product.image_url ? 'has-image' : 'is-placeholder'}`}>
                                      {product.image_url ? (
                                        <img src={product.image_url} alt={product.name} loading="lazy" />
                                      ) : (
                                        <span>{product.retailer.slice(0, 1)}</span>
                                      )}
                                    </div>
                                    <div className="shopping-product-copy">
                                      <div className="shopping-product-topline">
                                        <span className="shopping-product-badge">{product.match_label}</span>
                                        <span className="shopping-product-retailer">{product.retailer}</span>
                                      </div>
                                      <h5>{product.name}</h5>
                                      <p>{product.match_reason}</p>
                                      <div className="shopping-product-meta">
                                        <span>{product.price_label}</span>
                                        <span>{formatCurrency(product.estimated_cost)}</span>
                                      </div>
                                      <a
                                        href={product.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="purchase-product-link compact"
                                      >
                                        <span>View Pick</span>
                                        <ArrowUpRight size={14} />
                                      </a>
                                    </div>
                                  </article>
                                ))}
                              </div>
                            )}
                            <div className="shopping-plan-sources">
                              {item.sources.map((source) => (
                                <a
                                  key={`${item.key}-${source.retailer}`}
                                  href={source.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="shopping-source-link"
                                >
                                  <span>Search {source.retailer}</span>
                                  <ArrowUpRight size={14} />
                                </a>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-kanban shopping-empty-state">
                Run workspace analysis first. The saved purchase board will show what to buy first, what to layer next, and where to start searching.
              </div>
            )}
          </section>

          <section className="kanban-board">
            <div className="kanban-header">
              <h2>Project Tasks</h2>
            </div>

            <div className="kanban-columns">
              <div className="k-col">
                <div className="k-col-head">
                  <span>Open Tasks</span>
                  <span className="count">{openTasks.length}</span>
                </div>
                <div className="k-col-body">
                  {openTasks.length === 0 ? (
                    <div className="empty-kanban">All current tasks are complete.</div>
                  ) : (
                    <AnimatePresence>
                      {openTasks.map((rec) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, x: -20, filter: 'blur(8px)' }}
                          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, x: 20, filter: 'blur(8px)', transition: { duration: 0.3 } }}
                          className="k-card"
                        >
                          <p className="k-card-desc">{rec.description}</p>
                          <div className="k-card-meta">
                            <span className="k-badge">{formatCurrency(rec.estimated_cost)}</span>
                            <button
                              type="button"
                              onClick={() => handleMarkComplete(rec.id)}
                              className="k-action-btn"
                              disabled={completingRecommendationId === rec.id}
                            >
                              {completingRecommendationId === rec.id ? 'Saving…' : 'Complete'}
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              <div className="k-col">
                <div className="k-col-head">
                  <span>Completed Tasks</span>
                  <span className="count">{completedTasks.length}</span>
                </div>
                <div className="k-col-body">
                  <AnimatePresence>
                    {completedTasks.slice().reverse().map((rec) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="k-card completed"
                      >
                        <p className="k-card-desc">{rec.description}</p>
                        <div className="k-card-meta">
                          <span className="k-badge">{formatCurrency(rec.estimated_cost)}</span>
                          <CheckCircle2 size={16} color="var(--pd-accent)" />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProjectDetails;
