/**
 * Static data and pure camera utilities for the Virtual Tour experience.
 */
const BRAND_AMBER = '#a58b67';
const BRAND_WINE = '#53656e';
const BRAND_CHOCOLATE = '#42535b';
const BRAND_COFFEE = '#201915';
const TONE_WARM = '#2b1a12';
const TONE_DEEP = '#140a07';
const TONE_WINE = '#25130f';

const storyRooms = [
  {
    id: 'atrium',
    name: 'Bedroom Studio',
    title: 'Scan Your Bedroom. Get a Plan Built for It.',
    emoji: 'BR',
    icon: 'bed',
    promise: 'Capture your bedroom once and receive a plan that already fits.',
    proof: 'The scan captures scale, openings, and light for room-true suggestions.',
    problem: 'Bedroom inspiration rarely matches real dimensions.',
    method: 'We map the room, then generate layout and style options for your footprint.',
    nextStep: 'Scan your bedroom and save your first tailored board.',
    summary: {
      purpose: 'Capture your bedroom once and get a plan that already fits.',
      features: ['Wall + floor mapping', 'Light + opening detection', 'Auto-fit layout proposals'],
      takeaway: 'You start with confidence before moving a single piece.',
    },
    metric: { label: 'Client Clarity', before: 42, after: 89, suffix: '%' },
    cta: 'Scan Bedroom',
    accent: BRAND_AMBER,
    toneA: TONE_WARM,
    toneB: TONE_DEEP,
    glow: 'rgba(255, 230, 167, 0.16)',
    plan: { x: 22, y: 28, w: 20, h: 16 },
    scene: [
      { id: 'a-1', kind: 'panel', x: '22%', y: '42%', z: 42, r: -6, s: 1.1, px: 10, py: 7, w: 86, h: 46 },
      { id: 'a-2', kind: 'table', x: '55%', y: '64%', z: 18, r: 4, s: 1.02, px: 6, py: 4, w: 84, h: 18 },
      { id: 'a-3', kind: 'fixture', x: '80%', y: '38%', z: 22, r: 5, s: 0.96, px: 5, py: 4, w: 24, h: 34 },
    ],
  },
  {
    id: 'pain',
    name: 'Living Room Explorer',
    title: 'Compare Living Room Concepts in Minutes',
    emoji: 'LR',
    icon: 'sofa',
    promise: 'Compare living room concepts directly on your scanned space.',
    proof: 'A swipeable feed applies each idea to your real layout.',
    problem: 'People bounce between apps and screenshots just to compare ideas.',
    method: 'We keep every option in one room-true feed.',
    nextStep: 'Open the feed and pin three directions.',
    summary: {
      purpose: 'Compare living room ideas fast in your exact space.',
      features: ['Swipeable concept feed', 'Side-by-side pinning', 'Room-true scale previews'],
      takeaway: 'You pick a direction without second-guessing.',
    },
    metric: { label: 'Project Delay Risk', before: 61, after: 18, suffix: '%' },
    cta: 'Open Idea Feed',
    accent: BRAND_CHOCOLATE,
    toneA: TONE_WARM,
    toneB: TONE_DEEP,
    glow: 'rgba(187, 148, 87, 0.18)',
    plan: { x: 48, y: 28, w: 20, h: 16 },
    scene: [
      { id: 'p-1', kind: 'panel', x: '24%', y: '38%', z: 44, r: -7, s: 1.08, px: 11, py: 7, w: 92, h: 44 },
      { id: 'p-2', kind: 'fixture', x: '53%', y: '24%', z: 20, r: 0, s: 0.95, px: 5, py: 5, w: 18, h: 42 },
      { id: 'p-3', kind: 'table', x: '79%', y: '61%', z: 18, r: 6, s: 1.0, px: 6, py: 4, w: 80, h: 16 },
    ],
  },
  {
    id: 'solution',
    name: 'Kitchen Planner',
    title: 'Plan a Kitchen That Works as Good as It Looks',
    emoji: 'KT',
    icon: 'kitchen',
    promise: 'Get upgrade ideas that respect workflow, storage, and circulation.',
    proof: 'Suggestions align with zones and the work‑triangle flow.',
    problem: 'Great-looking kitchens can fail in daily use.',
    method: 'We score upgrades by function, style, and budget.',
    nextStep: 'Generate a plan and compare scores.',
    summary: {
      purpose: 'Balance beauty with workflow in a usable kitchen plan.',
      features: ['Zone mapping', 'Work‑triangle scoring', 'Budget-aware upgrades'],
      takeaway: 'Every choice feels practical and premium.',
    },
    metric: { label: 'Revision Rounds', before: 7, after: 3, suffix: ' rounds' },
    cta: 'Generate Kitchen Plan',
    accent: BRAND_WINE,
    toneA: TONE_WINE,
    toneB: TONE_DEEP,
    glow: 'rgba(111, 29, 27, 0.2)',
    plan: { x: 74, y: 28, w: 20, h: 16 },
    scene: [
      { id: 's-1', kind: 'panel', x: '20%', y: '40%', z: 42, r: -6, s: 1.08, px: 10, py: 6, w: 88, h: 44 },
      { id: 's-2', kind: 'table', x: '54%', y: '63%', z: 18, r: 3, s: 1.04, px: 7, py: 4, w: 84, h: 18 },
      { id: 's-3', kind: 'fixture', x: '79%', y: '35%', z: 20, r: 6, s: 0.96, px: 6, py: 5, w: 24, h: 28 },
    ],
  },
  {
    id: 'transform',
    name: 'Bathroom Refresh',
    title: 'See Your Bathroom Upgrade Before You Commit',
    emoji: 'BT',
    icon: 'bath',
    promise: 'Preview finishes, vanity, and lighting as a live before/after.',
    proof: 'You see exactly how each material shifts the room.',
    problem: 'Bathroom decisions feel risky when changes are only described.',
    method: 'We render side‑by‑side comparisons for confident choices.',
    nextStep: 'Drag the slider and save your preferred concept.',
    summary: {
      purpose: 'See the before/after impact before you commit.',
      features: ['Live finish overlays', 'Material confidence cues', 'One-click saves'],
      takeaway: 'You decide with clarity, not risk.',
    },
    metric: { label: 'Design Confidence', before: 48, after: 93, suffix: '%' },
    cta: 'Open Before/After',
    accent: BRAND_AMBER,
    toneA: TONE_WARM,
    toneB: TONE_DEEP,
    glow: 'rgba(153, 88, 42, 0.2)',
    plan: { x: 22, y: 55, w: 20, h: 16 },
    scene: [
      { id: 't-1', kind: 'panel', x: '25%', y: '39%', z: 44, r: -5, s: 1.1, px: 10, py: 7, w: 92, h: 48 },
      { id: 't-2', kind: 'fixture', x: '54%', y: '25%', z: 20, r: 0, s: 0.95, px: 5, py: 5, w: 18, h: 42 },
      { id: 't-3', kind: 'table', x: '79%', y: '61%', z: 18, r: 5, s: 1.02, px: 6, py: 4, w: 84, h: 16 },
    ],
  },
  {
    id: 'proof',
    name: 'Home Office Setup',
    title: 'Build a Home Office That Improves Focus',
    emoji: 'OF',
    icon: 'desk',
    promise: 'Design an office layout tuned to workflow, light, and space.',
    proof: 'Desk placement and lighting angles are optimized for the scan.',
    problem: 'Office inspiration looks good but underperforms in daily use.',
    method: 'We pair visual style with productivity metrics.',
    nextStep: 'Review layouts and select your focus-ready setup.',
    summary: {
      purpose: 'Design a workspace that improves focus.',
      features: ['Ergonomic layout checks', 'Light-angle guidance', 'Focus scoring'],
      takeaway: 'Work feels easier on day one.',
    },
    metric: { label: 'Sign-off Speed', before: 11, after: 4, suffix: ' days' },
    cta: 'Review Office Setup',
    accent: BRAND_CHOCOLATE,
    toneA: TONE_WARM,
    toneB: TONE_DEEP,
    glow: 'rgba(187, 148, 87, 0.18)',
    plan: { x: 48, y: 55, w: 20, h: 16 },
    scene: [
      { id: 'r-1', kind: 'panel', x: '23%', y: '38%', z: 42, r: -4, s: 1.06, px: 10, py: 6, w: 90, h: 42 },
      { id: 'r-2', kind: 'table', x: '57%', y: '62%', z: 18, r: 4, s: 1.03, px: 6, py: 4, w: 86, h: 16 },
      { id: 'r-3', kind: 'fixture', x: '80%', y: '38%', z: 20, r: 6, s: 0.95, px: 5, py: 4, w: 24, h: 26 },
    ],
  },
  {
    id: 'action',
    name: 'Whole Home Plan',
    title: 'Unify Every Room Into One Cohesive Plan',
    emoji: 'WH',
    icon: 'home',
    promise: 'Combine all room decisions into a single style roadmap.',
    proof: 'The app compiles your choices into phases and next steps.',
    problem: 'Room‑by‑room designs clash without a whole‑home plan.',
    method: 'We stitch your selections into one cohesive direction.',
    nextStep: 'Book a consultation to finalize your roadmap.',
    summary: {
      purpose: 'Unify every room into one cohesive plan.',
      features: ['Cross-room palette alignment', 'Phased rollout steps', 'Consult-ready roadmap'],
      takeaway: 'Your home feels intentional end-to-end.',
    },
    metric: { label: 'Launch Readiness', before: 36, after: 95, suffix: '%' },
    cta: 'Book Whole-Home Consult',
    accent: BRAND_WINE,
    toneA: TONE_WINE,
    toneB: TONE_DEEP,
    glow: 'rgba(255, 230, 167, 0.16)',
    plan: { x: 74, y: 55, w: 20, h: 16 },
    scene: [
      { id: 'c-1', kind: 'panel', x: '24%', y: '38%', z: 44, r: -5, s: 1.08, px: 10, py: 7, w: 92, h: 44 },
      { id: 'c-2', kind: 'fixture', x: '54%', y: '24%', z: 20, r: 0, s: 0.95, px: 5, py: 5, w: 18, h: 42 },
      { id: 'c-3', kind: 'table', x: '80%', y: '62%', z: 18, r: 5, s: 1.0, px: 6, py: 4, w: 84, h: 16 },
    ],
  },
];

const themePresets = {
  story: { bgA: '#120a07', bgB: '#1b100b', panel: '#1a0f0b' },
  minimal: { bgA: '#0f0906', bgB: '#1a0f0b', panel: '#160c09' },
  editorial: { bgA: '#140b08', bgB: '#22140d', panel: '#1b100b' },
};

const materialPresets = {
  walnut: { floor: BRAND_COFFEE, wall: '#2f1b12', roof: BRAND_AMBER },
  stone: { floor: '#3a2418', wall: '#26160f', roof: BRAND_CHOCOLATE },
  soft: { floor: '#4a2f21', wall: '#2b1a12', roof: BRAND_WINE },
};

const storyHotspots = {
  atrium: [
    { id: 'atr-1', title: 'Bed + Wall Scan', description: 'Scan the bed wall and floor area to generate realistic layout-safe bedroom styles.', x: 24, y: 30 },
    { id: 'atr-2', title: 'Style Match Results', description: 'The app returns curated bedroom themes based on your room size, light, and existing furniture.', x: 70, y: 42 },
  ],
  pain: [
    { id: 'pain-1', title: 'Scroll Idea Feed', description: 'Swipe through AI-generated living room layouts and compare mood, comfort, and style direction.', x: 30, y: 35 },
    { id: 'pain-2', title: 'Save + Compare', description: 'Pin your favorite options and compare them side-by-side before committing.', x: 66, y: 50 },
  ],
  solution: [
    { id: 'sol-1', title: 'Kitchen Zone Mapping', description: 'The scan maps prep, cook, and storage zones to guide practical kitchen upgrades.', x: 28, y: 48 },
    { id: 'sol-2', title: 'Smart Upgrade Picks', description: 'See cabinet, countertop, and lighting suggestions ranked by fit and impact.', x: 68, y: 30 },
  ],
  transform: [
    { id: 'tr-1', title: 'Before/After Overlay', description: 'Drag the slider to reveal how your bathroom changes with each selected finish package.', x: 36, y: 36 },
    { id: 'tr-2', title: 'Material Confidence', description: 'Review texture and color combinations in-context before you finalize selections.', x: 74, y: 56 },
  ],
  proof: [
    { id: 'pr-1', title: 'Workflow Fit', description: 'The office planner aligns desk orientation and lighting with your daily work pattern.', x: 36, y: 36 },
    { id: 'pr-2', title: 'Comfort + Focus Score', description: 'Each layout includes focus and ergonomics scoring so style also performs.', x: 74, y: 56 },
  ],
  action: [
    { id: 'ac-1', title: 'Whole-Home Sync', description: 'Combine saved room concepts into one cohesive style system for your home.', x: 36, y: 36 },
    { id: 'ac-2', title: 'Consultation Launch', description: 'Book your session to convert app-selected ideas into a final action-ready plan.', x: 74, y: 56 },
  ],
};

const blueprintNodeLabels = {
  atrium: 'Bedroom',
  pain: 'Living Room',
  solution: 'Kitchen',
  transform: 'Bathroom',
  proof: 'Office',
  action: 'Whole Home',
};

const CAMERA_EYE_LEVEL = 1.6;
const CAMERA_ANIMATION_DURATION = 2500;

const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

const createWaypoint = (x, z, y = CAMERA_EYE_LEVEL) => ({ x, y, z });

const mapPlanToCameraLane = (plan) => {
  const centerX = plan.x + plan.w / 2;
  const centerY = plan.y + plan.h / 2;
  return {
    x: Number((clampValue((centerX - 50) / 50, -1, 1) * 5.1).toFixed(2)),
    z: Number(clampValue(14 - ((centerY - 50) / 50) * 2.4, 9.5, 17.5).toFixed(2)),
  };
};

const buildRoomCameraPath = (room) => {
  const lane = mapPlanToCameraLane(room.plan);
  return [
    createWaypoint(0, 21.5),
    createWaypoint(lane.x * 0.3, 18.2),
    createWaypoint(lane.x * 0.7, 14.3),
    createWaypoint(lane.x, lane.z),
  ];
};

const subtractVector = (from, to) => ({
  x: to.x - from.x,
  y: to.y - from.y,
  z: to.z - from.z,
});

const normalizeVector = (vector) => {
  const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
};

const catmullRomPoint = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z: 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
};

const sampleSplinePoint = (points, progress) => {
  if (points.length === 0) return createWaypoint(0, 50);
  if (points.length === 1) return points[0];

  const segmentCount = points.length - 1;
  const clampedProgress = clampValue(progress, 0, 1);
  const scaled = clampedProgress * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaled));
  const localT = scaled - segmentIndex;
  const p0 = points[Math.max(0, segmentIndex - 1)];
  const p1 = points[segmentIndex];
  const p2 = points[Math.min(segmentIndex + 1, points.length - 1)];
  const p3 = points[Math.min(segmentIndex + 2, points.length - 1)];
  return catmullRomPoint(p0, p1, p2, p3, localT);
};

const getSplinePose = (points, progress) => {
  const position = sampleSplinePoint(points, progress);
  const lookAhead = sampleSplinePoint(points, clampValue(progress + 0.035, 0, 1));
  return {
    position,
    tangent: normalizeVector(subtractVector(position, lookAhead)),
  };
};

const mapSplinePoseToStage = ({ position, tangent }) => {
  const lateralTurn = tangent.z === 0 ? tangent.x * 10 : (tangent.x / Math.abs(tangent.z)) * 8.5;
  const pitch = tangent.z === 0 ? 0 : (tangent.y / Math.abs(tangent.z)) * 8;
  return {
    cameraDolly: clampValue(position.z, 8, 60),
    lookAtOffset: {
      x: Number(clampValue(lateralTurn + position.x * 0.18, -8, 8).toFixed(2)),
      y: Number(clampValue(pitch, -3.5, 3.5).toFixed(2)),
    },
    nudge: {
      x: Number(clampValue(position.x * 0.22, -1.6, 1.6).toFixed(2)),
      y: Number(clampValue((CAMERA_EYE_LEVEL - position.y) * 2.2, -0.8, 0.8).toFixed(2)),
    },
    position,
  };
};

const storyChapters = [
  {
    id: 'outside',
    title: 'Outside Arrival',
    narrationText: 'Guidance: Begin at the front door to start the guided Home4U tour.',
    cameraPath: [
      createWaypoint(-0.45, 56),
      createWaypoint(-0.25, 52),
      createWaypoint(0.1, 47),
      createWaypoint(0, 42),
    ],
  },
  {
    id: 'foyer',
    title: 'The Foyer',
    narrationText: 'Guidance: You are moving through the entry sequence and into the room map of the home.',
    cameraPath: [
      createWaypoint(0, 42),
      createWaypoint(0.2, 35),
      createWaypoint(0, 28),
      createWaypoint(0, 21.5),
    ],
  },
  ...storyRooms.map((room) => ({
    id: room.id,
    title: room.name,
    narrationText: `Guidance: ${room.promise}`,
    cameraPath: buildRoomCameraPath(room),
    framework: {
      problem: room.problem,
      method: room.method,
      proof: room.proof,
      nextStep: room.nextStep,
    },
  })),
];

const initialStageCamera = mapSplinePoseToStage(getSplinePose(storyChapters[0].cameraPath, 0));

export {
  storyRooms,
  themePresets,
  materialPresets,
  storyHotspots,
  blueprintNodeLabels,
  CAMERA_ANIMATION_DURATION,
  clampValue,
  getSplinePose,
  mapSplinePoseToStage,
  storyChapters,
  initialStageCamera,
};
