import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Upload, Wand2, CheckCircle2, ChevronLeft, Sparkles, ArrowUpRight } from 'lucide-react';
import { projectsAPI, stylesAPI } from '../services/api';
import { resolveStyleContext, serializeStyleContext, styleSlug } from '../utils/styleContext';
import {
  extractImageProfile,
  inferDetectedTags,
  normalizeRoomUpload,
  ROOM_UPLOAD_SOURCE_MAX_BYTES,
  ROOM_UPLOAD_TARGET_MAX_BYTES,
} from '../utils/workspaceDesign';
import './Workspace.css';

const ROOM_TYPE_OPTIONS = [
  'Living Room',
  'Kitchen',
  'Bedroom',
  'Bathroom',
  'Home Office',
  'Dining Room',
];

const ALLOWED_ROOM_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const resolveWorkspaceProjectImageUrl = (photoUrl) => {
  if (!photoUrl) return '';
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  if (photoUrl.startsWith('/uploads')) return photoUrl;
  if (photoUrl.startsWith('uploads/')) return `/${photoUrl}`;
  return `/uploads/${photoUrl}`;
};

const formatWorkspaceRequestError = (error, stage = 'analyze-room') => {
  const detail = error?.response?.data?.detail;
  const status = error?.response?.status;
  const stageCopy = {
    'create-project': 'start your plan',
    'update-project': 'save your room settings',
    'upload-photo': 'upload the room photo',
    'extract-signals': 'read the room photo',
    'analyze-room': 'build the plan',
  };
  const action = stageCopy[stage] || 'complete this step';

  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'Access denied for this room project.';
  if (status === 404) return detail || 'This room project could not be found.';
  if (status === 413) return 'The selected room photo is too large. Use an image under 20 MB.';
  if (status === 415) return 'Unsupported image format. Upload a PNG, JPG, or WebP file.';
  if (status && status >= 500) return detail || `Server error while trying to ${action}.`;
  if (status && status >= 400) return detail || `Could not ${action}.`;
  if (error?.code === 'ECONNABORTED') return `Request timed out while trying to ${action}.`;
  if (error?.message?.toLowerCase().includes('network')) {
    return `Network issue while trying to ${action}. Check your connection and try again.`;
  }
  return detail || `Could not ${action}. Please try again.`;
};

const Workspace = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const styleKey = (params.get('style') || '').toLowerCase();
  const incomingProjectId = Number(location.state?.projectId || 0) || null;
  const selectedStyle = (
    location.state?.selectedStyle && typeof location.state.selectedStyle === 'object'
      ? location.state.selectedStyle
      : null
  );
  const [fetchedStyle, setFetchedStyle] = useState(null);
  const effectiveStyle = fetchedStyle || selectedStyle;
  const styleInfo = useMemo(
    () => resolveStyleContext({ styleKey, style: effectiveStyle }),
    [effectiveStyle, styleKey],
  );
  const selectedStyleId = fetchedStyle?.id ?? selectedStyle?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    setFetchedStyle(null);

    stylesAPI.getAll()
      .then((response) => {
        if (cancelled) return;
        const styles = response.data || [];
        const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        // When a style was passed via navigation, resolve it by name against the live API
        // so we always use the canonical DB id rather than a stale default id.
        if (selectedStyle) {
          const incoming = normalize(selectedStyle.name || selectedStyle.slug || '');
          const nameMatch = styles.find((s) => normalize(s.name) === incoming);
          setFetchedStyle(serializeStyleContext(nameMatch || selectedStyle));
          return;
        }

        const explicitMatch = styles.find((style) => (
          styleSlug(style?.name) === styleKey || String(style?.name || '').toLowerCase() === styleKey
        ));
        const defaultMatch = styles.find((style) => styleSlug(style?.name) === 'modern') || styles[0] || null;
        const resolvedStyle = styleKey ? explicitMatch : defaultMatch;
        setFetchedStyle(resolvedStyle ? serializeStyleContext(resolvedStyle) : null);
      })
      .catch(() => {
        if (!cancelled) setFetchedStyle(selectedStyle ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStyle, styleKey]);

  const projectBudget = Number(location.state?.budget || 0);
  const [intensity, setIntensity] = useState(60);
  const [budget, setBudget] = useState(projectBudget > 0 ? projectBudget : 2500);
  const [lighting, setLighting] = useState('warm');
  const [roomType, setRoomType] = useState(location.state?.roomType || 'Living Room');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewState, setPreviewState] = useState('before');
  const [status, setStatus] = useState('Awaiting upload');
  const [roomImage, setRoomImage] = useState(null);
  const [roomFile, setRoomFile] = useState(null);
  const roomImageRef = useRef(null);
  const roomFileRef = useRef(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isPlanStale, setIsPlanStale] = useState(false);
  const [showSuccessGlow, setShowSuccessGlow] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisProject, setAnalysisProject] = useState(null);
  const [workspaceError, setWorkspaceError] = useState('');
  const [workspaceNotice, setWorkspaceNotice] = useState('');
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [selectedRoomLabel, setSelectedRoomLabel] = useState('');
  const shoppingPlanRef = useRef(null);
  const generateBtnRef = useRef(null);
  const previewComboRef = useRef(null);
  const isMountedRef = useRef(false);
  const lastSuccessfulRunRef = useRef(null);
  const generationTimersRef = useRef({
    textInterval: null,
    completionTimeout: null,
    glowTimeout: null,
    revealRaf: null,
  });
  const budgetTier = budget <= 1500 ? 'low' : budget >= 4500 ? 'high' : 'medium';
  const selectedScore = useMemo(() => {
    if (!analysisResult?.style_scores?.length) return null;
    return analysisResult.style_scores.find((item) => item.style_name === (analysisResult.selected_style?.name || styleInfo.name))
      || analysisResult.style_scores[0];
  }, [analysisResult, styleInfo.name]);
  const workspaceTone = String(styleInfo.key || styleKey || 'default').toLowerCase();
  const intensityGuidance = useMemo(() => {
    if (intensity <= 33) {
      return 'Low intensity keeps recommendations closer to the room you already have.';
    }
    if (intensity >= 67) {
      return 'High intensity pushes bolder style changes and more visible statement pieces.';
    }
    return 'Medium intensity balances practical updates with visible style change.';
  }, [intensity]);
  const generateGuidance = roomImage
    ? 'Generate Plan will review the room, save your plan, and build recommendations plus a shopping plan.'
    : 'Load a sample room or upload your own photo to enable Generate Plan.';
  const budgetGuidance = budget <= 1500
    ? 'Entry-level picks — affordable updates with high impact per dollar.'
    : budget >= 4500
      ? 'Premium range — investment pieces and full-room transformations.'
      : 'Mid-range — solid quality upgrades that move the style forward.';

  const steps = useMemo(() => {
    const uploadDone = !!roomImage;
    const generateDone = !!generatedImage;
    const reviewDone = generateDone && previewState === 'after';

    return [
      { key: 'upload', label: 'Upload Room Photo', done: uploadDone, icon: Upload },
      { key: 'generate', label: 'Generate Plan', done: generateDone, icon: Wand2 },
      { key: 'review', label: 'Review Result', done: reviewDone, icon: CheckCircle2 },
    ];
  }, [generatedImage, previewState, roomImage]);

  const activeStepIndex = useMemo(() => {
    const firstIncomplete = steps.findIndex((step) => !step.done);
    return firstIncomplete === -1 ? steps.length - 1 : firstIncomplete;
  }, [steps]);

  const clearGenerationTimers = useCallback(() => {
    const timers = generationTimersRef.current;
    if (timers.textInterval) {
      window.clearInterval(timers.textInterval);
      timers.textInterval = null;
    }
    if (timers.completionTimeout) {
      window.clearTimeout(timers.completionTimeout);
      timers.completionTimeout = null;
    }
    if (timers.glowTimeout) {
      window.clearTimeout(timers.glowTimeout);
      timers.glowTimeout = null;
    }
    if (timers.revealRaf) {
      window.cancelAnimationFrame(timers.revealRaf);
      timers.revealRaf = null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearGenerationTimers();
    };
  }, [clearGenerationTimers]);

  useEffect(() => {
    clearGenerationTimers();
    setIsGenerating(false);
    setShowSuccessGlow(false);
    setProcessingText('');
    setProcessingLevel(0);
    setStatus('Awaiting upload');
    setPreviewState('before');
    setGeneratedImage(null);
    setIsPlanStale(false);
    setAnalysisResult(null);
    setWorkspaceError('');
    setWorkspaceNotice('');
    setUploadFeedback(null);
    lastSuccessfulRunRef.current = null;
  }, [styleInfo.key, clearGenerationTimers]);

  useEffect(() => {
    if (location.state?.roomType) {
      setRoomType(location.state.roomType);
    }
    if (location.state?.budget) {
      const nextBudget = Number(location.state.budget || 0);
      if (nextBudget > 0) setBudget(nextBudget);
    }
    if (location.state?.photo_url && !roomFileRef.current && !roomImageRef.current) {
      const resolved = resolveWorkspaceProjectImageUrl(location.state.photo_url);
      roomImageRef.current = resolved;
      setRoomImage(resolved);
      setSelectedRoomLabel('Saved room photo');
      setStatus('Project photo loaded');
    }
  }, [location.state]);

  useEffect(() => {
    if (!incomingProjectId) return undefined;

    let cancelled = false;

    projectsAPI.getById(incomingProjectId)
      .then((response) => {
        if (cancelled) return;
        const project = response.data;
        setAnalysisProject(project);
        if (project?.room_type) {
          setRoomType(project.room_type);
        }
        const nextBudget = Number(project?.budget || 0);
        if (Number.isFinite(nextBudget) && nextBudget > 0) {
          setBudget(nextBudget);
        }
        if (!roomFileRef.current && !roomImageRef.current && project?.photo_url) {
          const resolved = resolveWorkspaceProjectImageUrl(project.photo_url);
          roomImageRef.current = resolved;
          setRoomImage(resolved);
          setSelectedRoomLabel(`${project.room_type || 'Room'} project photo`);
          setStatus('Project loaded');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWorkspaceNotice('Could not load the saved project. A new project will be created on the next plan run.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [incomingProjectId]);

  const loadDemo = (url, nextRoomType) => {
    clearGenerationTimers();
    setIsGenerating(false);
    setShowSuccessGlow(false);
    setProcessingText('');
    setProcessingLevel(0);
    setWorkspaceError('');
    setWorkspaceNotice('');
    setUploadFeedback(null);
    setAnalysisResult(null);
    roomImageRef.current = url;
    roomFileRef.current = null;
    setRoomImage(url);
    setRoomFile(null);
    setGeneratedImage(null);
    setSelectedRoomLabel(`${nextRoomType || roomType} sample room`);
    lastSuccessfulRunRef.current = null;
    if (nextRoomType) setRoomType(nextRoomType);
    setPreviewState('before');
    setStatus('Sample room loaded');
  };

  const [processingText, setProcessingText] = useState('');
  const [processingLevel, setProcessingLevel] = useState(0);

  useEffect(() => {
    const prevScene = document.body.dataset.scene;
    const prevStyle = document.body.dataset.style;
    document.body.dataset.scene = 'workspace';
    document.body.dataset.style = String(styleInfo.key || styleKey || '').toLowerCase();

    return () => {
      if (document.body.dataset.scene === 'workspace') {
        if (prevScene) document.body.dataset.scene = prevScene;
        else delete document.body.dataset.scene;
      }
      if (document.body.dataset.style === String(styleInfo.key || styleKey || '').toLowerCase()) {
        if (prevStyle) document.body.dataset.style = prevStyle;
        else delete document.body.dataset.style;
      }
    };
  }, [styleInfo.key, styleKey]);

  const triggerSuccessGlow = useCallback(() => {
    setShowSuccessGlow(true);
    generationTimersRef.current.glowTimeout = window.setTimeout(() => {
      generationTimersRef.current.glowTimeout = null;
      if (!isMountedRef.current) return;
      setShowSuccessGlow(false);
    }, 2000);
  }, []);

  const handleRoomFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ALLOWED_ROOM_UPLOAD_TYPES.has(file.type)) {
      setWorkspaceNotice('');
      setWorkspaceError('Choose a PNG, JPG, or WebP image so Home4U can analyze the room.');
      setStatus('Room load failed');
      return;
    }

    setWorkspaceError('');
    setWorkspaceNotice('');
    setStatus(`Loading ${file.name}...`);

    try {
      const normalizedUpload = await normalizeRoomUpload(file, {
        targetMaxBytes: ROOM_UPLOAD_TARGET_MAX_BYTES,
        maxSourceBytes: ROOM_UPLOAD_SOURCE_MAX_BYTES,
      });
      if (!isMountedRef.current) return;

      clearGenerationTimers();
      setIsGenerating(false);
      setShowSuccessGlow(false);
      setProcessingText('');
      setProcessingLevel(0);
      setAnalysisResult(null);
      roomFileRef.current = normalizedUpload.file;
      roomImageRef.current = normalizedUpload.previewUrl || null;
      setRoomFile(normalizedUpload.file);
      setRoomImage(normalizedUpload.previewUrl || null);
      setSelectedRoomLabel(file.name);
      // Keep the existing concept board visible — mark stale so user knows to re-run
      if (generatedImage) {
        setIsPlanStale(true);
      } else {
        setPreviewState('before');
      }
      setWorkspaceNotice(normalizedUpload.notice || '');
      setStatus('Room loaded');
    } catch (error) {
      if (!isMountedRef.current) return;
      setWorkspaceNotice('');
      if (error?.message === 'SOURCE_TOO_LARGE') {
        setWorkspaceError('Room photos over 40 MB are too large to optimize in the browser.');
      } else if (error?.message === 'CANVAS_UNAVAILABLE') {
        setWorkspaceError('This browser could not optimize the selected image. Try a smaller file.');
      } else if (error?.message === 'OPTIMIZE_FAILED') {
        setWorkspaceError('Home4U could not shrink that image enough. Try a slightly smaller photo.');
      } else {
        setWorkspaceError('Could not read the selected image file. Try a different image.');
      }
      setStatus('Room load failed');
    }
  };

  const handleGenerate = async () => {
    if (isGenerating || !roomImage) return;

    const previousSuccessfulRun = lastSuccessfulRunRef.current;
    let stage = 'create-project';

    clearGenerationTimers();
    setIsGenerating(true);
    setWorkspaceError('');
    setWorkspaceNotice('');
    setAnalysisResult(null);
    setGeneratedImage(null);
    setIsPlanStale(false);
    setShowSuccessGlow(false);
    setPreviewState('processing');
    setProcessingLevel(0.08);
    setProcessingText('Preparing your saved plan...');
    setStatus('Syncing project...');

    try {
      let project = analysisProject;
      if (!project) {
        stage = 'create-project';
        const createdProject = await projectsAPI.create(roomType);
        project = createdProject.data;
      }

      const needsProjectUpdate = (
        project.room_type !== roomType
        || Math.round(Number(project.budget || 0)) !== budget
      );
      if (needsProjectUpdate) {
        stage = 'update-project';
        setStatus('Updating project brief...');
        setProcessingText('Saving room type and budget constraints...');
        setProcessingLevel(0.18);
        const updatedProject = await projectsAPI.update(project.id, {
          room_type: roomType,
          budget: budget,
        });
        project = updatedProject.data;
      }

      setAnalysisProject(project);

      if (roomFile) {
        stage = 'upload-photo';
        setStatus('Uploading room photo...');
        setProcessingText('Saving the selected room photo...');
        setProcessingLevel(0.32);
        const photoResponse = await projectsAPI.uploadPhoto(project.id, roomFile);
        project = photoResponse.data?.project || photoResponse.data;
        setUploadFeedback(photoResponse.data?.upload_feedback || null);
        if (photoResponse.data?.upload_feedback?.summary) {
          setWorkspaceNotice(photoResponse.data.upload_feedback.summary);
        }
        setAnalysisProject(project);
      }

      stage = 'extract-signals';
      setStatus('Extracting room signals...');
      setProcessingText('Reading light, color, and layout cues from the room image...');
      setProcessingLevel(0.5);
      const imageProfile = roomFile ? await extractImageProfile(roomImage) : null;
      const detectedTags = inferDetectedTags(imageProfile);

      stage = 'analyze-room';
      setStatus('Calculating style scores...');
      setProcessingText(`Comparing the room with ${styleInfo.name} and nearby style directions...`);
      setProcessingLevel(0.72);
      const analysisResponse = await projectsAPI.analyze(project.id, {
        style_id: selectedStyleId,
        style_slug: styleInfo.key || styleKey,
        style_name: styleInfo.name,
        room_type: roomType,
        intensity,
        lighting,
        budget_tier: budgetTier,
        image_profile: imageProfile,
        detected_tags: detectedTags,
      });
      const nextAnalysis = analysisResponse.data;
      setAnalysisResult(nextAnalysis);
      setAnalysisProject(nextAnalysis.project);

      if (!isMountedRef.current) return;
      setGeneratedImage(roomImage);
      setStatus('Analysis ready');
      setProcessingText('Plan generated');
      setProcessingLevel(1);
      setPreviewState('after');
      setIsPlanStale(false);
      lastSuccessfulRunRef.current = {
        analysisResult: nextAnalysis,
        analysisProject: nextAnalysis.project,
        generatedImage: roomImage,
      };
      triggerSuccessGlow();
    } catch (error) {
      const recoveredPreviousPlan = Boolean(previousSuccessfulRun?.analysisResult && previousSuccessfulRun?.generatedImage);
      if (recoveredPreviousPlan) {
        setAnalysisResult(previousSuccessfulRun.analysisResult);
        setAnalysisProject(previousSuccessfulRun.analysisProject || null);
        setGeneratedImage(previousSuccessfulRun.generatedImage);
        setPreviewState('after');
        setStatus('Previous plan restored');
        setWorkspaceNotice('Your previous plan is still available while you retry.');
      } else {
        setStatus('Analysis failed');
        setPreviewState('before');
      }
      const message = formatWorkspaceRequestError(error, stage);
      setWorkspaceError(recoveredPreviousPlan ? `${message} Previous plan restored while you retry.` : message);
      setProcessingText('');
      setProcessingLevel(0);
    } finally {
      if (isMountedRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleMagneticMove = (e) => {
    if (!generateBtnRef.current || isGenerating || !roomImage) return;
    const btn = generateBtnRef.current;
    const rect = btn.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < 100) {
      const moveX = deltaX * 0.2;
      const moveY = deltaY * 0.2;
      btn.style.transform = `translate(${moveX}px, ${moveY}px) translateY(-1px)`;
    } else {
      btn.style.transform = '';
    }
  };

  const handleMagneticLeave = () => {
    if (generateBtnRef.current) {
      generateBtnRef.current.style.transform = '';
    }
  };

  return (
    <div
      className={`workspace ${showSuccessGlow ? 'success-glow-active' : ''}`}
      data-style={workspaceTone}
      onMouseMove={handleMagneticMove}
    >
      <div className="workspace-atmosphere" aria-hidden="true">
        <span className="workspace-orb workspace-orb-a"></span>
        <span className="workspace-orb workspace-orb-b"></span>
        <span className="workspace-orb workspace-orb-c"></span>
      </div>
      <div className="page-shell workspace-shell">
        <header className="workspace-header">
          <div className="workspace-header-copy">
            <p className="workspace-eyebrow">
              Design Workspace <span className="badge demo-badge">Studio Live</span>
            </p>
            <h1>{styleInfo.name}</h1>
            <p className="workspace-sub">
              {styleInfo.description} Upload a room, set your preferences, and generate a saved plan with tailored recommendations.
            </p>
            <div className="workspace-hero-metrics studio-hero-metrics" aria-label="Workspace overview">
              <div className="hero-metric-card studio-hero-card">
                <span className="hero-metric-label studio-hero-label">Budget Rail</span>
                <strong className="studio-hero-value">${budget.toLocaleString()}</strong>
              </div>
              <div className="hero-metric-card studio-hero-card">
                <span className="hero-metric-label studio-hero-label">Lighting Bias</span>
                <strong className="studio-hero-value">{lighting === 'warm' ? 'Warm ambient' : 'Cool focus'}</strong>
              </div>
              <div className="hero-metric-card studio-hero-card">
                <span className="hero-metric-label studio-hero-label">System State</span>
                <strong className="studio-hero-value">{analysisResult ? `${Math.round(selectedScore?.score_value || 0)}% aligned` : 'Ready to scan'}</strong>
              </div>
            </div>
          </div>
          <button type="button" className="back-btn studio-btn studio-btn--ghost" onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
        </header>

        <main className="workspace-main">
        <div className="design-timeline" aria-label="Design progress">
          {steps.map((step, idx) => (
            <div key={step.key} className="timeline-step" aria-current={idx === activeStepIndex ? 'step' : undefined}>
              <div
                className={`timeline-node ${step.done ? 'done' : ''} ${idx === activeStepIndex ? 'active' : ''}`}
                aria-label={`${step.label}${step.done ? ' complete' : idx === activeStepIndex ? ' current' : ''}`}
              >
                <step.icon size={14} className="step-icon" />
              </div>
              <span className="timeline-label">{step.label}</span>
              {idx < steps.length - 1 && <div className="timeline-connector" aria-hidden="true" />}
            </div>
          ))}
        </div>

        <section className={`workspace-canvas state-${previewState}`}>
          <div className="canvas-header">
            <span>Room Review</span>
            <span className="status">{status}</span>
          </div>
          <div className="canvas-body">
            <div
              ref={previewComboRef}
              className={`preview-combo ${previewState === 'processing' ? 'is-processing' : ''}`}
            >
              {previewState === 'processing' && (
                <div className="processing-overlay" style={{ '--proc': processingLevel }}>
                  <div className="processing-scanner"></div>
                  <div className="processing-grid"></div>
                  <div className="processing-content">
                    <Sparkles className="processing-icon" size={32} />
                    <span className="processing-text">{processingText}</span>
                    <div className="processing-bar"><div className="processing-bar-fill"></div></div>
                  </div>
                </div>
              )}
              {previewState !== 'processing' && generatedImage && analysisResult && (
                <div
                  className="concept-split"
                  data-tone={workspaceTone}
                  role="region"
                  aria-label="Before and after concept preview"
                >
                  {/* Before panel */}
                  <div className="concept-panel concept-panel--before">
                    <img src={roomImage} alt="Before" className="concept-img" />
                    <div className="concept-before-vignette" aria-hidden="true" />
                    <span className="concept-badge concept-badge--before">Before</span>
                    <div className="concept-before-label">Current State</div>
                  </div>

                  {/* Center divider */}
                  <div className="concept-divider" aria-hidden="true">
                    <div className="concept-divider-line" />
                    <div className="concept-divider-knob">⟷</div>
                  </div>

                  {/* After panel */}
                  <div className="concept-panel concept-panel--after">
                    <img src={roomImage} alt="After" className="concept-img concept-img--after" />
                    <div className={`concept-grade concept-grade--${workspaceTone}`} aria-hidden="true" />
                    <div className={`concept-grade-secondary concept-grade-secondary--${workspaceTone}`} aria-hidden="true" />
                    <span className="concept-badge concept-badge--after">After</span>
                    <div className="concept-info-overlay">
                      <div className="concept-info-top">
                        <span className="concept-style-name">{styleInfo.name}</span>
                        {selectedScore && (
                          <span className="concept-score-badge">
                            {Math.round(selectedScore.score_value || 0)}% Style Match
                          </span>
                        )}
                      </div>
                      {selectedScore && (
                        <>
                          <div className="concept-score-bar">
                            <div
                              className="concept-score-bar-fill"
                              style={{
                                width: `${Math.round(selectedScore.score_value || 0)}%`,
                                background: (selectedScore.score_value || 0) >= 70
                                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                  : (selectedScore.score_value || 0) >= 45
                                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(90deg, #f97316, #ea580c)',
                              }}
                            />
                          </div>
                          {analysisResult?.style_scores?.length > 1 && (
                            <div className="concept-style-comparison">
                              {analysisResult.style_scores.slice(0, 3).map((s) => (
                                <span
                                  key={s.style_id}
                                  className={`concept-style-chip${s.style_id === selectedScore.style_id ? ' concept-style-chip--active' : ''}`}
                                >
                                  {s.style_name} {Math.round(s.score_value || 0)}%
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {(analysisResult.matching_aspects?.length > 0 || analysisResult.gap_aspects?.length > 0) && (
                        <div className="concept-pills">
                          {analysisResult.matching_aspects?.slice(0, 2).map((aspect) => (
                            <span key={aspect} className="concept-pill concept-pill--match">✓ {aspect}</span>
                          ))}
                          {analysisResult.gap_aspects?.slice(0, 2).map((aspect) => (
                            <span key={aspect} className="concept-pill concept-pill--gap">↑ {aspect}</span>
                          ))}
                        </div>
                      )}
                      {(analysisResult.recommendations?.[0]?.description || analysisResult.shopping_plan?.[0]?.item_name) && (
                        <div className="concept-top-move">
                          <span className="concept-top-move-label">Top move</span>
                          <span className="concept-top-move-text">
                            {analysisResult.recommendations?.[0]?.description || analysisResult.shopping_plan?.[0]?.item_name}
                          </span>
                        </div>
                      )}
                    </div>
                    {isPlanStale && (
                      <div className="stale-plan-badge">New photo uploaded — re-run Generate Plan to update</div>
                    )}
                  </div>
                </div>
              )}
              {previewState !== 'processing' && !generatedImage && (
                <div className="preview before">
                  {roomImage ? (
                    <img src={roomImage} alt="Uploaded room" className="preview-img" />
                  ) : (
                    <span className="preview-placeholder">Upload a room photo or load a sample room to generate your plan preview.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="workspace-controls">
          <div className="control-group">
            <div className="control-head">
              <span>Selected Style</span>
              <span className="pill">{styleInfo.name || styleKey || 'custom'}</span>
            </div>
            <p className="control-sub">Set the room details below, then use a sample room or upload your own photo to generate a saved design plan.</p>
          </div>

          <div className="control-group">
            <label htmlFor="room-type">Room Type</label>
            <select id="room-type" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
              {ROOM_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <p className="control-sub compact">This helps Home4U prioritize the right layout, furniture, and styling moves for the room.</p>
          </div>

          <div className="control-group">
            <label htmlFor="intensity">Style Intensity</label>
            <input
              id="intensity"
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
            />
            <div className="slider-meta">
              <span>Subtle</span>
              <span>{intensity}%</span>
              <span>Bold</span>
            </div>
            <p className="control-sub compact">{intensityGuidance}</p>
          </div>

          <div className="control-group">
            <label htmlFor="budget">Budget</label>
            <input
              id="budget"
              type="range"
              min="200"
              max="15000"
              step="100"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <div className="slider-meta">
              <span>$200</span>
              <span className="budget-amount">${budget.toLocaleString()}</span>
              <span>$15k</span>
            </div>
            <p className="control-sub compact">{budgetGuidance}</p>
          </div>

          <div className="control-group toggle-group">
            <label>Lighting Preference</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle ${lighting === 'warm' ? 'active' : ''}`}
                onClick={() => setLighting('warm')}
                aria-pressed={lighting === 'warm'}
              >
                Warm
              </button>
              <button
                type="button"
                className={`toggle ${lighting === 'cool' ? 'active' : ''}`}
                onClick={() => setLighting('cool')}
                aria-pressed={lighting === 'cool'}
              >
                Cool
              </button>
            </div>
            <p className="control-sub compact">Choose the mood you want the finished room to support, not necessarily the current lighting in the photo.</p>
          </div>

          <div className="control-group actions">
            <div className="demo-rooms-section">
              <span className="demo-rooms-label">Load Sample Room</span>
              <p className="control-sub compact">Choose one room source: use a sample room to try the flow quickly, or upload your own photo for a personalized plan.</p>
              <div className="demo-rooms-buttons">
                <button type="button" className="demo-try-btn" onClick={() => loadDemo('https://images.unsplash.com/photo-1598928506311-c55dd12966c4?auto=format&fit=crop&q=80&w=800', 'Living Room')}>Living Room</button>
                <button type="button" className="demo-try-btn" onClick={() => loadDemo('https://images.unsplash.com/photo-15569101031-c02745a828?auto=format&fit=crop&q=80&w=800', 'Kitchen')}>Kitchen</button>
              </div>
              <p className="control-sub compact">Sample rooms are quick demos, but Home4U still saves the resulting plan so you can revisit it later.</p>
            </div>
            {selectedRoomLabel && (
              <p className="control-sub compact">Loaded asset: {selectedRoomLabel}</p>
            )}
            <label className="secondary upload-btn">
              Upload Room Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleRoomFileChange}
                hidden
              />
            </label>
            <p className="control-sub compact">PNG, JPG, or WebP. Large images are optimized automatically before upload when possible.</p>
            <button 
              type="button"
              ref={generateBtnRef}
              className="primary generate-btn" 
              onClick={handleGenerate} 
              disabled={isGenerating || !roomImage}
              onMouseLeave={handleMagneticLeave}
            >
              {isGenerating ? 'Syncing…' : 'Generate Plan'}
            </button>
            <p className="control-sub compact">{generateGuidance}</p>
            <button
              type="button"
              className="secondary-link-btn"
              onClick={() => shoppingPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              disabled={!analysisResult?.shopping_plan?.length}
              aria-disabled={!analysisResult?.shopping_plan?.length}
              title={analysisResult?.shopping_plan?.length ? 'Jump to the shopping plan' : 'Finish a plan first to unlock the shopping plan'}
            >
              {analysisResult?.shopping_plan?.length ? 'Open Shopping Plan' : 'Unlock Shopping After Planning'}
            </button>
            {(workspaceError || workspaceNotice) && (
              <div className="workspace-feedback">
                {workspaceError && (
                  <>
                    <p className="workspace-error" role="alert">{workspaceError}</p>
                    {roomImage && (
                      <button
                        type="button"
                        className="secondary-link-btn workspace-retry-btn"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                      >
                        Retry Generate Plan
                      </button>
                    )}
                  </>
                )}
                {workspaceNotice && (
                  <p className="workspace-notice" role="status" aria-live="polite">{workspaceNotice}</p>
                )}
              </div>
            )}
            {uploadFeedback && (
              <div className="workspace-upload-feedback" role="status" aria-live="polite">
                <div className="control-head">
                  <span>Upload AI Feedback</span>
                  <span className={`metric-pill upload-confidence-${uploadFeedback.confidence_label}`}>
                    {Math.round((uploadFeedback.confidence_score || 0) * 100)}% {uploadFeedback.confidence_label}
                  </span>
                </div>
                <p className="control-sub">{uploadFeedback.summary}</p>
                {!!uploadFeedback.issues?.length && (
                  <ul className="upload-feedback-list">
                    {uploadFeedback.issues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
                {!!uploadFeedback.suggestions?.length && (
                  <ul className="upload-feedback-list suggestions">
                    {uploadFeedback.suggestions.slice(0, 2).map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="control-group">
            <div className="control-head">
              <span>Saved Plan</span>
              <span className="metric-pill">{analysisProject ? `#${analysisProject.id}` : 'Ready to save'}</span>
            </div>
            <p className="control-sub">
              {analysisProject
                ? `Your room settings and latest plan are saved to project #${analysisProject.id}.`
                : 'Your first successful plan will be saved automatically so you can reopen it later.'}
            </p>
            {analysisProject && (
              <button type="button" className="secondary-link-btn" onClick={() => navigate(`/project/${analysisProject.id}`)}>
                Open Project Plan
              </button>
            )}
          </div>

          {analysisResult && (
            <div className="control-group analysis-group">
              <div className="control-head">
                <span>Analysis Snapshot</span>
                <div className="analysis-head-right">
                  {analysisResult.selected_style?.name && (
                    <span className="metric-pill style-pill-result">{analysisResult.selected_style.name}</span>
                  )}
                  <span className="metric-pill">{Math.round(selectedScore?.score_value || 0)}% Match</span>
                </div>
              </div>
              <p className="control-sub">{analysisResult.summary}</p>
              {analysisResult.image_profile?.dominant_hex && (
                <div className="analysis-chip-row studio-chip-row">
                  <span className="analysis-chip studio-chip">Dominant tone {analysisResult.image_profile.dominant_hex}</span>
                  <span className="analysis-chip studio-chip">Brightness {Math.round((analysisResult.image_profile.average_brightness || 0) * 100)}%</span>
                </div>
              )}
              {analysisResult.scan_assessment && (
                <div className="analysis-chip-row studio-chip-row">
                  <span className={`analysis-chip studio-chip scan-confidence-chip scan-confidence-${analysisResult.scan_assessment.confidence_label}`}>
                    {{ high: 'Strong scan quality', medium: 'Good scan quality', low: 'Limited scan data' }[analysisResult.scan_assessment.confidence_label] ?? `Scan ${analysisResult.scan_assessment.confidence_label}`}
                  </span>
                </div>
              )}
              {!!analysisResult.suggested_tags?.length && (
                <div className="analysis-chip-row studio-chip-row">
                  {analysisResult.suggested_tags.slice(0, 4).map((tag) => (
                    <span key={tag.id} className="analysis-chip studio-chip">{tag.name}</span>
                  ))}
                </div>
              )}

              {(!!analysisResult.matching_aspects?.length || !!analysisResult.gap_aspects?.length) && (
                <div className="analysis-match-gap">
                  {!!analysisResult.matching_aspects?.length && (
                    <div className="analysis-match-section">
                      <p className="analysis-match-label match">What we see in your photo</p>
                      <ul className="analysis-match-list">
                        {analysisResult.matching_aspects.map((aspect, i) => (
                          <li key={i} className="analysis-match-item match">{aspect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!!analysisResult.gap_aspects?.length && (
                    <div className="analysis-match-section">
                      <p className="analysis-match-label gap">Style gaps to bridge</p>
                      <ul className="analysis-match-list">
                        {analysisResult.gap_aspects.map((aspect, i) => (
                          <li key={i} className="analysis-match-item gap">{aspect}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {analysisResult.room_state && (
                <div className="room-state-block">
                  <div className="analysis-chip-row studio-chip-row">
                    <span className="analysis-chip studio-chip">
                      {{ high: 'Spacious', medium: 'Open layout', low: 'Compact' }[analysisResult.room_state.openness] ?? analysisResult.room_state.openness}
                    </span>
                    <span className="analysis-chip studio-chip">
                      {{ low: 'Tidy', medium: 'Some clutter', high: 'Busy' }[analysisResult.room_state.clutter_level] ?? analysisResult.room_state.clutter_level}
                    </span>
                    <span className="analysis-chip studio-chip">
                      {{ low: 'Soft tones', medium: 'Balanced tones', high: 'Bold contrast' }[analysisResult.room_state.contrast_level] ?? analysisResult.room_state.contrast_level}
                    </span>
                  </div>
                  {analysisResult.room_state.cues?.[0] && (
                    <p className="control-sub compact">{analysisResult.room_state.cues[0]}</p>
                  )}
                </div>
              )}
              {!!analysisResult.recommendations?.length && (
                <div className="analysis-list">
                  {analysisResult.selected_style?.name && (
                    <p className="control-sub compact analysis-style-label">
                      Recommendations for {analysisResult.selected_style.name}
                    </p>
                  )}
                  {analysisResult.recommendations.slice(0, 3).map((recommendation) => (
                    <div key={recommendation.id} className="analysis-list-item">
                      <span className="analysis-list-score">{recommendation.priority_score.toFixed(1)}</span>
                      <div>
                        <p>{recommendation.description}</p>
                        {recommendation.reason_summary && (
                          <p className="analysis-rec-reason">{recommendation.reason_summary}</p>
                        )}
                        <span>${Number(recommendation.estimated_cost).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!!analysisResult.shopping_plan?.length && (
                <div ref={shoppingPlanRef} className="shopping-plan">
                  <div className="control-head">
                    <span>Shopping Plan</span>
                    <span className="metric-pill">
                      ${analysisResult.shopping_plan.reduce((sum, item) => sum + Number(item.estimated_cost || 0), 0).toLocaleString()}
                    </span>
                  </div>
                  <p className="control-sub">
                    Start with these purchases to move the room toward the {analysisResult.selected_style?.name || styleInfo.name} look while staying near the selected budget.
                  </p>
                  <div className="shopping-plan-list">
                    {analysisResult.shopping_plan.map((item) => (
                      <article key={item.key} className="shopping-plan-card">
                        <div className="shopping-plan-topline">
                          <span className="shopping-plan-step">{item.priority_label}</span>
                          <span className="shopping-plan-category">{item.category}</span>
                        </div>
                        <h4>{item.label}</h4>
                        <p>{item.purchase_reason}</p>
                        <div className="shopping-plan-meta">
                          <span>{item.room_zone}</span>
                          <span>${Number(item.estimated_cost).toLocaleString()}</span>
                          <span>{Math.round((item.budget_share || 0) * 100)}% of budget</span>
                        </div>
                        <div className="shopping-plan-query">
                          <span>Look for</span>
                          <strong>{item.search_query}</strong>
                        </div>
                        {!!item.products?.length && (
                          <div className="shopping-product-grid">
                            {item.products.slice(0, 2).map((product) => (
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
                                    <span>${Number(product.estimated_cost).toLocaleString()}</span>
                                  </div>
                                  <a
                                    href={product.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="shopping-product-link"
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
                              Search {source.retailer}
                            </a>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}
              {analysisProject && (
                <button
                  type="button"
                  className="secondary-link-btn"
                  onClick={() => navigate(`/project/${analysisProject.id}`)}
                >
                  View Saved Plan
                </button>
              )}
            </div>
          )}
        </aside>
        </main>
      </div>
    </div>
  );
};

export default Workspace;
