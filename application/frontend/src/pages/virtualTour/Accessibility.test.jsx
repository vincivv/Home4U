import { createRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Stage from './Stage';
import Sidebar from './Sidebar';

const storyRooms = [
  {
    id: 'living',
    name: 'Living Room',
    title: 'Social hub',
    icon: 'sofa',
    accent: '#a58b67',
    toneA: '#f0e5d7',
    toneB: '#c5b59f',
    glow: '#f1d6a1',
    promise: 'A warm entertaining zone.',
    metric: { label: 'Comfort', before: 62, after: 88, suffix: '%' },
    cta: 'Request Living Room Plan',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    title: 'Prep zone',
    icon: 'kitchen',
    accent: '#8d6e63',
    toneA: '#efe4d8',
    toneB: '#d3b89c',
    glow: '#efc78e',
    promise: 'A cleaner workflow for prep and storage.',
    metric: { label: 'Efficiency', before: 58, after: 84, suffix: '%' },
    cta: 'Request Kitchen Plan',
  },
];

const phaseSteps = [
  { id: 'outside', label: 'Entry' },
  { id: 'blueprint', label: 'Map' },
  { id: 'room', label: 'Review' },
];

const stageBaseProps = {
  phase: 'blueprint',
  doorZooming: false,
  roomZooming: false,
  phaseTransitioning: false,
  ambientMotion: false,
  introRevealing: false,
  isDragging: false,
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  phaseSteps,
  currentPhaseStep: 1,
  particles: [],
  isEnteringHome: false,
  enterHouse: () => {},
  blueprintMounted: true,
  blueprintIntroTick: 1,
  blueprintEntered: true,
  hoveredRoomId: null,
  storyRooms,
  activeIndex: 1,
  openRoomFromBlueprint: () => {},
  setHoveredRoomId: () => {},
  blueprintNodeLabels: {
    living: 'Living Room',
    kitchen: 'Kitchen',
  },
  hotspots: [],
  selectedHotspotId: null,
  openHotspot: () => {},
  activeRoom: storyRooms[1],
  hotspotTransitioning: false,
  roomShellRef: createRef(),
  roomAtmoRef: createRef(),
  roomIllustration: null,
  showOrbitHint: false,
  goToRoomIndex: () => {},
  handleDockBack: () => {},
  dockBackDisabled: false,
  dockBackLabel: 'Back',
  goToOverview: () => {},
  dockOverviewDisabled: false,
  handleDockPrimary: () => {},
  dockPrimaryDisabled: false,
  dockPrimaryLabel: 'Next',
};

const sidebarBaseProps = {
  phase: 'room',
  currentPhaseStep: 2,
  phaseSteps,
  currentPhaseLabel: 'Review',
  storyRooms,
  enterHouse: () => {},
  isEnteringHome: false,
  phaseTransitioning: false,
  activeRoom: storyRooms[0],
  activeIndex: 0,
  openRoomFromBlueprint: () => {},
  showFullDetails: false,
  setShowFullDetails: () => {},
  activeStoryChapter: {
    id: 'living-room',
    narrationText: 'Guide: Review the core layout, evidence, and outcomes for this room.',
  },
  roomSummary: {
    purpose: 'A welcoming gathering space.',
    features: ['Layered lighting', 'Flexible seating'],
    takeaway: 'Use contrast and circulation to improve comfort.',
  },
  introRevealing: false,
  detailScrollRef: createRef(),
  onDetailScroll: () => {},
  chapterChangeKey: 'living-room',
  introPassed: true,
  jumpToDetails: () => {},
  detailBodyRef: createRef(),
  frameworkPanels: [],
  activeSection: null,
  autoOpenedSection: null,
  setAutoOpenedSection: () => {},
  handleManualSectionChange: () => {},
  revealEvidence: true,
  insightsTotal: 3,
  insightsValue: 1,
  insightsLabel: '1 of 3 insights reviewed',
  roomComplete: false,
  selectedHotspot: {
    id: 'reading-nook',
    title: 'Reading Nook',
    description: 'Add layered lighting to support evening reading.',
  },
  focusCue: 0,
  handleRoomCta: () => {},
  hotspots: [
    {
      id: 'reading-nook',
      title: 'Reading Nook',
      description: 'Add layered lighting to support evening reading.',
    },
  ],
  selectedHotspotId: 'reading-nook',
  openHotspot: () => {},
  revealOutcome: false,
  isGeneratingPlan: false,
  transformSweepTick: 0,
  handleGeneratePlan: () => {},
  storyMetric: 72,
  storyProgress: 60,
  setStoryProgress: () => {},
  revealDeepControls: false,
  visitedRooms: new Set(['living']),
  goToOverview: () => {},
  resetTour: () => {},
  showProControls: true,
  themePresets: {
    calm: {},
    vivid: {},
  },
  themeMode: 'calm',
  setThemeMode: () => {},
  materialPresets: {
    oak: {},
    stone: {},
  },
  materialMode: 'oak',
  setMaterialMode: () => {},
  ambientMotion: true,
  setAmbientMotion: () => {},
  resetPreferences: () => {},
  narrativeEnabled: false,
  setNarrativeEnabled: () => {},
  soundEnabled: true,
  setSoundEnabled: () => {},
  achievements: [
    { id: 'tour-started', label: 'Tour Started', unlocked: true },
  ],
  narrativeLine: '',
  setShowProControls: () => {},
  demoMode: true,
  demoStyleName: 'Scandinavian',
};

describe('Virtual tour accessibility', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks the active blueprint room as the current location', () => {
    render(<Stage {...stageBaseProps} />);

    expect(screen.getByRole('button', { name: /kitchen/i })).toHaveAttribute('aria-current', 'location');
  });

  it('exposes expanded and pressed state for room and pro controls', () => {
    render(<Sidebar {...sidebarBaseProps} />);

    const showDetailsButtons = screen.getAllByRole('button', { name: /show details/i });
    expect(showDetailsButtons[0]).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: /hide controls/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'calm' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'oak' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /motion/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /guidance/i })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /sound/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/living room room selected\. reading nook insight is active\./i)).toBeInTheDocument();
  });
});
