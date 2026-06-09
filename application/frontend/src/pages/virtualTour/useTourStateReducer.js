const createInitialTourState = () => ({
  phase: 'outside',
  activeIndex: 0,
  selectedHotspotId: null,
  visitedHotspots: {},
  focusCue: 0,
  hotspotTransitioning: false,
  doorZooming: false,
  isEnteringHome: false,
  roomZooming: false,
  phaseTransitioning: false,
  blueprintIntroTick: 0,
  outsideChapter: 0,
  storyProgress: 52,
  isGeneratingPlan: false,
  transformSweepTick: 0,
  visitedRooms: new Set(),
  showBookingModal: false,
  bookingSubmitted: false,
  bookingSubmitting: false,
  bookingSubmitError: '',
  bookingFieldErrors: {},
  bookingForm: {
    name: '',
    email: '',
    date: '',
    notes: '',
  },
  showFullDetails: false,
  showProControls: false,
  introPassed: false,
  introRevealing: false,
  activeSection: 'problem',
  autoOpenedSection: null,
  showOrbitHint: false,
  hasInteracted: false,
  userInterrupted: false,
});

const resolveUpdate = (current, updater) => (
  typeof updater === 'function' ? updater(current) : updater
);

const tourStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, phase: resolveUpdate(state.phase, action.updater) };
    case 'SET_ACTIVE_INDEX':
      return { ...state, activeIndex: resolveUpdate(state.activeIndex, action.updater) };
    case 'SET_SELECTED_HOTSPOT_ID':
      return { ...state, selectedHotspotId: resolveUpdate(state.selectedHotspotId, action.updater) };
    case 'SET_VISITED_HOTSPOTS':
      return { ...state, visitedHotspots: resolveUpdate(state.visitedHotspots, action.updater) };
    case 'SET_FOCUS_CUE':
      return { ...state, focusCue: resolveUpdate(state.focusCue, action.updater) };
    case 'SET_HOTSPOT_TRANSITIONING':
      return { ...state, hotspotTransitioning: resolveUpdate(state.hotspotTransitioning, action.updater) };
    case 'SET_DOOR_ZOOMING':
      return { ...state, doorZooming: resolveUpdate(state.doorZooming, action.updater) };
    case 'SET_IS_ENTERING_HOME':
      return { ...state, isEnteringHome: resolveUpdate(state.isEnteringHome, action.updater) };
    case 'SET_ROOM_ZOOMING':
      return { ...state, roomZooming: resolveUpdate(state.roomZooming, action.updater) };
    case 'SET_PHASE_TRANSITIONING':
      return { ...state, phaseTransitioning: resolveUpdate(state.phaseTransitioning, action.updater) };
    case 'SET_BLUEPRINT_INTRO_TICK':
      return { ...state, blueprintIntroTick: resolveUpdate(state.blueprintIntroTick, action.updater) };
    case 'SET_OUTSIDE_CHAPTER':
      return { ...state, outsideChapter: resolveUpdate(state.outsideChapter, action.updater) };
    case 'SET_STORY_PROGRESS':
      return { ...state, storyProgress: resolveUpdate(state.storyProgress, action.updater) };
    case 'SET_IS_GENERATING_PLAN':
      return { ...state, isGeneratingPlan: resolveUpdate(state.isGeneratingPlan, action.updater) };
    case 'SET_TRANSFORM_SWEEP_TICK':
      return { ...state, transformSweepTick: resolveUpdate(state.transformSweepTick, action.updater) };
    case 'SET_VISITED_ROOMS':
      return { ...state, visitedRooms: resolveUpdate(state.visitedRooms, action.updater) };
    case 'SET_SHOW_BOOKING_MODAL':
      return { ...state, showBookingModal: resolveUpdate(state.showBookingModal, action.updater) };
    case 'SET_BOOKING_SUBMITTED':
      return { ...state, bookingSubmitted: resolveUpdate(state.bookingSubmitted, action.updater) };
    case 'SET_BOOKING_SUBMITTING':
      return { ...state, bookingSubmitting: resolveUpdate(state.bookingSubmitting, action.updater) };
    case 'SET_BOOKING_SUBMIT_ERROR':
      return { ...state, bookingSubmitError: resolveUpdate(state.bookingSubmitError, action.updater) };
    case 'SET_BOOKING_FIELD_ERRORS':
      return { ...state, bookingFieldErrors: resolveUpdate(state.bookingFieldErrors, action.updater) };
    case 'SET_BOOKING_FORM':
      return { ...state, bookingForm: resolveUpdate(state.bookingForm, action.updater) };
    case 'SET_SHOW_FULL_DETAILS':
      return { ...state, showFullDetails: resolveUpdate(state.showFullDetails, action.updater) };
    case 'SET_SHOW_PRO_CONTROLS':
      return { ...state, showProControls: resolveUpdate(state.showProControls, action.updater) };
    case 'SET_INTRO_PASSED':
      return { ...state, introPassed: resolveUpdate(state.introPassed, action.updater) };
    case 'SET_INTRO_REVEALING':
      return { ...state, introRevealing: resolveUpdate(state.introRevealing, action.updater) };
    case 'SET_ACTIVE_SECTION':
      return { ...state, activeSection: resolveUpdate(state.activeSection, action.updater) };
    case 'SET_AUTO_OPENED_SECTION':
      return { ...state, autoOpenedSection: resolveUpdate(state.autoOpenedSection, action.updater) };
    case 'SET_SHOW_ORBIT_HINT':
      return { ...state, showOrbitHint: resolveUpdate(state.showOrbitHint, action.updater) };
    case 'SET_HAS_INTERACTED':
      return { ...state, hasInteracted: resolveUpdate(state.hasInteracted, action.updater) };
    case 'SET_USER_INTERRUPTED':
      return { ...state, userInterrupted: resolveUpdate(state.userInterrupted, action.updater) };
    case 'GO_TO_BLUEPRINT': {
      const bumpIntroTick = Boolean(action.bumpIntroTick);
      return {
        ...state,
        phase: 'blueprint',
        selectedHotspotId: null,
        hotspotTransitioning: false,
        blueprintIntroTick: bumpIntroTick ? state.blueprintIntroTick + 1 : state.blueprintIntroTick,
      };
    }
    case 'GO_TO_OUTSIDE':
      return {
        ...state,
        phase: 'outside',
        outsideChapter: 0,
        selectedHotspotId: null,
        hotspotTransitioning: false,
      };
    case 'GO_TO_ROOM': {
      const nextVisitedRooms = new Set(state.visitedRooms);
      nextVisitedRooms.add(action.roomId);
      return {
        ...state,
        phase: 'room',
        activeIndex: action.index,
        visitedRooms: nextVisitedRooms,
      };
    }
    case 'RESET_TOUR_STATE':
      return createInitialTourState();
    default:
      return state;
  }
};

export { createInitialTourState, tourStateReducer };
