import { useCallback, useEffect, useRef } from 'react';

const useTourAudio = ({ soundEnabled, phase, introRevealing }) => {
  const audioCtxRef = useRef(null);
  const introAudioTimersRef = useRef([]);

  const clearIntroAudioTimers = useCallback(() => {
    introAudioTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    introAudioTimersRef.current = [];
  }, []);

  const playUiTone = useCallback(
    (frequency = 420, duration = 0.06) => {
      if (!soundEnabled || typeof window === 'undefined') return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      osc.type = 'sine';
      gain.gain.value = 0.02;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    },
    [soundEnabled],
  );

  useEffect(() => {
    if (!(phase === 'room' && introRevealing && soundEnabled)) return undefined;
    playUiTone(280, 0.1);
    const t1 = window.setTimeout(() => playUiTone(360, 0.08), 170);
    const t2 = window.setTimeout(() => playUiTone(460, 0.08), 330);
    introAudioTimersRef.current = [t1, t2];
    return clearIntroAudioTimers;
  }, [phase, introRevealing, soundEnabled, playUiTone, clearIntroAudioTimers]);

  useEffect(
    () => () => {
      clearIntroAudioTimers();
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx && typeof ctx.close === 'function' && ctx.state !== 'closed') {
        void ctx.close().catch(() => {});
      }
    },
    [clearIntroAudioTimers],
  );

  return { playUiTone, clearIntroAudioTimers };
};

export default useTourAudio;
