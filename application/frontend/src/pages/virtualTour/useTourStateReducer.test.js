import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialTourState, tourStateReducer } from './useTourStateReducer.js';

test('GO_TO_BLUEPRINT switches phase and optionally bumps intro tick', () => {
  const initial = createInitialTourState();

  const withoutBump = tourStateReducer(initial, { type: 'GO_TO_BLUEPRINT' });
  assert.equal(withoutBump.phase, 'blueprint');
  assert.equal(withoutBump.blueprintIntroTick, 0);

  const withBump = tourStateReducer(withoutBump, { type: 'GO_TO_BLUEPRINT', bumpIntroTick: true });
  assert.equal(withBump.phase, 'blueprint');
  assert.equal(withBump.blueprintIntroTick, 1);
});

test('GO_TO_ROOM enters room phase and tracks visited room id', () => {
  const initial = createInitialTourState();
  const next = tourStateReducer(initial, { type: 'GO_TO_ROOM', index: 2, roomId: 'solution' });

  assert.equal(next.phase, 'room');
  assert.equal(next.activeIndex, 2);
  assert.equal(next.visitedRooms.has('solution'), true);
});

test('hotspot and booking setter actions apply updater functions safely', () => {
  const initial = createInitialTourState();
  const withHotspotMap = tourStateReducer(initial, {
    type: 'SET_VISITED_HOTSPOTS',
    updater: (prev) => ({ ...prev, pain: new Set(['pain-1']) }),
  });

  assert.equal(withHotspotMap.visitedHotspots.pain.has('pain-1'), true);

  const withBookingField = tourStateReducer(withHotspotMap, {
    type: 'SET_BOOKING_FORM',
    updater: (prev) => ({ ...prev, email: 'jane@example.com' }),
  });

  assert.equal(withBookingField.bookingForm.email, 'jane@example.com');

  const withSection = tourStateReducer(withBookingField, {
    type: 'SET_ACTIVE_SECTION',
    updater: 'method',
  });
  assert.equal(withSection.activeSection, 'method');
});

test('RESET_TOUR_STATE restores initial defaults', () => {
  const initial = createInitialTourState();
  const dirty = {
    ...initial,
    phase: 'room',
    activeIndex: 5,
    showBookingModal: true,
    bookingSubmitted: true,
    storyProgress: 100,
    visitedRooms: new Set(['action']),
    showProControls: true,
    hasInteracted: true,
  };

  const reset = tourStateReducer(dirty, { type: 'RESET_TOUR_STATE' });
  const fresh = createInitialTourState();

  assert.equal(reset.phase, fresh.phase);
  assert.equal(reset.activeIndex, fresh.activeIndex);
  assert.equal(reset.showBookingModal, fresh.showBookingModal);
  assert.equal(reset.bookingSubmitted, fresh.bookingSubmitted);
  assert.equal(reset.storyProgress, fresh.storyProgress);
  assert.equal(reset.showProControls, fresh.showProControls);
  assert.equal(reset.hasInteracted, fresh.hasInteracted);
  assert.equal(reset.visitedRooms.size, 0);
});

test('full journey scenario: outside to room, hotspot, booking, reset', () => {
  let state = createInitialTourState();

  state = tourStateReducer(state, { type: 'GO_TO_BLUEPRINT', bumpIntroTick: true });
  assert.equal(state.phase, 'blueprint');
  assert.equal(state.blueprintIntroTick, 1);

  state = tourStateReducer(state, { type: 'GO_TO_ROOM', index: 5, roomId: 'action' });
  assert.equal(state.phase, 'room');
  assert.equal(state.activeIndex, 5);
  assert.equal(state.visitedRooms.has('action'), true);

  state = tourStateReducer(state, { type: 'SET_SELECTED_HOTSPOT_ID', updater: 'ac-1' });
  state = tourStateReducer(state, { type: 'SET_FOCUS_CUE', updater: (value) => value + 1 });
  state = tourStateReducer(state, {
    type: 'SET_VISITED_HOTSPOTS',
    updater: (prev) => ({ ...prev, action: new Set(['ac-1']) }),
  });
  assert.equal(state.selectedHotspotId, 'ac-1');
  assert.equal(state.focusCue, 1);
  assert.equal(state.visitedHotspots.action.has('ac-1'), true);

  state = tourStateReducer(state, { type: 'SET_SHOW_BOOKING_MODAL', updater: true });
  state = tourStateReducer(state, { type: 'SET_BOOKING_SUBMITTED', updater: true });
  assert.equal(state.showBookingModal, true);
  assert.equal(state.bookingSubmitted, true);

  state = tourStateReducer(state, { type: 'RESET_TOUR_STATE' });
  assert.equal(state.phase, 'outside');
  assert.equal(state.selectedHotspotId, null);
  assert.equal(state.showBookingModal, false);
  assert.equal(state.bookingSubmitted, false);
  assert.equal(state.visitedRooms.size, 0);
});
