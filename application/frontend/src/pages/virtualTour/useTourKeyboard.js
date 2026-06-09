import { useEffect } from 'react';

const isTypingTarget = () => {
  const activeTag = document.activeElement?.tagName;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag || '') || document.activeElement?.isContentEditable;
};

const useTourKeyboard = ({
  phase,
  showBookingModal,
  phaseTransitioning,
  setPhase,
  setSelectedHotspotId,
  setShowBookingModal,
  closeBookingModal,
  setHasInteracted,
  goToNextRoom,
  goToPrevRoom,
  goToBlueprint,
  goToOutside,
  navigate,
}) => {
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleGoBlueprint = () => {
      if (goToBlueprint) {
        goToBlueprint();
        return;
      }
      setPhase('blueprint');
      setSelectedHotspotId(null);
    };

    const handleGoOutside = () => {
      if (goToOutside) {
        goToOutside();
        return;
      }
      setPhase('outside');
    };

    const onKeyDown = (event) => {
      if (showBookingModal) {
        if (event.key === 'Escape') {
          event.preventDefault();
          if (closeBookingModal) {
            closeBookingModal();
          } else {
            setShowBookingModal(false);
          }
        }
        return;
      }

      if (isTypingTarget()) return;
      setHasInteracted(true);

      if (event.key === 'Escape') {
        if (phase === 'room') {
          event.preventDefault();
          handleGoBlueprint();
          return;
        }
        if (phase === 'blueprint') {
          event.preventDefault();
          handleGoOutside();
          return;
        }
        navigate('/dashboard');
        return;
      }

      if (phase === 'room' && !phaseTransitioning) {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          goToNextRoom();
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goToPrevRoom();
          return;
        }
        if (event.key.toLowerCase() === 'm') {
          event.preventDefault();
          handleGoBlueprint();
          return;
        }
      }

      if (phase === 'blueprint' && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        handleGoOutside();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    showBookingModal,
    phaseTransitioning,
    setPhase,
    setSelectedHotspotId,
    setShowBookingModal,
    closeBookingModal,
    setHasInteracted,
    goToNextRoom,
    goToPrevRoom,
    goToBlueprint,
    goToOutside,
    navigate,
  ]);
};

export default useTourKeyboard;
