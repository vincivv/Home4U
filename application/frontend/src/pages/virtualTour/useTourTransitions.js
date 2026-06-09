import { useCallback, useEffect, useRef } from 'react';

const useTourTransitions = ({
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
}) => {
  const enterHomeTimersRef = useRef([]);
  const blueprintZoomTimerRef = useRef(null);

  const clearEnterHomeTimers = useCallback(() => {
    enterHomeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    enterHomeTimersRef.current = [];
  }, []);

  const clearBlueprintZoomTimer = useCallback(() => {
    if (blueprintZoomTimerRef.current) {
      window.clearTimeout(blueprintZoomTimerRef.current);
      blueprintZoomTimerRef.current = null;
    }
  }, []);

  const clearTransitionTimers = useCallback(() => {
    clearEnterHomeTimers();
    clearBlueprintZoomTimer();
  }, [clearBlueprintZoomTimer, clearEnterHomeTimers]);

  useEffect(() => () => {
    clearTransitionTimers();
  }, [clearTransitionTimers]);

  const enterHouse = useCallback(() => {
    if (isEnteringHome || doorZooming) return;
    clearEnterHomeTimers();
    setPhaseTransitioning(true);
    playUiTone(360, 0.09);
    setIsEnteringHome(true);
    setHasInteracted(true);
    setOutsideChapter(0);

    const midFlightTimer = window.setTimeout(() => {
      setOutsideChapter(1);
      playUiTone(480, 0.08);
    }, 600);

    const finishTimer = window.setTimeout(() => {
      goToBlueprint({ bumpIntroTick: true });
      setIsEnteringHome(false);
      setPhaseTransitioning(false);
    }, 1200);

    enterHomeTimersRef.current = [midFlightTimer, finishTimer];
  }, [
    clearEnterHomeTimers,
    doorZooming,
    goToBlueprint,
    isEnteringHome,
    playUiTone,
    setHasInteracted,
    setIsEnteringHome,
    setOutsideChapter,
    setPhaseTransitioning,
  ]);

  const goToOverview = useCallback(() => {
    setHasInteracted(true);
    if (phase === 'blueprint') return;
    goToBlueprint({ bumpIntroTick: true });
  }, [goToBlueprint, phase, setHasInteracted]);

  const openRoomFromBlueprint = useCallback((index) => {
    clearBlueprintZoomTimer();
    setPhaseTransitioning(true);
    playUiTone(520, 0.07);
    setHasInteracted(true);

    const plan = storyRooms[index].plan;
    setPathTarget({ x: plan.x + plan.w / 2, y: plan.y + plan.h / 2 });
    setRoomZooming(true);

    blueprintZoomTimerRef.current = window.setTimeout(() => {
      goToRoomIndex(index);
      setRoomZooming(false);
      setPhaseTransitioning(false);
      blueprintZoomTimerRef.current = null;
    }, 420);
  }, [
    clearBlueprintZoomTimer,
    goToRoomIndex,
    playUiTone,
    setHasInteracted,
    setPathTarget,
    setPhaseTransitioning,
    setRoomZooming,
    storyRooms,
  ]);

  const handleDockBack = useCallback(() => {
    setHasInteracted(true);
    if (phase === 'room') {
      goToPrevRoom();
      return;
    }
    if (phase === 'blueprint') {
      goToOutside();
      return;
    }
    navigate('/dashboard');
  }, [goToOutside, goToPrevRoom, navigate, phase, setHasInteracted]);

  const handleDockPrimary = useCallback(() => {
    setHasInteracted(true);
    if (phase === 'room') {
      goToNextRoom();
      return;
    }
    if (phase === 'blueprint') {
      openRoomFromBlueprint(activeIndex);
      return;
    }
    enterHouse();
  }, [activeIndex, enterHouse, goToNextRoom, openRoomFromBlueprint, phase, setHasInteracted]);

  return {
    clearTransitionTimers,
    enterHouse,
    goToOverview,
    openRoomFromBlueprint,
    handleDockBack,
    handleDockPrimary,
  };
};

export default useTourTransitions;
