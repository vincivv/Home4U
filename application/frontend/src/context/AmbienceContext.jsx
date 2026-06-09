import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const AmbienceContext = createContext(null);
const ignoreError = (error) => {
  void error;
};

function safeReadBool(key, fallback = false) {
  try {
    const value = window.localStorage.getItem(key);
    if (value === null) return fallback;
    return value === '1' || value === 'true';
  } catch {
    return fallback;
  }
}

function safeWriteBool(key, value) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // ignore
  }
}

function createAmbienceGraph(audioCtx) {
  const master = audioCtx.createGain();
  master.gain.value = 0;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.8;

  const air = audioCtx.createBiquadFilter();
  air.type = 'highpass';
  air.frequency.value = 40;

  master.connect(filter);
  filter.connect(air);
  air.connect(audioCtx.destination);

  const oscA = audioCtx.createOscillator();
  oscA.type = 'triangle';
  oscA.frequency.value = 55;

  const oscB = audioCtx.createOscillator();
  oscB.type = 'sine';
  oscB.frequency.value = 110;
  oscB.detune.value = 6;

  const oscGain = audioCtx.createGain();
  oscGain.gain.value = 0.12;

  oscA.connect(oscGain);
  oscB.connect(oscGain);
  oscGain.connect(master);

  // Soft noise bed
  const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.5, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.35;

  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 220;
  noiseFilter.Q.value = 0.7;

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.value = 0.035;

  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);

  // Gentle wobble
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;

  const lfoGain = audioCtx.createGain();
  lfoGain.gain.value = 40;

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  oscA.start();
  oscB.start();
  noise.start();
  lfo.start();

  const stop = () => {
    try { oscA.stop(); } catch (error) { ignoreError(error); }
    try { oscB.stop(); } catch (error) { ignoreError(error); }
    try { noise.stop(); } catch (error) { ignoreError(error); }
    try { lfo.stop(); } catch (error) { ignoreError(error); }
    try { master.disconnect(); } catch (error) { ignoreError(error); }
  };

  return { master, stop };
}

export const AmbienceProvider = ({ children }) => {
  const [enabled, setEnabled] = useState(() => safeReadBool('home4u_ambience', false));

  const graphRef = useRef(null);
  const audioRef = useRef({ ctx: null, closingTimer: 0 });

  const supported = useMemo(() => {
    return typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  }, []);

  useEffect(() => {
    safeWriteBool('home4u_ambience', enabled);
  }, [enabled]);

  useEffect(() => {
    if (!supported) return;

    const stopEverything = async () => {
      if (audioRef.current.closingTimer) {
        window.clearTimeout(audioRef.current.closingTimer);
        audioRef.current.closingTimer = 0;
      }

      if (graphRef.current) {
        graphRef.current.stop();
        graphRef.current = null;
      }

      const ctx = audioRef.current.ctx;
      audioRef.current.ctx = null;
      if (ctx) {
        try { await ctx.close(); } catch (error) { ignoreError(error); }
      }
    };

    const ensureRunning = async () => {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;

      if (!audioRef.current.ctx) {
        audioRef.current.ctx = new Ctor();
      }
      const ctx = audioRef.current.ctx;
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch (error) { ignoreError(error); }
      }
      if (!graphRef.current) {
        graphRef.current = createAmbienceGraph(ctx);
      }

      const now = ctx.currentTime;
      graphRef.current.master.gain.cancelScheduledValues(now);
      graphRef.current.master.gain.setTargetAtTime(0.075, now, 0.08);
    };

    const fadeOut = () => {
      const ctx = audioRef.current.ctx;
      if (!ctx || !graphRef.current) return;
      const now = ctx.currentTime;
      graphRef.current.master.gain.cancelScheduledValues(now);
      graphRef.current.master.gain.setTargetAtTime(0, now, 0.09);
    };

    if (enabled) {
      ensureRunning();
    } else {
      fadeOut();
      audioRef.current.closingTimer = window.setTimeout(() => {
        stopEverything();
      }, 900);
    }

    const onVis = () => {
      if (!enabled) return;
      if (document.visibilityState === 'hidden') {
        fadeOut();
      } else {
        ensureRunning();
      }
    };

    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (!enabled) stopEverything();
    };
  }, [enabled, supported]);

  const value = useMemo(() => {
    return {
      enabled,
      supported,
      playClick: () => {
        const ctx = audioRef.current.ctx;
        const graph = graphRef.current;
        if (!enabled || !ctx || !graph || ctx.state !== 'running') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 820;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.05, now + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(gain);
        gain.connect(graph.master);

        osc.start(now);
        osc.stop(now + 0.09);
        osc.onended = () => {
          try { osc.disconnect(); } catch (error) { ignoreError(error); }
          try { gain.disconnect(); } catch (error) { ignoreError(error); }
        };
      },
      playWhoosh: () => {
        const ctx = audioRef.current.ctx;
        const graph = graphRef.current;
        if (!enabled || !ctx || !graph || ctx.state !== 'running') return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const now = ctx.currentTime;
        const dur = 0.28;

        const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.6;

        const src = ctx.createBufferSource();
        src.buffer = buffer;

        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(180, now);
        bp.frequency.exponentialRampToValueAtTime(880, now + dur);
        bp.Q.value = 0.9;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        src.connect(bp);
        bp.connect(gain);
        gain.connect(graph.master);

        src.start(now);
        src.stop(now + dur);
        src.onended = () => {
          try { src.disconnect(); } catch (error) { ignoreError(error); }
          try { bp.disconnect(); } catch (error) { ignoreError(error); }
          try { gain.disconnect(); } catch (error) { ignoreError(error); }
        };
      },
      toggle: () => setEnabled((v) => !v),
      setEnabled,
    };
  }, [enabled, supported]);

  return <AmbienceContext.Provider value={value}>{children}</AmbienceContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export const useAmbience = () => {
  const ctx = useContext(AmbienceContext);
  if (!ctx) {
    return { enabled: false, supported: false, toggle: () => {}, setEnabled: () => {}, playClick: () => {}, playWhoosh: () => {} };
  }
  return ctx;
};
