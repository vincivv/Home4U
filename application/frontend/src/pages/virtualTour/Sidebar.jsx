import { useId } from 'react';
import { RoomIcon } from './visuals';

const Sidebar = ({
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
  demoStyleName,
  linkedProjectId,
  purchaseBridgeLabel,
  openPurchaseStep,
}) => {
  const roomDetailsId = useId();
  const proControlsId = useId();
  const tourStatus = phase === 'room'
    ? `${activeRoom.name} room selected.${selectedHotspot ? ` ${selectedHotspot.title} insight is active.` : ''}`
    : phase === 'blueprint'
      ? `Room map view. Current focus is ${activeRoom.name}.`
      : 'Tour entry view.';
  const roomSequenceKey = `${activeRoom.id}-${showFullDetails ? 'full' : 'preview'}-${chapterChangeKey}`;
  const hotspotSequenceKey = `${activeRoom.id}-${selectedHotspotId || 'none'}-${focusCue}`;
  const experienceSequence = [
    {
      step: '01',
      title: 'See the room clearly',
      detail: 'Understand what is getting in the way today before changing anything.',
    },
    {
      step: '02',
      title: 'Preview the direction',
      detail: 'See how the new look could come together in the actual room.',
    },
    {
      step: '03',
      title: 'Know what to do next',
      detail: 'Leave with a first move and a plan you can act on.',
    },
  ];
  const roomStrategyCards = [
    { label: 'What feels off', value: activeRoom.problem || roomSummary.takeaway },
    { label: 'What we are watching', value: activeRoom.method || roomSummary.purpose },
    { label: 'Best next step', value: activeRoom.nextStep || activeRoom.cta },
  ];

  return (
    <aside className={`virtual-info ${phase === 'room' ? 'room-info-mode' : ''}`}>
    {phase === 'outside' && (
      <section className="experience-panel screen-transform-shell">
        <p className="tour-progress">Phase {currentPhaseStep + 1} of {phaseSteps.length} · {currentPhaseLabel}</p>
        <p className="virtual-eyebrow">{demoMode ? 'Room Demo' : 'Walkthrough'}</p>
        <h2 className="experience-title">Walk through the future room before you spend.</h2>
        <p className="experience-lead">
          {demoStyleName
            ? `Home4U uses this ${demoStyleName.toLowerCase()} tour to show the room, preview the direction, and turn it into a buy-ready plan.`
            : 'Home4U uses this tour to show the room, preview the direction, and turn it into a buy-ready plan.'}
        </p>
        <div className="experience-pills">
          <span>{storyRooms.length} rooms</span>
          <span>Room cues</span>
          <span>Buy-ready plan</span>
        </div>
        <div className="experience-sequence" aria-label="How the tour works">
          {experienceSequence.map((item) => (
            <article key={item.step} className="experience-sequence-card">
              <span className="experience-sequence-step">{item.step}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="room-secondary-link outside-secondary-cta studio-btn studio-btn--secondary studio-btn--compact" onClick={enterHouse} disabled={isEnteringHome || phaseTransitioning}>Start Walkthrough</button>
      </section>
    )}

    {phase === 'blueprint' && (
      <section className="experience-panel screen-transform-shell">
        <p className="tour-progress">Phase {currentPhaseStep + 1} of {phaseSteps.length} · {currentPhaseLabel}</p>
        <p className="virtual-eyebrow room-chooser-kicker">Choose a Room</p>
        <h2 className="experience-title room-chooser-title">Room Priority Map</h2>
        <p className="experience-lead">Pick the room with the clearest upside. Each stop shows what feels off, where the room could go, and what to do next.</p>
        <p className="blueprint-current">Up next: {activeRoom.name}</p>
        <div className="virtual-room-grid">
          {storyRooms.map((room, index) => (
            <button
              type="button"
              key={room.id}
              className={`virtual-room-btn ${index === activeIndex ? 'active' : ''}`}
              onClick={() => openRoomFromBlueprint(index)}
              aria-pressed={index === activeIndex}
              aria-current={index === activeIndex ? 'location' : undefined}
            >
              <RoomIcon name={room.icon} className="room-icon room-icon-xs" />
              <span>{room.name}</span>
            </button>
          ))}
        </div>
      </section>
    )}

    {phase === 'room' && (
      <>
        <section
          key={`room-header-${activeRoom.id}`}
          className="room-sidebar-header screen-transform-shell"
          style={{
            '--room-accent': activeRoom.accent,
            '--room-tone-a': activeRoom.toneA,
            '--room-tone-b': activeRoom.toneB,
            '--sidebar-delay': '0ms',
          }}
        >
          <div className="room-header-meta">
            <p className="virtual-eyebrow section-kicker">Walkthrough</p>
            <span className="room-chapter-index">Room {activeIndex + 1} of {storyRooms.length}</span>
          </div>
          <p className="room-breadcrumb">Current room · {activeRoom.name}</p>
          <h2 className="section-title">{activeRoom.title}</h2>
          <p className="section-lead">{activeStoryChapter.narrationText.replace(/^[A-Za-z]+:\s*/, '')}</p>
          <div className="room-strategy-rail" aria-label="What this review resolves">
            {roomStrategyCards.map((item) => (
              <article key={item.label} className="room-strategy-card">
                <span className="room-strategy-label">{item.label}</span>
                <p>{item.value}</p>
              </article>
            ))}
          </div>
          <div className="room-header-actions">
            <button
              type="button"
              className="room-view-toggle"
              onClick={() => setShowFullDetails((prev) => !prev)}
              aria-pressed={showFullDetails}
              aria-expanded={showFullDetails}
              aria-controls={roomDetailsId}
            >
              {showFullDetails ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
        </section>

        <div id={roomDetailsId} ref={detailScrollRef} className={`room-detail-scroll ${introRevealing ? 'locked' : ''}`} onScroll={onDetailScroll}>
          <div className="room-detail-parallax room-detail-parallax-a" aria-hidden="true" />
          <div className="room-detail-parallax room-detail-parallax-b" aria-hidden="true" />
          <div className="room-detail-parallax room-detail-parallax-c" aria-hidden="true" />
          <div className="room-scroll-mask" aria-hidden="true" />
          <div
            key={roomSequenceKey}
            className={`room-detail-content ${introPassed ? 'intro-passed' : ''} ${introRevealing || phaseTransitioning ? 'is-loading' : ''}`}
          >
            <section
              key={`room-summary-${activeRoom.id}`}
              className="room-summary-panel screen-transform-shell sidebar-item-animate"
              style={{ '--sidebar-delay': '80ms' }}
            >
              <p className="virtual-eyebrow">Room Summary</p>
              <div className="summary-item">
                <span className="summary-label">What this room can become</span>
                <p className="summary-text">{roomSummary.purpose}</p>
              </div>
              <div className="summary-item">
                <span className="summary-label">What we are reading</span>
                <div className="summary-tags">
                  {roomSummary.features.map((feature) => (
                    <span key={feature} className="summary-tag">{feature}</span>
                  ))}
                </div>
              </div>
              <div className="summary-item">
                <span className="summary-label">Why it matters</span>
                <p className="summary-text">{roomSummary.takeaway}</p>
              </div>
            </section>

            <section
              key={activeRoom.id}
              className={`room-intro-showcase screen-transform-shell sidebar-item-animate ${introRevealing ? 'reveal-active' : ''}`}
              style={{
                '--room-accent': activeRoom.accent,
                '--room-tone-a': activeRoom.toneA,
                '--room-tone-b': activeRoom.toneB,
                '--room-glow': activeRoom.glow,
                '--sidebar-delay': '120ms',
              }}
            >
              <p className="virtual-eyebrow room-kicker">Room Direction</p>
              <p className="room-display-label">{activeRoom.name}</p>
              <p className="room-display-lead">{activeRoom.promise}</p>
              <div className="room-intro-meta">
                <span className="meta-label">{activeRoom.metric.label}</span>
                <strong>{activeRoom.metric.after}{activeRoom.metric.suffix}</strong>
              </div>
              <button type="button" className="room-intro-cta studio-btn studio-btn--primary studio-btn--compact" onClick={jumpToDetails}>Open Details</button>
              <span className="room-intro-scrollhint">Scroll for details and next steps</span>
              {introRevealing && <span className="room-intro-lock">Revealing room...</span>}
            </section>

            <div ref={detailBodyRef} className="room-detail-body">
              {!showFullDetails && (
                <section className="room-detail-preview screen-transform-shell sidebar-item-animate" style={{ '--sidebar-delay': '180ms' }}>
                  <p className="virtual-eyebrow">Details</p>
                  <p className="section-lead">Open the details to see what stands out and what to do next.</p>
                  <button
                    type="button"
                    className="room-summary-cta studio-btn studio-btn--secondary studio-btn--compact"
                    onClick={() => setShowFullDetails(true)}
                    aria-controls={roomDetailsId}
                    aria-expanded={showFullDetails}
                  >
                    Show Details
                  </button>
                </section>
              )}
              {showFullDetails && (
                <section className="story-framework screen-transform-shell sidebar-item-animate" style={{ '--sidebar-delay': '180ms' }}>
                  <p className="virtual-eyebrow">Why This Fits</p>
                  <div key={activeStoryChapter.id} className="framework-accordion">
                    {frameworkPanels.map((panel) => {
                      const isOpen = activeSection === panel.key;
                      const buttonId = `framework-${activeStoryChapter.id}-${panel.key}`;
                      const panelId = `${buttonId}-panel`;
                      return (
                        <article key={panel.key} className={`framework-step ${isOpen ? 'is-open' : ''}`}>
                          <button
                            type="button"
                            id={buttonId}
                            className={`framework-trigger accordion-header ${isOpen ? 'active shimmer-shine' : ''} ${autoOpenedSection === panel.key ? 'sync-highlight' : ''}`}
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            onClick={() => {
                              setAutoOpenedSection(null);
                              handleManualSectionChange(panel.key);
                            }}
                          >
                            <span>{panel.label}</span>
                            <span className="framework-chevron" aria-hidden="true">+</span>
                          </button>
                          <div
                            id={panelId}
                            className={`framework-panel ${isOpen ? 'is-open' : ''}`}
                            role="region"
                            aria-labelledby={buttonId}
                          >
                            <div className="framework-panel-inner">
                              <p>{panel.content}</p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
              {showFullDetails && (revealEvidence ? (
                <>
                  <div
                    className="virtual-room-progress sidebar-item-animate"
                    style={{ '--sidebar-delay': '240ms' }}
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={Math.max(insightsTotal, 1)}
                    aria-valuenow={insightsValue}
                    aria-valuetext={insightsLabel}
                  >
                    <span>{insightsLabel}</span>
                    <span className={`virtual-complete-pill ${roomComplete ? 'complete' : ''}`}>{roomComplete ? 'Review Complete' : 'In Progress'}</span>
                  </div>
                  <section
                    key={`hotspot-panel-${hotspotSequenceKey}`}
                    className={`virtual-hotspot-panel screen-transform-shell section-parallax section-parallax-fast sidebar-item-animate ${selectedHotspot ? 'has-selection' : 'is-idle'}`}
                    style={{ '--sidebar-delay': '300ms' }}
                  >
                    <p className="virtual-eyebrow">What Changes Here</p>
                    {selectedHotspot ? (
                      <div key={`${selectedHotspot.id}-${focusCue}`} className="hotspot-panel-inner hotspot-panel-enter">
                        <h3>{selectedHotspot.title}</h3>
                        <p>{selectedHotspot.description}</p>
                        <button type="button" className="virtual-hotspot-cta studio-btn studio-btn--primary studio-btn--compact" onClick={handleRoomCta}>{activeRoom.cta}</button>
                      </div>
                    ) : (
                      <p>Select a hotspot to see what it changes in the room.</p>
                    )}
                    {hotspots.length > 0 && (
                      <div className="hotspot-chip-row studio-chip-row" aria-label="Room insights">
                        {hotspots.map((spot, chipIndex) => (
                          <button
                            key={spot.id}
                            type="button"
                            className={`hotspot-chip studio-chip ${selectedHotspotId === spot.id ? 'active' : ''}`}
                            onClick={() => openHotspot(spot.id)}
                            aria-pressed={selectedHotspotId === spot.id}
                            style={{ '--chip-index': chipIndex }}
                          >
                            {spot.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              ) : (
                <p className="chapter-hint">This room starts with the overview. More detail appears in the next room.</p>
              ))}

              {showFullDetails && revealOutcome && (
                <section
                  key={`transform-panel-${activeRoom.id}-${transformSweepTick}`}
                  className="before-after-panel screen-transform-shell section-parallax section-parallax-mid sidebar-item-animate"
                  style={{ '--sidebar-delay': '360ms' }}
                >
                  <div className={`transform-panel ${isGeneratingPlan ? 'is-processing' : ''} ${transformSweepTick ? 'sweep-once' : ''}`}>
                    <div className="transform-header">
                      <p className="virtual-eyebrow">Action Plan</p>
                      <button
                        type="button"
                        className="transform-cta studio-btn studio-btn--primary studio-btn--compact"
                        onClick={handleGeneratePlan}
                        disabled={isGeneratingPlan}
                      >
                        {isGeneratingPlan ? 'Building…' : 'Build Action Plan'}
                      </button>
                    </div>
                    <div className="before-after-meta">
                      <span>{activeRoom.metric.label}</span>
                      <strong>{storyMetric}{activeRoom.metric.suffix}</strong>
                    </div>
                    <div className="transform-canvas">
                      <div className="before-after-stage">
                        <div className="before-layer">Baseline {activeRoom.metric.before}{activeRoom.metric.suffix}</div>
                        <div className="after-layer" style={{ width: `${storyProgress}%` }}>Current {storyMetric}{activeRoom.metric.suffix}</div>
                        <span className="split-line" style={{ left: `${storyProgress}%` }}><span className="split-handle">↔</span></span>
                      </div>

                      {isGeneratingPlan && (
                        <div className="transform-overlay">
                          <div className="transform-grid" />
                          <div className="transform-scan-line" />
                          <p className="transform-status">Turning room cues into a budget-ready plan…</p>
                        </div>
                      )}
                      {!isGeneratingPlan && transformSweepTick > 0 && (
                        <div key={transformSweepTick} className="transform-sweep" aria-hidden="true" />
                      )}
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={storyProgress}
                      onChange={(event) => setStoryProgress(Number(event.target.value))}
                      className="before-after-slider"
                      aria-label="Outcome progress"
                      aria-valuetext={`Current ${storyMetric}${activeRoom.metric.suffix} of ${activeRoom.metric.after}${activeRoom.metric.suffix}`}
                    />
                    <div className="before-after-presets">
                      {[25, 50, 75, 100].map((value) => (
                        <button key={value} type="button" className="tiny-chip" onClick={() => setStoryProgress(value)}>{value}%</button>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {showFullDetails && revealDeepControls && (
                <div className="virtual-minimap sidebar-item-animate" style={{ '--sidebar-delay': '420ms' }}>
                  {storyRooms.map((room, idx) => (
                    <span key={room.id} className={`virtual-minidot ${idx === activeIndex ? 'active' : ''} ${visitedRooms.has(room.id) ? 'visited' : ''}`} style={idx === activeIndex ? { backgroundColor: room.accent } : undefined} />
                  ))}
                </div>
              )}
            </div>
            <section
              key={`room-actions-${activeRoom.id}`}
              className="room-actions-panel screen-transform-shell sidebar-item-animate"
              style={{ '--sidebar-delay': '480ms' }}
            >
              <p className="virtual-eyebrow">Next Move</p>
              <div className="room-action-row">
                <button
                  type="button"
                  className={`room-summary-cta studio-btn studio-btn--compact ${activeRoom.id === 'action' ? 'is-primary studio-btn--primary' : 'is-secondary studio-btn--secondary'}`}
                  onClick={handleRoomCta}
                >
                  {activeRoom.cta}
                </button>
                {linkedProjectId && (
                  <button
                    type="button"
                    className="room-summary-cta studio-btn studio-btn--secondary studio-btn--compact is-secondary"
                    onClick={openPurchaseStep}
                  >
                    {purchaseBridgeLabel}
                  </button>
                )}
              </div>
              <details className="room-more-actions">
                <summary>More actions</summary>
                <div className="room-more-actions-body">
                  <button type="button" className="room-secondary-link" onClick={goToOverview}>Back to Room Map</button>
                  <button type="button" className="room-secondary-link" onClick={resetTour}>Restart Tour</button>
                </div>
              </details>
            </section>

            <div id={proControlsId} hidden={!showProControls}>
              <>
                <section
                  key={`settings-${activeRoom.id}-${showProControls ? 'open' : 'closed'}`}
                  className="settings-panel screen-transform-shell sidebar-item-animate"
                  style={{ '--sidebar-delay': '520ms' }}
                >
                  <p className="virtual-eyebrow">Studio Controls</p>
                  <div className="settings-row">
                    <span>Theme</span>
                    <div className="chip-row">
                      {Object.keys(themePresets).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={`tiny-chip ${themeMode === mode ? 'active' : ''}`}
                          onClick={() => setThemeMode(mode)}
                          aria-pressed={themeMode === mode}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="settings-row">
                    <span>Material</span>
                    <div className="chip-row">
                      {Object.keys(materialPresets).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={`tiny-chip ${materialMode === mode ? 'active' : ''}`}
                          onClick={() => setMaterialMode(mode)}
                          aria-pressed={materialMode === mode}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="toggle-row">
                    <button type="button" className={`tiny-chip ${ambientMotion ? 'active' : ''}`} onClick={() => setAmbientMotion((v) => !v)} aria-pressed={ambientMotion}>Motion</button>
                    <button type="button" className={`tiny-chip ${narrativeEnabled ? 'active' : ''}`} onClick={() => setNarrativeEnabled((v) => !v)} aria-pressed={narrativeEnabled}>Guidance</button>
                    <button type="button" className={`tiny-chip ${soundEnabled ? 'active' : ''}`} onClick={() => setSoundEnabled((v) => !v)} aria-pressed={soundEnabled}>Sound</button>
                  </div>
                  <div className="settings-row">
                    <button type="button" className="room-secondary-link" onClick={resetPreferences}>
                      Reset Preferences
                    </button>
                  </div>
                </section>
                <section
                  key={`achievements-${activeRoom.id}-${showProControls ? 'open' : 'closed'}`}
                  className="achievement-panel screen-transform-shell sidebar-item-animate"
                  style={{ '--sidebar-delay': '580ms' }}
                >
                  <p className="virtual-eyebrow">Progress</p>
                  <div className="achievement-list">
                    {achievements.map((item) => (
                      <span key={item.id} className={`achievement-badge ${item.unlocked ? 'unlocked' : ''}`}>{item.label}</span>
                    ))}
                  </div>
                </section>
              </>
            </div>

            {narrativeLine && (
              <p
                key={`narrative-${activeStoryChapter.id}`}
                className="narrative-line sidebar-item-animate"
                style={{ '--sidebar-delay': '540ms' }}
                role="status"
                aria-live="polite"
              >
                {narrativeLine}
              </p>
            )}
            <button
              type="button"
              className="pro-controls-link"
              onClick={() => setShowProControls((v) => !v)}
              aria-expanded={showProControls}
              aria-controls={proControlsId}
            >
              {showProControls ? 'Hide Controls' : 'Show Controls'}
            </button>
          </div>
        </div>
      </>
    )}

    {phase !== 'room' && (
      <>
        <div id={proControlsId} hidden={!showProControls}>
          <>
            <section
              key={`settings-${activeRoom.id}-${showProControls ? 'open' : 'closed'}`}
              className="settings-panel screen-transform-shell sidebar-item-animate"
              style={{ '--sidebar-delay': '520ms' }}
            >
              <p className="virtual-eyebrow">Studio Controls</p>
              <div className="settings-row">
                <span>Theme</span>
                <div className="chip-row">
                  {Object.keys(themePresets).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`tiny-chip ${themeMode === mode ? 'active' : ''}`}
                      onClick={() => setThemeMode(mode)}
                      aria-pressed={themeMode === mode}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span>Material</span>
                <div className="chip-row">
                  {Object.keys(materialPresets).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`tiny-chip ${materialMode === mode ? 'active' : ''}`}
                      onClick={() => setMaterialMode(mode)}
                      aria-pressed={materialMode === mode}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              <div className="toggle-row">
                <button type="button" className={`tiny-chip ${ambientMotion ? 'active' : ''}`} onClick={() => setAmbientMotion((v) => !v)} aria-pressed={ambientMotion}>Motion</button>
                <button type="button" className={`tiny-chip ${narrativeEnabled ? 'active' : ''}`} onClick={() => setNarrativeEnabled((v) => !v)} aria-pressed={narrativeEnabled}>Guidance</button>
                <button type="button" className={`tiny-chip ${soundEnabled ? 'active' : ''}`} onClick={() => setSoundEnabled((v) => !v)} aria-pressed={soundEnabled}>Sound</button>
              </div>
              <div className="settings-row">
                <button type="button" className="room-secondary-link" onClick={resetPreferences}>
                  Reset Preferences
                </button>
              </div>
            </section>
            <section
              key={`achievements-${activeRoom.id}-${showProControls ? 'open' : 'closed'}`}
              className="achievement-panel screen-transform-shell sidebar-item-animate"
              style={{ '--sidebar-delay': '580ms' }}
            >
              <p className="virtual-eyebrow">Progress</p>
              <div className="achievement-list">
                {achievements.map((item) => (
                  <span key={item.id} className={`achievement-badge ${item.unlocked ? 'unlocked' : ''}`}>{item.label}</span>
                ))}
              </div>
            </section>
          </>
        </div>

        {narrativeLine && (
          <p
            key={`narrative-${activeStoryChapter.id}`}
            className="narrative-line sidebar-item-animate"
            style={{ '--sidebar-delay': '540ms' }}
            role="status"
            aria-live="polite"
          >
            {narrativeLine}
          </p>
        )}
        <button
          type="button"
          className="pro-controls-link"
          onClick={() => setShowProControls((v) => !v)}
          aria-expanded={showProControls}
          aria-controls={proControlsId}
        >
          {showProControls ? 'Hide Controls' : 'Show Controls'}
        </button>
      </>
    )}

    <p className="sr-only" role="status" aria-live="polite">
      {tourStatus}
    </p>
    </aside>
  );
};

export default Sidebar;
