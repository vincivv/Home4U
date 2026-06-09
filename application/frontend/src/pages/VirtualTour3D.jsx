/**
 * A high-fidelity spatial narrative engine using Spline camera waypoints and React state-driven context.
 */
import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  storyRooms,
  themePresets,
  materialPresets,
  blueprintNodeLabels,
} from './virtualTour/data';
import Stage from './virtualTour/Stage';
import Sidebar from './virtualTour/Sidebar';
import BookingModal from './virtualTour/BookingModal';
import useTourFlow from './virtualTour/useTourFlow';
import { resolveStyleContext } from '../utils/styleContext';
import './VirtualTour3D.css';

const ROOM_PURCHASE_LANES = Object.freeze({
  atrium: 'buy-first',
  pain: 'buy-first',
  solution: 'layer-next',
  transform: 'layer-next',
  proof: 'finish-out',
  action: 'finish-out',
});

const PURCHASE_BRIDGE_LABELS = Object.freeze({
  'buy-first': 'Open Buy First Picks',
  'layer-next': 'Open Layer Next Picks',
  'finish-out': 'Open Finish Out Picks',
});

const VirtualTour3D = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    phase,
    activeIndex,
    selectedHotspotId,
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
  } = useTourFlow({ navigate });

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedStyle = (
    location.state?.selectedStyle && typeof location.state.selectedStyle === 'object'
      ? location.state.selectedStyle
      : null
  );
  const linkedProjectId = useMemo(() => {
    const stateProjectId = Number(location.state?.projectId);
    if (Number.isFinite(stateProjectId) && stateProjectId > 0) return stateProjectId;

    const searchProjectId = Number(searchParams.get('project'));
    if (Number.isFinite(searchProjectId) && searchProjectId > 0) return searchProjectId;

    return null;
  }, [location.state?.projectId, searchParams]);
  const demoMode = searchParams.get('demo') === '1' || location.state?.demoMode === true;
  const demoStyle = useMemo(
    () => resolveStyleContext({ styleKey: searchParams.get('style') || '', style: selectedStyle, defaultName: 'Home4U' }),
    [searchParams, selectedStyle],
  );
  const walkthroughPurchaseLane = ROOM_PURCHASE_LANES[activeRoom?.id] || 'buy-first';
  const purchaseBridgeLabel = PURCHASE_BRIDGE_LABELS[walkthroughPurchaseLane] || 'Open Matching Picks';

  const openPurchaseStep = () => {
    if (!linkedProjectId) return;

    const nextParams = new URLSearchParams();
    nextParams.set('from', 'walkthrough');
    nextParams.set('lane', walkthroughPurchaseLane);
    nextParams.set('room', activeRoom.name);
    if (selectedHotspot?.title) nextParams.set('hotspot', selectedHotspot.title);

    navigate(`/project/${linkedProjectId}?${nextParams.toString()}`);
  };

  useEffect(() => {
    if (!demoStyle.hasExplicitStyle) return;
    setThemeMode(demoStyle.themeMode);
    setMaterialMode(demoStyle.materialMode);
  }, [demoStyle.hasExplicitStyle, demoStyle.materialMode, demoStyle.themeMode, setMaterialMode, setThemeMode]);

  const stageProps = {
    phase,
    doorZooming,
    roomZooming,
    phaseTransitioning,
    ambientMotion,
    introRevealing,
    isDragging,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    phaseSteps,
    currentPhaseStep,
    particles,
    isEnteringHome,
    enterHouse,
    blueprintMounted,
    blueprintIntroTick,
    blueprintEntered,
    hoveredRoomId,
    storyRooms,
    activeIndex,
    openRoomFromBlueprint,
    setHoveredRoomId,
    blueprintNodeLabels,
    hotspots,
    selectedHotspotId,
    focusCue,
    openHotspot,
    activeRoom,
    hotspotTransitioning,
    isGeneratingPlan,
    transformSweepTick,
    roomShellRef,
    roomAtmoRef,
    roomIllustration,
    showOrbitHint,
    goToRoomIndex,
    handleDockBack,
    dockBackDisabled,
    dockBackLabel,
    goToOverview,
    dockOverviewDisabled,
    handleDockPrimary,
    dockPrimaryDisabled,
    dockPrimaryLabel,
  };

  const sidebarProps = {
    phase,
    currentPhaseStep,
    phaseSteps,
    currentPhaseLabel,
    storyRooms,
    enterHouse,
    isEnteringHome,
    phaseTransitioning,
    activeRoom,
    activeIndex,
    openRoomFromBlueprint,
    showFullDetails,
    setShowFullDetails,
    activeStoryChapter,
    roomSummary,
    introRevealing,
    detailScrollRef,
    onDetailScroll,
    chapterChangeKey,
    introPassed,
    jumpToDetails,
    detailBodyRef,
    frameworkPanels,
    activeSection,
    autoOpenedSection,
    setAutoOpenedSection,
    handleManualSectionChange,
    revealEvidence,
    insightsTotal,
    insightsValue,
    insightsLabel,
    roomComplete,
    selectedHotspot,
    focusCue,
    handleRoomCta,
    hotspots,
    selectedHotspotId,
    openHotspot,
    revealOutcome,
    isGeneratingPlan,
    transformSweepTick,
    handleGeneratePlan,
    storyMetric,
    storyProgress,
    setStoryProgress,
    revealDeepControls,
    visitedRooms,
    goToOverview,
    resetTour,
    showProControls,
    themePresets,
    themeMode,
    setThemeMode,
    materialPresets,
    materialMode,
    setMaterialMode,
    ambientMotion,
    setAmbientMotion,
    resetPreferences,
    narrativeEnabled,
    setNarrativeEnabled,
    soundEnabled,
    setSoundEnabled,
    achievements,
    narrativeLine,
    setShowProControls,
    demoMode,
    demoStyleName: demoStyle.hasExplicitStyle ? demoStyle.name : '',
    linkedProjectId,
    purchaseBridgeLabel,
    openPurchaseStep,
  };

  const bookingModalProps = {
    showBookingModal,
    closeBookingModal,
    bookingSubmitted,
    bookingSubmitting,
    bookingSubmitError,
    bookingFieldErrors,
    submitBooking,
    bookingForm,
    onBookingInput,
  };
  const phaseDescriptions = {
    outside: 'Start with the room overview before stepping inside.',
    blueprint: 'Choose a room and begin the walkthrough.',
    room: 'Look around, compare ideas, and decide what to change next.',
  };
  const activePhaseDescription = phaseDescriptions[phase] || phaseDescriptions.outside;

  return (
    <div
      className={`virtual-tour-page ${hasInteracted ? 'has-interaction' : 'no-interaction'}`}
      style={{
        '--room-accent-global': activeRoom.accent,
        '--room-tone-a': activeRoom.toneA,
        '--room-tone-b': activeRoom.toneB,
        '--room-glow': activeRoom.glow,
        '--theme-bg-a': themePresets[themeMode].bgA,
        '--theme-bg-b': themePresets[themeMode].bgB,
        '--theme-panel': themePresets[themeMode].panel,
        '--mat-floor': materialPresets[materialMode].floor,
        '--mat-wall': materialPresets[materialMode].wall,
        '--mat-roof': materialPresets[materialMode].roof,
      }}
    >
      <main className="virtual-tour-shell">
        <section className="virtual-tour-hero">
          <div className="virtual-tour-hero-copy">
            <p className="virtual-tour-kicker">Walkthrough</p>
            <h1>{demoStyle.hasExplicitStyle ? `${demoStyle.name} Walkthrough` : 'Home4U Walkthrough'}</h1>
            <p className="virtual-tour-lead">{activePhaseDescription}</p>
          </div>
          <div className="virtual-tour-hero-metrics studio-hero-metrics" aria-label="Tour overview">
            <div className="virtual-tour-metric studio-hero-card">
              <span className="studio-hero-label">Current phase</span>
              <strong className="studio-hero-value">{currentPhaseLabel}</strong>
            </div>
            <div className="virtual-tour-metric studio-hero-card">
              <span className="studio-hero-label">Rooms</span>
              <strong className="studio-hero-value">{activeIndex + 1} / {storyRooms.length}</strong>
            </div>
            <div className="virtual-tour-metric studio-hero-card">
              <span className="studio-hero-label">Mode</span>
              <strong className="studio-hero-value">{demoMode ? 'Style Demo' : 'Live Tour'}</strong>
            </div>
          </div>
        </section>

        <section className={`virtual-tour-layout ${phase === 'room' ? 'phase-room-layout' : ''}`}>
          <Stage {...stageProps} />
          <Sidebar {...sidebarProps} />
        </section>
      </main>
      <BookingModal {...bookingModalProps} />
    </div>
  );
};

export default VirtualTour3D;
