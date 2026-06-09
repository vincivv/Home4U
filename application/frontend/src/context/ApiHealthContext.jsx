import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const ApiHealthContext = createContext(null);

export const ApiHealthProvider = ({ children }) => {
  const [status, setStatus] = useState('unknown');
  const [detail, setDetail] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);

  const check = useCallback(async () => {
    let timeoutId = null;
    try {
      const controller = new AbortController();
      timeoutId = window.setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      const ok = res.ok && data.status === 'ok';
      setStatus(ok ? 'ok' : data.status === 'degraded' ? 'degraded' : 'error');
      setDetail(typeof data.detail === 'string' ? data.detail : null);
    } catch (error) {
      setStatus('offline');
      setDetail(error?.name === 'AbortError' ? 'Health check timed out' : null);
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      setCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void check();
    });
    const id = setInterval(() => {
      void check();
    }, 60000);
    return () => clearInterval(id);
  }, [check]);

  const value = useMemo(
    () => ({
      status,
      detail,
      checkedAt,
      refresh: check,
      isReady: status !== 'unknown',
    }),
    [status, detail, checkedAt, check]
  );

  return <ApiHealthContext.Provider value={value}>{children}</ApiHealthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with provider
export const useApiHealth = () => {
  const ctx = useContext(ApiHealthContext);
  if (!ctx) {
    throw new Error('useApiHealth must be used within ApiHealthProvider');
  }
  return ctx;
};
