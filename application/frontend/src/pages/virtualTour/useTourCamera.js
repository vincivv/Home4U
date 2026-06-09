import { useCallback, useEffect, useRef } from 'react';
import {
  CAMERA_ANIMATION_DURATION,
  clampValue,
  getSplinePose,
  mapSplinePoseToStage,
  storyChapters,
  initialStageCamera,
} from './data';

const useTourCamera = ({
  phase,
  currentChapter,
  isDragging,
  setIsDragging,
  setHasInteracted,
  setShowOrbitHint,
  syncActiveSectionFromProgress,
}) => {
  const dragStartRef = useRef({ x: 0, y: 0 });
  const tiltStartRef = useRef({ x: 0, y: 0 });
  const tiltTargetRef = useRef({ x: 0, y: 0 });
  const tiltCurrentRef = useRef({ x: 0, y: 0 });
  const nudgeRef = useRef({ x: 0, y: 0 });
  const lookAtOffsetRef = useRef(initialStageCamera.lookAtOffset);
  const cameraDollyRef = useRef(initialStageCamera.cameraDolly);
  const roomShellRef = useRef(null);
  const roomAtmoRef = useRef(null);
  const cameraAnimationFrameRef = useRef(null);
  const roomMotionFrameRef = useRef(null);
  const cameraPositionRef = useRef(initialStageCamera.position);
  const hasMountedCameraRef = useRef(false);
  const scheduleRoomMotionRef = useRef(() => {});
  const phaseRef = useRef(phase);
  const isDraggingRef = useRef(isDragging);
  const cameraAnimatingRef = useRef(false);
  const lastRoomTransformRef = useRef({
    shellTransform: '',
    atmoX: '',
    atmoY: '',
  });

  const stopCameraAnimation = useCallback(() => {
    if (cameraAnimationFrameRef.current) {
      cancelAnimationFrame(cameraAnimationFrameRef.current);
      cameraAnimationFrameRef.current = null;
    }
    cameraAnimatingRef.current = false;
  }, []);

  const stopRoomMotion = useCallback(() => {
    if (roomMotionFrameRef.current) {
      cancelAnimationFrame(roomMotionFrameRef.current);
      roomMotionFrameRef.current = null;
    }
  }, []);

  const applySplinePoseToStage = useCallback((pose) => {
    const stagePose = mapSplinePoseToStage(pose);
    cameraPositionRef.current = stagePose.position;
    cameraDollyRef.current = stagePose.cameraDolly;
    lookAtOffsetRef.current = stagePose.lookAtOffset;
    nudgeRef.current = stagePose.nudge;
  }, []);

  const applyRoomTransform = useCallback(() => {
    const target = tiltTargetRef.current;
    const current = tiltCurrentRef.current;
    const deltaX = target.x - current.x;
    const deltaY = target.y - current.y;
    const isSettled = Math.abs(deltaX) < 0.0015 && Math.abs(deltaY) < 0.0015;

    const nextX = isSettled ? target.x : current.x + deltaX * 0.18;
    const nextY = isSettled ? target.y : current.y + deltaY * 0.18;
    tiltCurrentRef.current = { x: nextX, y: nextY };

    const nudge = nudgeRef.current;
    const lookAt = lookAtOffsetRef.current;
    const cameraDolly = cameraDollyRef.current;
    const rotateX = -6 + nextY * 8 + nudge.y + lookAt.y;
    const rotateY = 14 + nextX * 14 + nudge.x + lookAt.x;
    const dolly = cameraDolly + Math.abs(nextX) * 5 + Math.abs(nextY) * 4;
    const perspectiveScale = 1 + (50 - cameraDolly) / 500;
    const shellTransform = `translateZ(${dolly.toFixed(2)}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${perspectiveScale})`;
    const atmoX = `${(nextX * 14).toFixed(2)}px`;
    const atmoY = `${(nextY * 10).toFixed(2)}px`;
    const previous = lastRoomTransformRef.current;

    if (roomShellRef.current && previous.shellTransform !== shellTransform) {
      roomShellRef.current.style.transform = shellTransform;
      previous.shellTransform = shellTransform;
    }

    if (roomAtmoRef.current) {
      if (previous.atmoX !== atmoX) {
        roomAtmoRef.current.style.setProperty('--atmo-x', atmoX);
        previous.atmoX = atmoX;
      }
      if (previous.atmoY !== atmoY) {
        roomAtmoRef.current.style.setProperty('--atmo-y', atmoY);
        previous.atmoY = atmoY;
      }
    }

    return !isSettled;
  }, []);

  const scheduleRoomMotion = useCallback(() => {
    if (phaseRef.current !== 'room' || roomMotionFrameRef.current) return;

    roomMotionFrameRef.current = requestAnimationFrame(() => {
      roomMotionFrameRef.current = null;
      if (phaseRef.current !== 'room') return;

      const keepInterpolating = applyRoomTransform();
      if (keepInterpolating || cameraAnimatingRef.current || isDraggingRef.current) {
        scheduleRoomMotionRef.current();
      }
    });
  }, [applyRoomTransform]);

  useEffect(() => {
    scheduleRoomMotionRef.current = scheduleRoomMotion;
  }, [scheduleRoomMotion]);

  const onPointerDown = useCallback((event) => {
    if (phase !== 'room') return;
    stopCameraAnimation();
    setHasInteracted(true);
    isDraggingRef.current = true;
    setIsDragging(true);
    setShowOrbitHint(false);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    tiltStartRef.current = { ...tiltTargetRef.current };
    scheduleRoomMotion();
  }, [phase, scheduleRoomMotion, setHasInteracted, setIsDragging, setShowOrbitHint, stopCameraAnimation]);

  const onPointerMove = useCallback((event) => {
    if (phase !== 'room') return;
    if (!isDragging) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      tiltTargetRef.current = { x, y };
      scheduleRoomMotion();
      return;
    }
    const deltaX = (event.clientX - dragStartRef.current.x) / 180;
    const deltaY = (event.clientY - dragStartRef.current.y) / 180;
    tiltTargetRef.current = {
      x: Math.max(-1.1, Math.min(1.1, tiltStartRef.current.x + deltaX)),
      y: Math.max(-1.1, Math.min(1.1, tiltStartRef.current.y + deltaY)),
    };
    scheduleRoomMotion();
  }, [phase, isDragging, scheduleRoomMotion]);

  const onPointerUp = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    scheduleRoomMotion();
  }, [scheduleRoomMotion, setIsDragging]);

  useEffect(() => {
    phaseRef.current = phase;
    if (phase === 'room') {
      scheduleRoomMotion();
      return;
    }

    tiltTargetRef.current = { x: 0, y: 0 };
    tiltCurrentRef.current = { x: 0, y: 0 };
    lastRoomTransformRef.current = { shellTransform: '', atmoX: '', atmoY: '' };
    stopRoomMotion();
  }, [phase, scheduleRoomMotion, stopRoomMotion]);

  useEffect(() => {
    isDraggingRef.current = isDragging;
    if (phase === 'room') scheduleRoomMotion();
  }, [isDragging, phase, scheduleRoomMotion]);

  useEffect(() => {
    const chapter = storyChapters[currentChapter];
    if (!chapter?.cameraPath?.length) return undefined;

    stopCameraAnimation();
    const path = [cameraPositionRef.current, ...chapter.cameraPath];

    if (!hasMountedCameraRef.current) {
      applySplinePoseToStage(getSplinePose(path, 0));
      if (phaseRef.current === 'room') scheduleRoomMotion();
      hasMountedCameraRef.current = true;
      return undefined;
    }

    const startTime = performance.now();
    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    cameraAnimatingRef.current = true;

    const animate = (now) => {
      const linearProgress = clampValue((now - startTime) / CAMERA_ANIMATION_DURATION, 0, 1);
      const easedProgress = easeInOutCubic(linearProgress);
      applySplinePoseToStage(getSplinePose(path, easedProgress));
      syncActiveSectionFromProgress(easedProgress);
      if (phaseRef.current === 'room') scheduleRoomMotion();

      if (linearProgress < 1) {
        cameraAnimationFrameRef.current = requestAnimationFrame(animate);
      } else {
        cameraAnimationFrameRef.current = null;
        cameraAnimatingRef.current = false;
        scheduleRoomMotion();
      }
    };

    cameraAnimationFrameRef.current = requestAnimationFrame(animate);
    return () => stopCameraAnimation();
  }, [currentChapter, applySplinePoseToStage, scheduleRoomMotion, stopCameraAnimation, syncActiveSectionFromProgress]);

  useEffect(() => () => {
    stopCameraAnimation();
    stopRoomMotion();
  }, [stopCameraAnimation, stopRoomMotion]);

  return {
    nudgeRef,
    lookAtOffsetRef,
    cameraDollyRef,
    roomShellRef,
    roomAtmoRef,
    stopCameraAnimation,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
};

export default useTourCamera;
