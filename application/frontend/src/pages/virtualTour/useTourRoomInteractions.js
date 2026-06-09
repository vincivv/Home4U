import { useCallback, useEffect, useRef } from 'react';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const getTodayIsoDate = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const validateBookingForm = (form) => {
  const errors = {};
  const trimmedName = form.name.trim();
  const trimmedEmail = form.email.trim();
  const trimmedNotes = form.notes.trim();
  const today = getTodayIsoDate();

  if (!trimmedName || trimmedName.length < 2) {
    errors.name = 'Enter your full name.';
  }

  if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!form.date) {
    errors.date = 'Choose a preferred date.';
  } else if (form.date < today) {
    errors.date = 'Preferred date cannot be in the past.';
  }

  if (trimmedNotes.length > 500) {
    errors.notes = 'Keep notes under 500 characters.';
  }

  return errors;
};

const sanitizeBookingForm = (form) => ({
  ...form,
  name: form.name.trim(),
  email: form.email.trim(),
  notes: form.notes.trim(),
});

const getBookingSubmitState = ({ bookingForm, bookingSubmitting, isOnline }) => {
  if (bookingSubmitting) {
    return { type: 'noop' };
  }

  const fieldErrors = validateBookingForm(bookingForm);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      type: 'invalid',
      fieldErrors,
      submitError: 'Please fix the highlighted fields.',
    };
  }

  if (!isOnline) {
    return {
      type: 'offline',
      submitError: 'You appear to be offline. Reconnect and try again.',
    };
  }

  return {
    type: 'ready',
    sanitizedForm: sanitizeBookingForm(bookingForm),
  };
};

const useTourRoomInteractions = ({
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
}) => {
  const detailScrollYRef = useRef(0);
  const detailRafRef = useRef(null);
  const hotspotFocusTimerRef = useRef(null);
  const generatePlanTimerRef = useRef(null);
  const bookingSubmitTimerRef = useRef(null);

  const openHotspot = useCallback((hotspotId) => {
    const hotspot = hotspots.find((spot) => spot.id === hotspotId);
    stopCameraAnimation();
    playUiTone(660, 0.05);
    setHasInteracted(true);
    setShowOrbitHint(false);
    setSelectedHotspotId(hotspotId);
    setFocusCue((prev) => prev + 1);
    setVisitedHotspots((prev) => {
      const roomSet = new Set(prev[activeRoom.id] || []);
      roomSet.add(hotspotId);
      return { ...prev, [activeRoom.id]: roomSet };
    });

    if (hotspot) {
      const xBias = (hotspot.x - 50) / 50;
      const yBias = (hotspot.y - 50) / 50;
      setHotspotTransitioning(true);
      lookAtOffsetRef.current = { x: xBias * 6, y: yBias * 4.2 };
      nudgeRef.current = { x: xBias * 1.25, y: yBias * 0.8 };
      if (hotspotFocusTimerRef.current) window.clearTimeout(hotspotFocusTimerRef.current);
      hotspotFocusTimerRef.current = window.setTimeout(() => {
        setHotspotTransitioning(false);
        nudgeRef.current = { x: 0, y: 0 };
      }, 600);
    }

    if (detailScrollRef.current) {
      const top = detailScrollRef.current.querySelector('.virtual-hotspot-panel')?.offsetTop || 0;
      detailScrollRef.current.scrollTo({ top: top - 100, behavior: 'smooth' });
    }
  }, [
    activeRoom.id,
    detailScrollRef,
    hotspots,
    lookAtOffsetRef,
    nudgeRef,
    playUiTone,
    setFocusCue,
    setHasInteracted,
    setHotspotTransitioning,
    setSelectedHotspotId,
    setShowOrbitHint,
    setVisitedHotspots,
    stopCameraAnimation,
  ]);

  const onDetailScroll = useCallback((event) => {
    if (introRevealing) {
      event.currentTarget.scrollTop = 0;
      return;
    }

    const nextY = event.currentTarget.scrollTop || 0;
    detailScrollYRef.current = nextY;

    if (!detailRafRef.current) {
      detailRafRef.current = requestAnimationFrame(() => {
        if (detailScrollRef.current) {
          detailScrollRef.current.style.setProperty('--scroll-y', String(detailScrollYRef.current));
        }
        detailRafRef.current = null;
      });
    }

    setIntroPassed(nextY > 140);
  }, [detailScrollRef, introRevealing, setIntroPassed]);

  const jumpToDetails = useCallback(() => {
    if (introRevealing) return;
    if (!detailBodyRef.current) return;
    detailBodyRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detailBodyRef, introRevealing]);

  const handleRoomCta = useCallback(() => {
    setHasInteracted(true);

    switch (activeRoom.id) {
      case 'atrium':
        goToBlueprint();
        break;
      case 'pain':
        goToRoomIndex(2);
        break;
      case 'solution':
        setShowProControls(true);
        break;
      case 'transform':
        setStoryProgress(100);
        break;
      case 'proof':
        setStoryProgress(100);
        if (hotspots[0]) openHotspot(hotspots[0].id);
        break;
      case 'action':
        setBookingSubmitted(false);
        setBookingSubmitting(false);
        setBookingSubmitError('');
        setBookingFieldErrors({});
        setShowBookingModal(true);
        break;
      default:
        goToBlueprint();
    }
  }, [
    activeRoom.id,
    goToBlueprint,
    goToRoomIndex,
    hotspots,
    openHotspot,
    setBookingSubmitted,
    setBookingFieldErrors,
    setBookingSubmitError,
    setBookingSubmitting,
    setHasInteracted,
    setShowBookingModal,
    setShowProControls,
    setStoryProgress,
  ]);

  const handleGeneratePlan = useCallback(() => {
    if (isGeneratingPlan) return;
    setHasInteracted(true);
    setIsGeneratingPlan(true);
    setTransformSweepTick(0);
    if (generatePlanTimerRef.current) {
      window.clearTimeout(generatePlanTimerRef.current);
    }
    generatePlanTimerRef.current = window.setTimeout(() => {
      setIsGeneratingPlan(false);
      setTransformSweepTick((tick) => tick + 1);
      generatePlanTimerRef.current = null;
    }, 1100);
  }, [isGeneratingPlan, setHasInteracted, setIsGeneratingPlan, setTransformSweepTick]);

  const onBookingInput = useCallback((event) => {
    const { name, value } = event.target;
    setBookingForm((prev) => ({ ...prev, [name]: value }));
    setBookingFieldErrors((prev) => {
      if (!prev?.[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setBookingSubmitError('');
  }, [setBookingFieldErrors, setBookingForm, setBookingSubmitError]);

  const submitBooking = useCallback((event) => {
    event.preventDefault();
    const isOnline = !(typeof window !== 'undefined' && window.navigator && !window.navigator.onLine);
    const submitState = getBookingSubmitState({ bookingForm, bookingSubmitting, isOnline });

    if (submitState.type === 'noop') return;

    if (submitState.type === 'invalid') {
      setBookingFieldErrors(submitState.fieldErrors);
      setBookingSubmitError(submitState.submitError);
      return;
    }

    if (submitState.type === 'offline') {
      setBookingSubmitError(submitState.submitError);
      return;
    }

    setBookingFieldErrors({});
    setBookingSubmitError('');
    setBookingSubmitting(true);
    setBookingForm((prev) => ({ ...prev, ...submitState.sanitizedForm }));

    if (bookingSubmitTimerRef.current) {
      window.clearTimeout(bookingSubmitTimerRef.current);
    }
    bookingSubmitTimerRef.current = window.setTimeout(() => {
      setBookingSubmitting(false);
      setBookingSubmitted(true);
      bookingSubmitTimerRef.current = null;
    }, 900);
  }, [
    bookingForm,
    bookingSubmitting,
    setBookingFieldErrors,
    setBookingForm,
    setBookingSubmitError,
    setBookingSubmitted,
    setBookingSubmitting,
  ]);

  const closeBookingModal = useCallback(() => {
    if (bookingSubmitting) return;
    if (bookingSubmitTimerRef.current) {
      window.clearTimeout(bookingSubmitTimerRef.current);
      bookingSubmitTimerRef.current = null;
    }
    setShowBookingModal(false);
    setBookingSubmitError('');
    setBookingFieldErrors({});
  }, [bookingSubmitting, setBookingFieldErrors, setBookingSubmitError, setShowBookingModal]);

  useEffect(() => () => {
    if (hotspotFocusTimerRef.current) window.clearTimeout(hotspotFocusTimerRef.current);
    if (detailRafRef.current) cancelAnimationFrame(detailRafRef.current);
    if (generatePlanTimerRef.current) window.clearTimeout(generatePlanTimerRef.current);
    if (bookingSubmitTimerRef.current) window.clearTimeout(bookingSubmitTimerRef.current);
  }, []);

  return {
    openHotspot,
    onDetailScroll,
    jumpToDetails,
    handleRoomCta,
    handleGeneratePlan,
    onBookingInput,
    submitBooking,
    closeBookingModal,
  };
};

export { validateBookingForm, sanitizeBookingForm, getBookingSubmitState };
export default useTourRoomInteractions;
