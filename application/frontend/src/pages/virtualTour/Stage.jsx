import { memo, useId } from 'react';
import { RoomIcon } from './visuals';

const Stage = ({
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
}) => {
  const captionId = useId();
  const orbitHintId = useId();
  const stageStatusId = useId();
  const activeHotspot = hotspots.find((spot) => spot.id === selectedHotspotId) || null;
  const roomReviewCaption = activeHotspot
    ? `Focus on ${activeHotspot.title.toLowerCase()} to see what it changes in the room.`
    : `Rotate the room and open hotspots to see what stands out in ${activeRoom.name}.`;
  const captionText = phase === 'outside'
    ? 'Enter the walkthrough to preview the room and see what to change first.'
    : phase === 'blueprint'
      ? 'Choose the room you want to look at first.'
      : roomReviewCaption;
  const stageDescriptionIds = [captionId];
  if (phase === 'room' && showOrbitHint) stageDescriptionIds.push(orbitHintId);
  if (phase === 'room') stageDescriptionIds.push(stageStatusId);
  const stageSweepKey = `${phase}-${blueprintIntroTick}-${activeRoom.id}-${isGeneratingPlan ? transformSweepTick : 'idle'}`;
  const roomSweepKey = `${activeRoom.id}-${introRevealing ? 'intro' : 'steady'}-${isGeneratingPlan ? transformSweepTick : 'idle'}`;

  return (
    <section
      className={`virtual-stage phase-${phase} ${doorZooming ? 'door-zoom' : ''} ${roomZooming ? 'room-zoom' : ''} ${phaseTransitioning ? 'phase-transitioning' : ''} ${ambientMotion ? 'ambient-on' : ''} ${phase === 'room' && introRevealing ? 'intro-cam-active' : ''} ${isDragging ? 'is-dragging' : ''} ${isGeneratingPlan ? 'stage-generating' : ''} ${phase === 'room' && selectedHotspotId ? 'hotspot-focus-active' : ''}`}
      aria-label={phase === 'room' ? `${activeRoom.name} room stage` : phase === 'blueprint' ? 'Room map stage' : 'Tour entry stage'}
      aria-describedby={stageDescriptionIds.join(' ')}
      data-phase={phase}
      data-room={activeRoom.id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
    <div key={`stage-frame-${phase}-${activeRoom.id}`} className="stage-frame-overlay" aria-hidden="true">
      <span className="stage-frame-line stage-frame-line-top" />
      <span className="stage-frame-line stage-frame-line-right" />
      <span className="stage-frame-line stage-frame-line-bottom" />
      <span className="stage-frame-line stage-frame-line-left" />
    </div>
    <div className="virtual-grid" />
    <div key={`stage-progress-${phase}-${activeRoom.id}`} className="stage-progress" aria-label="Tour progress">
      {phaseSteps.map((step, index) => (
        <div
          key={step.id}
          className={`stage-step ${index <= currentPhaseStep ? 'active' : ''} ${index === currentPhaseStep ? 'current' : ''}`}
          style={{ '--stage-step-index': index }}
          aria-current={index === currentPhaseStep ? 'step' : undefined}
        >
          <span className="stage-dot">{index + 1}</span>
          <span className="stage-label">{step.label}</span>
        </div>
      ))}
    </div>
    <div key={`stage-progress-track-${phase}-${activeRoom.id}`} className="stage-progress-track">
      <span className="stage-progress-fill" style={{ width: `${(currentPhaseStep / (phaseSteps.length - 1)) * 100}%` }} />
    </div>
    <div className="phase-transition-veil" />
    <div className="cinema-vignette" />
    <div
      key={stageSweepKey}
      className={`stage-cinematic-sweep ${phase === 'blueprint' ? 'is-blueprint' : ''} ${phase === 'room' ? 'is-room' : ''} ${phase === 'outside' ? 'is-outside' : ''} ${isGeneratingPlan ? 'is-plan' : ''}`}
      aria-hidden="true"
    />
    <div className="virtual-particles" aria-hidden="true">
      {ambientMotion && particles.map((p) => (
        <span key={p.id} className="particle-dot" style={{ left: `${p.x}%`, top: `${p.y}%`, animationDuration: `${p.d}s` }} />
      ))}
    </div>

    <div className="outside-layer">
      <div className={`outside-shell ${isEnteringHome ? 'house-zoom-in' : ''}`}>
        <div className="outside-shell-aura" aria-hidden="true" />
        <div className="outside-shell-grid" aria-hidden="true" />
        <div className="outside-shell-orbits" aria-hidden="true">
          <span className="outside-orbit outside-orbit-a" />
          <span className="outside-orbit outside-orbit-b" />
          <span className="outside-orbit outside-orbit-c" />
        </div>
        <div className="outside-shell-frame" aria-hidden="true">
          <span className="outside-frame-corner corner-tl" />
          <span className="outside-frame-corner corner-tr" />
          <span className="outside-frame-corner corner-bl" />
          <span className="outside-frame-corner corner-br" />
        </div>
        <div className="outside-shell-meta">
          <p className="outside-shell-kicker">Phase 1 · Home Scan</p>
          <h3>Room Walkthrough</h3>
          <p className="outside-shell-lead">Start with the home view, find the room with the most upside, then step inside.</p>
        </div>
        <div className="outside-status-rail" aria-hidden="true">
          <span className="outside-status-chip">Room View</span>
          <span className="outside-status-chip">Budget Fit</span>
          <span className="outside-status-chip">Shopping Plan</span>
        </div>
        <div className="outside-pedestal">
          <div className="outside-pedestal-ring" aria-hidden="true" />
          <div className="outside-pedestal-reflection" aria-hidden="true" />
          <div className="house-structure">
            <div className="house-atmo-core" />
            <div className="house-scan-columns" aria-hidden="true">
              <span className="scan-column scan-column-a" />
              <span className="scan-column scan-column-b" />
              <span className="scan-column scan-column-c" />
            </div>
            <div className="house-floor" />
            <div className="house-wall house-wall-back" />
            <div className="house-wall house-wall-left" />
            <div className="house-wall house-wall-right" />
            <div className="house-roof" />
            <div className="house-window-glow house-window-glow-a" />
            <div className="house-window-glow house-window-glow-b" />
            <div className="house-window house-window-a" />
            <div className="house-window house-window-b" />
            <div className="house-door-glow" />
            <div className="house-door" />
            <div className="house-outline-overlay" />
          </div>
        </div>
      </div>
      <div className={`outside-entry-cta ${isEnteringHome ? 'is-hidden' : ''}`}>
        <button type="button" className="house-door-btn" onClick={enterHouse} disabled={isEnteringHome || phaseTransitioning}>
          Enter Walkthrough
        </button>
      </div>
    </div>

    <div className={`blueprint-layer${blueprintMounted ? ' is-entered' : ''}`}>
      <div className="blueprint-shell-wrap">
        <div
          key={blueprintIntroTick}
          className={`blueprint-shell ${blueprintEntered ? 'is-entered' : ''} ${hoveredRoomId ? 'room-hovering' : ''}`}
          data-hovered-room={hoveredRoomId || ''}
        >
          <div className="blueprint-shell-scan" aria-hidden="true" />
          <header className="blueprint-head">
            <p className="blueprint-kicker">Phase 2 · Priority Map</p>
            <h3>Room Opportunity Map</h3>
            <p className="blueprint-subtitle">Pick a room, see what feels off, and decide where to start.</p>
          </header>

          <div className="blueprint-body">
            <div className="blueprint-mini-card">
              <svg className="mini-plan" viewBox="0 0 100 100" aria-hidden="true">
                <rect x="8" y="8" width="84" height="84" className="bp-outer" />
                <line x1="8" y1="52" x2="46" y2="52" className="bp-inner" />
                <line x1="46" y1="8" x2="46" y2="52" className="bp-inner" />
                <line x1="54" y1="8" x2="92" y2="8" className="bp-inner" />
                <line x1="54" y1="8" x2="54" y2="48" className="bp-inner" />
                <line x1="54" y1="48" x2="92" y2="48" className="bp-inner" />
                <line x1="8" y1="60" x2="44" y2="60" className="bp-inner" />
                <line x1="44" y1="60" x2="44" y2="92" className="bp-inner" />
                <line x1="52" y1="60" x2="92" y2="60" className="bp-inner" />
                <line x1="52" y1="60" x2="52" y2="92" className="bp-inner" />
                <path d="M46 28 A8 8 0 0 1 38 36" className="bp-door" />
                <path d="M54 28 A8 8 0 0 0 62 36" className="bp-door" />
                <path d="M44 70 A8 8 0 0 0 52 78" className="bp-door" />
              </svg>
            </div>

            <div className="blueprint-grid">
              {storyRooms.map((room, index) => (
                <button
                  key={room.id}
                  type="button"
                  className={`blueprint-room-node ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => openRoomFromBlueprint(index)}
                  style={{
                    transitionDelay: blueprintMounted ? `${index * 80}ms` : '0ms',
                    '--node-index': index,
                  }}
                  onMouseEnter={() => setHoveredRoomId(room.id)}
                  onMouseLeave={() => setHoveredRoomId(null)}
                  aria-current={index === activeIndex ? 'location' : undefined}
                >
                  <span className="bp-node-main">
                    <span className="bp-node-name blueprint-room-node__label">{blueprintNodeLabels[room.id] || room.name}</span>
                    <span className="bp-node-meta">{room.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="room-layer">
      {hotspots.map((spot, hotspotIndex) => (
        <button
          type="button"
          key={spot.id}
          className={`virtual-hotspot ${selectedHotspotId === spot.id ? 'active' : ''}`}
          onClick={() => openHotspot(spot.id)}
          style={{
            left: `${spot.x}%`,
            top: `${spot.y}%`,
            '--hotspot-index': hotspotIndex,
          }}
          aria-label={spot.title}
          aria-pressed={selectedHotspotId === spot.id}
        >
          {selectedHotspotId === spot.id && (
            <span
              key={`${spot.id}-${focusCue}`}
              className="virtual-hotspot-focus-ring"
              aria-hidden="true"
            />
          )}
          <span className="virtual-hotspot-pulse" />
          <span className="virtual-hotspot-core" />
          <span className="virtual-hotspot-tag">{spot.title}</span>
        </button>
      ))}
      <div ref={roomShellRef} className={`room-shell room-shell-${activeRoom.id} ${hotspotTransitioning ? 'hotspot-transitioning' : ''}`}>
        <div
          key={roomSweepKey}
          className={`room-entry-sweep ${introRevealing ? 'is-revealing' : ''} ${isGeneratingPlan ? 'is-plan' : ''}`}
          aria-hidden="true"
        />
        <div ref={roomAtmoRef} className="room-depth-atmo" />
        <div className="room-depth-shadow" />
        <div className="room-depth-foreground" />
        <div className="room-architect-lines" aria-hidden="true">
          <span className="arch-line arch-top" />
          <span className="arch-line arch-bottom" />
          <span className="arch-line arch-left" />
          <span className="arch-line arch-right" />
        </div>
        <div className="room-focal-ring" aria-hidden="true" />
        <div className="house-structure">
          <div className="house-floor" />
          <div className="house-wall house-wall-back" />
          <div className="house-wall house-wall-left" />
          <div className="house-wall house-wall-right" />
          <div className="house-window house-window-a" />
          <div className="house-window house-window-b" />
          <div className="house-door" />
          <div className="room-ceiling-cove" />
          <div className="room-wall-trim trim-left" />
          <div className="room-wall-trim trim-right" />
          <div className="room-light-beam beam-a" />
          <div className="room-back-grid" />
        </div>
        <div className={`room-illustration room-illustration-${activeRoom.id}`} aria-hidden="true">
          {roomIllustration}
        </div>
        <div className="room-chamber">
          <RoomIcon name={activeRoom.icon} className="room-icon room-icon-lg" />
          <p className="chamber-kicker">Transformation Review</p>
          <p className="chamber-sub">{activeRoom.name}</p>
        </div>
      </div>
    </div>

    <div key={`caption-${phase}-${activeRoom.id}`} id={captionId} className="virtual-caption">{captionText}</div>
    {phase === 'room' && showOrbitHint && (
      <div id={orbitHintId} className="orbit-hint" aria-live="polite">
        Drag to rotate · Select hotspots to inspect key signals
      </div>
    )}
    {phase === 'room' && (
      <p id={stageStatusId} className="sr-only" role="status" aria-live="polite">
        {activeHotspot
          ? `${activeRoom.name} room selected. ${activeHotspot.title} hotspot is active.`
          : `${activeRoom.name} room selected. No hotspot is active.`}
      </p>
    )}
    {phase === 'room' && (
      <div key={`room-dock-${activeRoom.id}`} className="room-bottom-dock">
        <div className="dock-room-tabs">
          {storyRooms.map((room, idx) => (
            <button
              key={room.id}
              type="button"
              className={`dock-room-tab ${idx === activeIndex ? 'active' : ''}`}
              onClick={() => goToRoomIndex(idx)}
              aria-current={idx === activeIndex ? 'location' : undefined}
            >
              <RoomIcon name={room.icon} className="room-icon room-icon-xs" />
              <span>{room.name}</span>
            </button>
          ))}
        </div>
      </div>
    )}

    {phase !== 'outside' && (
      <nav className={`virtual-sticky-dock phase-${phase} ${phaseTransitioning ? 'hidden' : ''}`}>
        <button type="button" className="dock-btn ghost" onClick={handleDockBack} disabled={dockBackDisabled}>← {dockBackLabel}</button>
        {phase === 'room' && (
          <button type="button" className="dock-btn ghost" onClick={goToOverview} disabled={dockOverviewDisabled}>Room Map</button>
        )}
        <button type="button" className="dock-btn primary" onClick={handleDockPrimary} disabled={dockPrimaryDisabled}>{dockPrimaryLabel} →</button>
      </nav>
    )}
    </section>
  );
};

export default memo(Stage);
