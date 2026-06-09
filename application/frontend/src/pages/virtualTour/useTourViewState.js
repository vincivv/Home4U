import { useState } from 'react';

const useTourViewState = () => {
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const [pathTarget, setPathTarget] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [chapterChangeKey, setChapterChangeKey] = useState(0);

  return {
    hoveredRoomId,
    setHoveredRoomId,
    pathTarget,
    setPathTarget,
    isDragging,
    setIsDragging,
    chapterChangeKey,
    setChapterChangeKey,
  };
};

export default useTourViewState;
