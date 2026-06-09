import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  storyRooms,
  storyHotspots,
  storyChapters,
} from './data';
import { renderRoomIllustration } from './visuals';
import useTourAudio from './useTourAudio';
import useTourKeyboard from './useTourKeyboard';
import useTourCamera from './useTourCamera';
import useTourRoomInteractions from './useTourRoomInteractions';
import useTourTransitions from './useTourTransitions';
import { createInitialTourState, tourStateReducer } from './useTourStateReducer';
import useTourPreferences from './useTourPreferences';
import useTourViewState from './useTourViewState';

const useTourFlow = ({ navigate }) => {
  const [tourState, dispatch] = useReducer(tourStateReducer, undefined, createInitialTourState);
  const {
    phase,
    activeIndex,
    selectedHotspotId,
    visitedHotspots,
    focusCue,
    hotspotTransitioning,
    doorZooming,
    isEnteringHome,
    roomZooming,
    phaseTransitioning,
    blueprintIntroTick,
    outsideChapter,
    storyProgress,
    isGeneratingPlan,
    transformSweepTick,
    visitedRooms,
    showBookingModal,
    bookingSubmitted,
    bookingSubmitting,
    bookingSubmitError,
    bookingFieldErrors,
    bookingForm,
    showFullDetails,
    showProControls,
    introPassed,
    introRevealing,
    activeSection,
    autoOpenedSection,
    showOrbitHint,
    hasInteracted,
    userInterrupted,
  } = tourState;

  const setPhase = useCallback((updater) => {
    dispatch({ type: 'SET_PHASE', updater });
  }, []);
  const setSelectedHotspotId = useCallback((updater) => {
    dispatch({ type: 'SET_SELECTED_HOTSPOT_ID', updater });
  }, []);
  const setVisitedHotspots = useCallback((updater) => {
    dispatch({ type: 'SET_VISITED_HOTSPOTS', updater });
  }, []);
  const setFocusCue = useCallback((updater) => {
    dispatch({ type: 'SET_FOCUS_CUE', updater });
  }, []);
  const setHotspotTransitioning = useCallback((updater) => {
    dispatch({ type: 'SET_HOTSPOT_TRANSITIONING', updater });
  }, []);
  const setIsEnteringHome = useCallback((updater) => {
    dispatch({ type: 'SET_IS_ENTERING_HOME', updater });
  }, []);
  const setRoomZooming = useCallback((updater) => {
    dispatch({ type: 'SET_ROOM_ZOOMING', updater });
  }, []);
  const setPhaseTransitioning = useCallback((updater) => {
    dispatch({ type: 'SET_PHASE_TRANSITIONING', updater });
  }, []);
  const setOutsideChapter = useCallback((updater) => {
    dispatch({ type: 'SET_OUTSIDE_CHAPTER', updater });
  }, []);
  const setStoryProgress = useCallback((updater) => {
    dispatch({ type: 'SET_STORY_PROGRESS', updater });
  }, []);
  const setIsGeneratingPlan = useCallback((updater) => {
    dispatch({ type: 'SET_IS_GENERATING_PLAN', updater });
  }, []);
  const setTransformSweepTick = useCallback((updater) => {
    dispatch({ type: 'SET_TRANSFORM_SWEEP_TICK', updater });
  }, []);
  const setShowBookingModal = useCallback((updater) => {
    dispatch({ type: 'SET_SHOW_BOOKING_MODAL', updater });
  }, []);
  const setBookingSubmitted = useCallback((updater) => {
    dispatch({ type: 'SET_BOOKING_SUBMITTED', updater });
  }, []);
  const setBookingSubmitting = useCallback((updater) => {
    dispatch({ type: 'SET_BOOKING_SUBMITTING', updater });
  }, []);
  const setBookingSubmitError = useCallback((updater) => {
    dispatch({ type: 'SET_BOOKING_SUBMIT_ERROR', updater });
  }, []);
  const setBookingFieldErrors = useCallback((updater) => {
    dispatch({ type: 'SET_BOOKING_FIELD_ERRORS', updater });
  }, []);
  const setBookingForm = useCallback((updater) => {
    dispatch({ type: 'SET_BOOKING_FORM', updater });
  }, []);
  const setShowFullDetails = useCallback((updater) => {
    dispatch({ type: 'SET_SHOW_FULL_DETAILS', updater });
  }, []);
  const setShowProControls = useCallback((updater) => {
    dispatch({ type: 'SET_SHOW_PRO_CONTROLS', updater });
  }, []);
  const setIntroPassed = useCallback((updater) => {
    dispatch({ type: 'SET_INTRO_PASSED', updater });
  }, []);
  const setIntroRevealing = useCallback((updater) => {
    dispatch({ type: 'SET_INTRO_REVEALING', updater });
  }, []);
  const setActiveSection = useCallback((updater) => {
    dispatch({ type: 'SET_ACTIVE_SECTION', updater });
  }, []);
  const setAutoOpenedSection = useCallback((updater) => {
    dispatch({ type: 'SET_AUTO_OPENED_SECTION', updater });
  }, []);
  const setShowOrbitHint = useCallback((updater) => {
    dispatch({ type: 'SET_SHOW_ORBIT_HINT', updater });
  }, []);
  const setHasInteracted = useCallback((updater) => {
    dispatch({ type: 'SET_HAS_INTERACTED', updater });
  }, []);
  const setUserInterrupted = useCallback((updater) => {
    dispatch({ type: 'SET_USER_INTERRUPTED', updater });
  }, []);

  const blueprintEntered = phase === 'blueprint';
  const blueprintMounted = true;
  const {
    hoveredRoomId,
    setHoveredRoomId,
    pathTarget: _pathTarget,
    setPathTarget,
    isDragging,
    setIsDragging,
    chapterChangeKey,
    setChapterChangeKey,
  } = useTourViewState();
  const {
    themeMode,
    setThemeMode,
    materialMode,
    setMaterialMode,
    narrativeEnabled,
    setNarrativeEnabled,
    soundEnabled,
    setSoundEnabled,
    ambientMotion,
    setAmbientMotion,
    resetPreferences,
  } = useTourPreferences();

  const detailScrollRef = useRef(null);
  const detailBodyRef = useRef(null);
  const introTimerRef = useRef(null);
  const orbitHintTimerRef = useRef(null);
  const userInterruptedTimerRef = useRef(null);
  const userInterruptedRef = useRef(false);
  const phaseRef = useRef(phase);

  const activeRoom = storyRooms[activeIndex];
  const roomChapterIndex = useMemo(() => {
    const index = storyChapters.findIndex((chapter) => chapter.id === activeRoom.id);
    return index === -1 ? 0 : index;
  }, [activeRoom.id]);

  const currentChapter = phase === 'room'
    ? roomChapterIndex
    : phase === 'blueprint'
      ? 1
      : isEnteringHome
        ? outsideChapter
        : 0;

  const activeStoryChapter = storyChapters[currentChapter] || storyChapters[0];
  const activeFramework = useMemo(
    () =>
      activeStoryChapter.framework || {
        problem: activeRoom.problem,
        method: activeRoom.method,
        proof: activeRoom.proof,
        nextStep: activeRoom.nextStep,
      },
    [activeStoryChapter.framework, activeRoom.problem, activeRoom.method, activeRoom.proof, activeRoom.nextStep],
  );

  const roomSummary = activeRoom.summary || {
    purpose: activeRoom.promise,
    features: [],
    takeaway: activeRoom.proof,
  };

  const hotspots = storyHotspots[activeRoom.id] || [];
  const selectedHotspot = hotspots.find((spot) => spot.id === selectedHotspotId) || null;
  const visitedCount = visitedHotspots[activeRoom.id]?.size || 0;
  const roomComplete = hotspots.length > 0 && visitedCount === hotspots.length;

  const phaseSteps = useMemo(
    () => [
      { id: 'outside', label: 'Intake' },
      { id: 'blueprint', label: 'Priority Map' },
      { id: 'room', label: 'Review' },
    ],
    [],
  );
  const currentPhaseStep = phaseSteps.findIndex((step) => step.id === phase);
  const currentPhaseLabel = phaseSteps[currentPhaseStep]?.label || 'Overview';

  const hasPrevRoom = activeIndex > 0;
  const hasNextRoom = activeIndex < storyRooms.length - 1;
  const dockBackLabel = phase === 'room' ? 'Previous Room' : phase === 'blueprint' ? 'Back to Overview' : 'Back to Dashboard';
  const dockPrimaryLabel = phase === 'room' ? 'Next Room' : phase === 'blueprint' ? 'Open Selected Room' : 'Start Tour';
  const dockBackDisabled = phase === 'room' ? !hasPrevRoom : phaseTransitioning || isEnteringHome;
  const dockPrimaryDisabled = phase === 'room'
    ? !hasNextRoom
    : phase === 'blueprint'
      ? phaseTransitioning
      : isEnteringHome || phaseTransitioning;
  const dockOverviewDisabled = phase === 'blueprint' || phaseTransitioning || isEnteringHome;

  const insightsTotal = hotspots.length;
  const insightsValue = Math.min(visitedCount, Math.max(insightsTotal, 1));
  const insightsLabel = insightsTotal
    ? `${visitedCount}/${insightsTotal} insights viewed`
    : 'No insights available';

  const roomIllustration = useMemo(() => renderRoomIllustration(activeRoom.id), [activeRoom.id]);
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 6 + ((i * 13) % 88),
        y: 8 + ((i * 17) % 82),
        d: 4 + (i % 5),
      })),
    [],
  );

  const narrativeLine = useMemo(() => {
    if (!narrativeEnabled) return null;
    return activeStoryChapter.narrationText.replace(/^[A-Za-z]+:\s*/, '');
  }, [activeStoryChapter, narrativeEnabled]);

  const revealEvidence = activeRoom.id !== 'atrium';
  const revealOutcome = ['transform', 'proof', 'action'].includes(activeRoom.id);
  const revealDeepControls = ['solution', 'transform', 'proof', 'action'].includes(activeRoom.id);

  const storyMetric = useMemo(() => {
    const m = activeRoom.metric;
    const progress = storyProgress / 100;
    return Math.round(m.before + (m.after - m.before) * progress);
  }, [activeRoom.metric, storyProgress]);

  const achievements = useMemo(() => {
    const roomCount = visitedRooms.size;
    const hotspotCount = Object.values(visitedHotspots).reduce((sum, set) => sum + set.size, 0);
    return [
      { id: 'door', label: 'Tour Started', unlocked: phase !== 'outside' },
      { id: 'chapters', label: '3 Rooms Reviewed', unlocked: roomCount >= 3 },
      { id: 'story', label: 'All Rooms Reviewed', unlocked: roomCount >= storyRooms.length },
      { id: 'insights', label: '6 Insights Viewed', unlocked: hotspotCount >= 6 },
    ];
  }, [phase, visitedRooms, visitedHotspots]);

  const frameworkPanels = useMemo(
    () => [
      { key: 'problem', label: 'Problem', content: activeFramework.problem },
      { key: 'method', label: 'Method', content: activeFramework.method },
      { key: 'proof', label: 'Proof', content: activeFramework.proof },
      { key: 'nextStep', label: 'Next Step', content: activeFramework.nextStep },
    ],
    [activeFramework],
  );

  const clearUserInterruptedTimer = useCallback(() => {
    if (userInterruptedTimerRef.current) {
      window.clearTimeout(userInterruptedTimerRef.current);
      userInterruptedTimerRef.current = null;
    }
  }, []);

  const clearOrbitHintTimer = useCallback(() => {
    if (orbitHintTimerRef.current) {
      window.clearTimeout(orbitHintTimerRef.current);
      orbitHintTimerRef.current = null;
    }
  }, []);

  const clearIntroRevealTimer = useCallback(() => {
    if (introTimerRef.current) {
      window.clearTimeout(introTimerRef.current);
      introTimerRef.current = null;
    }
  }, []);

  const syncActiveSectionFromProgress = useCallback((progress) => {
    if (phaseRef.current !== 'room' || userInterruptedRef.current) return;

    if (progress >= 0.8) {
      setActiveSection((current) => {
        if (current !== 'proof') {
          setAutoOpenedSection('proof');
          return 'proof';
        }
        return current;
      });
      return;
    }

    if (progress >= 0.4) {
      setActiveSection((current) => {
        if (current !== 'method') {
          setAutoOpenedSection('method');
          return 'method';
        }
        return current;
      });
      return;
    }

    setActiveSection((current) => {
      if (current !== 'problem') {
        setAutoOpenedSection('problem');
        return 'problem';
      }
      return current;
    });
  }, [setActiveSection, setAutoOpenedSection]);

  const {
    nudgeRef,
    lookAtOffsetRef,
    roomShellRef,
    roomAtmoRef,
    stopCameraAnimation,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useTourCamera({
    phase,
    currentChapter,
    isDragging,
    setIsDragging,
    setHasInteracted,
    setShowOrbitHint,
    syncActiveSectionFromProgress,
  });

  const beginRoomIntroReveal = useCallback(() => {
    setIntroPassed(false);
    setIntroRevealing(true);

    if (detailScrollRef.current) {
      detailScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
      detailScrollRef.current.style.setProperty('--scroll-y', '0');
    }

    clearIntroRevealTimer();
    introTimerRef.current = window.setTimeout(() => {
      setIntroRevealing(false);
      introTimerRef.current = null;
    }, 520);
  }, [clearIntroRevealTimer, setIntroPassed, setIntroRevealing]);

  const showOrbitHintPulse = useCallback(() => {
    setShowOrbitHint(true);
    clearOrbitHintTimer();
    orbitHintTimerRef.current = window.setTimeout(() => {
      setShowOrbitHint(false);
      orbitHintTimerRef.current = null;
    }, 4800);
  }, [clearOrbitHintTimer, setShowOrbitHint]);

  const resetRoomChapterState = useCallback(() => {
    setSelectedHotspotId(null);
    setHotspotTransitioning(false);
    nudgeRef.current = { x: 0, y: 0 };
    lookAtOffsetRef.current = { x: 0, y: 0 };
    setShowFullDetails(false);
    setActiveSection('problem');
    setChapterChangeKey((prev) => prev + 1);
    setAutoOpenedSection(null);
    setUserInterrupted(false);
    clearUserInterruptedTimer();
    beginRoomIntroReveal();
    showOrbitHintPulse();
  }, [
    beginRoomIntroReveal,
    clearUserInterruptedTimer,
    lookAtOffsetRef,
    nudgeRef,
    setActiveSection,
    setAutoOpenedSection,
    setChapterChangeKey,
    setShowFullDetails,
    setHotspotTransitioning,
    setSelectedHotspotId,
    setUserInterrupted,
    showOrbitHintPulse,
  ]);

  const goToBlueprint = useCallback((options = {}) => {
    const { bumpIntroTick = false } = options;
    nudgeRef.current = { x: 0, y: 0 };
    lookAtOffsetRef.current = { x: 0, y: 0 };
    setShowOrbitHint(false);
    clearOrbitHintTimer();
    dispatch({ type: 'GO_TO_BLUEPRINT', bumpIntroTick });
  }, [clearOrbitHintTimer, dispatch, lookAtOffsetRef, nudgeRef, setShowOrbitHint]);

  const goToOutside = useCallback(() => {
    nudgeRef.current = { x: 0, y: 0 };
    lookAtOffsetRef.current = { x: 0, y: 0 };
    setShowOrbitHint(false);
    clearOrbitHintTimer();
    dispatch({ type: 'GO_TO_OUTSIDE' });
  }, [clearOrbitHintTimer, dispatch, lookAtOffsetRef, nudgeRef, setShowOrbitHint]);

  const handleManualSectionChange = useCallback((sectionKey) => {
    setActiveSection(sectionKey);
    setUserInterrupted(true);
    clearUserInterruptedTimer();
    userInterruptedTimerRef.current = window.setTimeout(() => {
      setUserInterrupted(false);
      userInterruptedTimerRef.current = null;
    }, 10000);
  }, [clearUserInterruptedTimer, setActiveSection, setUserInterrupted]);

  const goToRoomIndex = useCallback((index) => {
    const nextIndex = Math.max(0, Math.min(index, storyRooms.length - 1));
    if (phase === 'room' && nextIndex === activeIndex) return;
    dispatch({ type: 'GO_TO_ROOM', index: nextIndex, roomId: storyRooms[nextIndex].id });
    resetRoomChapterState();
  }, [activeIndex, dispatch, phase, resetRoomChapterState]);

  const goToPrevRoom = useCallback(() => {
    if (phase !== 'room') return;
    goToRoomIndex(activeIndex - 1);
  }, [activeIndex, goToRoomIndex, phase]);

  const goToNextRoom = useCallback(() => {
    if (phase !== 'room') return;
    goToRoomIndex(activeIndex + 1);
  }, [activeIndex, goToRoomIndex, phase]);

  const { playUiTone, clearIntroAudioTimers } = useTourAudio({
    soundEnabled,
    phase,
    introRevealing,
  });

  const {
    clearTransitionTimers,
    enterHouse,
    goToOverview,
    openRoomFromBlueprint,
    handleDockBack,
    handleDockPrimary,
  } = useTourTransitions({
    phase,
    activeIndex,
    isEnteringHome,
    doorZooming,
    playUiTone,
    navigate,
    storyRooms,
    goToBlueprint,
    goToOutside,
    goToPrevRoom,
    goToNextRoom,
    goToRoomIndex,
    setHasInteracted,
    setPhaseTransitioning,
    setIsEnteringHome,
    setOutsideChapter,
    setPathTarget,
    setRoomZooming,
  });

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    userInterruptedRef.current = userInterrupted;
  }, [userInterrupted]);

  useEffect(() => () => {
    clearTransitionTimers();
    clearOrbitHintTimer();
    clearIntroRevealTimer();
    clearUserInterruptedTimer();
    clearIntroAudioTimers();
    stopCameraAnimation();
  }, [
    clearTransitionTimers,
    clearIntroAudioTimers,
    clearIntroRevealTimer,
    clearOrbitHintTimer,
    clearUserInterruptedTimer,
    stopCameraAnimation,
  ]);

  const resetTour = useCallback(() => {
    clearTransitionTimers();
    clearOrbitHintTimer();
    clearUserInterruptedTimer();
    clearIntroRevealTimer();
    clearIntroAudioTimers();
    stopCameraAnimation();

    nudgeRef.current = { x: 0, y: 0 };
    lookAtOffsetRef.current = { x: 0, y: 0 };

    dispatch({ type: 'RESET_TOUR_STATE' });
    setIsDragging(false);
    setHoveredRoomId(null);
    setPathTarget({ x: 50, y: 50 });
    setChapterChangeKey(0);
  }, [
    clearTransitionTimers,
    clearIntroAudioTimers,
    clearIntroRevealTimer,
    clearOrbitHintTimer,
    clearUserInterruptedTimer,
    dispatch,
    lookAtOffsetRef,
    nudgeRef,
    setChapterChangeKey,
    setHoveredRoomId,
    setIsDragging,
    setPathTarget,
    stopCameraAnimation,
  ]);

  const {
    openHotspot,
    onDetailScroll,
    jumpToDetails,
    handleRoomCta,
    handleGeneratePlan,
    onBookingInput,
    submitBooking,
    closeBookingModal,
  } = useTourRoomInteractions({
    introRevealing,
    activeRoom,
    hotspots,
    isGeneratingPlan,
    bookingForm,
    bookingSubmitting,
    stopCameraAnimation,
    playUiTone,
    goToBlueprint,
    goToRoomIndex,
    detailScrollRef,
    detailBodyRef,
    lookAtOffsetRef,
    nudgeRef,
    setHasInteracted,
    setShowProControls,
    setStoryProgress,
    setBookingSubmitted,
    setBookingSubmitting,
    setBookingSubmitError,
    setBookingFieldErrors,
    setShowBookingModal,
    setSelectedHotspotId,
    setFocusCue,
    setVisitedHotspots,
    setHotspotTransitioning,
    setShowOrbitHint,
    setIntroPassed,
    setIsGeneratingPlan,
    setTransformSweepTick,
    setBookingForm,
  });

  useTourKeyboard({
    phase,
    showBookingModal,
    phaseTransitioning,
    setPhase,
    setSelectedHotspotId,
    setShowBookingModal,
    closeBookingModal,
    setHasInteracted,
    goToNextRoom,
    goToPrevRoom,
    goToBlueprint,
    goToOutside,
    navigate,
  });

  return {
    phase,
    activeIndex,
    selectedHotspotId,
    visitedHotspots,
    focusCue,
    showFullDetails,
    setShowFullDetails,
    hotspotTransitioning,
    doorZooming,
    isEnteringHome,
    roomZooming,
    phaseTransitioning,
    blueprintEntered,
    blueprintMounted,
    hoveredRoomId,
    setHoveredRoomId,
    blueprintIntroTick,
    isDragging,
    storyProgress,
    setStoryProgress,
    themeMode,
    setThemeMode,
    materialMode,
    setMaterialMode,
    narrativeEnabled,
    setNarrativeEnabled,
    soundEnabled,
    setSoundEnabled,
    ambientMotion,
    setAmbientMotion,
    resetPreferences,
    isGeneratingPlan,
    transformSweepTick,
    visitedRooms,
    showProControls,
    setShowProControls,
    showBookingModal,
    setShowBookingModal,
    closeBookingModal,
    bookingSubmitted,
    bookingSubmitting,
    bookingSubmitError,
    bookingFieldErrors,
    bookingForm,
    introPassed,
    introRevealing,
    activeSection,
    autoOpenedSection,
    setAutoOpenedSection,
    chapterChangeKey,
    showOrbitHint,
    hasInteracted,
    activeRoom,
    activeStoryChapter,
    roomSummary,
    hotspots,
    selectedHotspot,
    roomComplete,
    phaseSteps,
    currentPhaseStep,
    currentPhaseLabel,
    dockBackLabel,
    dockPrimaryLabel,
    dockBackDisabled,
    dockPrimaryDisabled,
    dockOverviewDisabled,
    insightsTotal,
    insightsValue,
    insightsLabel,
    roomIllustration,
    particles,
    narrativeLine,
    revealEvidence,
    revealOutcome,
    revealDeepControls,
    storyMetric,
    achievements,
    frameworkPanels,
    detailScrollRef,
    detailBodyRef,
    roomShellRef,
    roomAtmoRef,
    handleManualSectionChange,
    goToRoomIndex,
    enterHouse,
    goToOverview,
    resetTour,
    handleDockBack,
    handleDockPrimary,
    openRoomFromBlueprint,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    openHotspot,
    onDetailScroll,
    jumpToDetails,
    handleRoomCta,
    handleGeneratePlan,
    onBookingInput,
    submitBooking,
  };
};

export default useTourFlow;
