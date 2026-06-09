import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateBookingForm,
  sanitizeBookingForm,
  getBookingSubmitState,
} from './useTourRoomInteractions.js';

const toLocalIsoDate = (date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const plusDays = (days) => {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return toLocalIsoDate(value);
};

const createValidForm = () => ({
  name: 'Jane Doe',
  email: 'jane@example.com',
  date: plusDays(1),
  notes: 'Looking for a modernization roadmap.',
});

test('validateBookingForm flags invalid fields and past dates', () => {
  const errors = validateBookingForm({
    name: ' ',
    email: 'not-an-email',
    date: plusDays(-1),
    notes: 'x'.repeat(501),
  });

  assert.equal(errors.name, 'Enter your full name.');
  assert.equal(errors.email, 'Enter a valid email address.');
  assert.equal(errors.date, 'Preferred date cannot be in the past.');
  assert.equal(errors.notes, 'Keep notes under 500 characters.');
});

test('sanitizeBookingForm trims name, email, and notes input', () => {
  const sanitized = sanitizeBookingForm({
    name: '  Jane Doe  ',
    email: '  jane@example.com ',
    date: plusDays(2),
    notes: '  Need details   ',
  });

  assert.equal(sanitized.name, 'Jane Doe');
  assert.equal(sanitized.email, 'jane@example.com');
  assert.equal(sanitized.notes, 'Need details');
});

test('getBookingSubmitState returns noop while submission is in progress', () => {
  const state = getBookingSubmitState({
    bookingForm: createValidForm(),
    bookingSubmitting: true,
    isOnline: true,
  });

  assert.deepEqual(state, { type: 'noop' });
});

test('getBookingSubmitState returns invalid state with field errors', () => {
  const state = getBookingSubmitState({
    bookingForm: { name: '', email: '', date: '', notes: '' },
    bookingSubmitting: false,
    isOnline: true,
  });

  assert.equal(state.type, 'invalid');
  assert.equal(state.submitError, 'Please fix the highlighted fields.');
  assert.equal(state.fieldErrors.name, 'Enter your full name.');
  assert.equal(state.fieldErrors.email, 'Enter a valid email address.');
  assert.equal(state.fieldErrors.date, 'Choose a preferred date.');
});

test('getBookingSubmitState returns offline state for valid form while offline', () => {
  const state = getBookingSubmitState({
    bookingForm: createValidForm(),
    bookingSubmitting: false,
    isOnline: false,
  });

  assert.equal(state.type, 'offline');
  assert.equal(state.submitError, 'You appear to be offline. Reconnect and try again.');
});

test('getBookingSubmitState returns ready state with sanitized form when valid and online', () => {
  const state = getBookingSubmitState({
    bookingForm: {
      name: '  Jane Doe  ',
      email: '  jane@example.com ',
      date: plusDays(3),
      notes: '  Looking for a redesign quote. ',
    },
    bookingSubmitting: false,
    isOnline: true,
  });

  assert.equal(state.type, 'ready');
  assert.deepEqual(state.sanitizedForm, {
    name: 'Jane Doe',
    email: 'jane@example.com',
    date: state.sanitizedForm.date,
    notes: 'Looking for a redesign quote.',
  });
});
