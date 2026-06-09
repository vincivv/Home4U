import { useApiHealth } from '../context/ApiHealthContext';
import './ApiStatusBanner.css';

export default function ApiStatusBanner() {
  const { status, detail, refresh, isReady } = useApiHealth();

  if (!isReady || status === 'ok') return null;

  const message =
    status === 'offline'
      ? 'Unable to reach the Home4U API. Some features may be unavailable.'
      : status === 'degraded'
        ? 'API is running but the database reported an issue.'
        : 'The API returned an unexpected health status.';

  return (
    <div className="api-status-banner" role="status" aria-live="polite">
      <div className="api-status-banner__inner">
        <span className="api-status-banner__dot" aria-hidden="true" />
        <p className="api-status-banner__text">
          <strong>Connection notice.</strong> {message}
          {detail ? ` ${String(detail).slice(0, 80)}.` : ''}
        </p>
        <button type="button" className="api-status-banner__retry" onClick={() => refresh()}>
          Retry
        </button>
      </div>
    </div>
  );
}
