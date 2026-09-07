import { useState } from 'react';
import { Panel } from '../../../components/Panel';
import { Button } from '../../../components/Button';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  sendTestLocalNotification,
} from '../services/pushService';
import { useAuth } from '../../../store/authStore';
import { getCurrentUserId } from '../services/notificationService';

export function PushSubscriptionCard() {
  const { session } = useAuth();
  const [supported] = useState(() => isPushSupported());
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    isPushSupported() ? getNotificationPermission() : 'default'
  );
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [hasVapidKey] = useState(() => Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY));

  const handleEnablePush = async () => {
    setLoading(true);
    setStatusMsg(null);

    const uid = await getCurrentUserId(session?.name);
    const { subscription, error } = await subscribeToPush(uid);

    const updatedPerm = getNotificationPermission();
    setPermission(updatedPerm);

    if (error) {
      setStatusMsg(`Notice: ${error}`);
    } else if (subscription) {
      setStatusMsg('Push channel activated and endpoint registered with Service Worker.');
    }

    setLoading(false);
  };

  const handleTestNotification = async () => {
    setStatusMsg(null);
    const res = await sendTestLocalNotification(
      'INOVX84 TEST TRANSMISSION',
      'Telemetry channels operational. Service Worker push recipient validated.'
    );
    if (!res.success) {
      setStatusMsg(`Local test alert error: ${res.error}`);
    } else {
      setStatusMsg('Test alert dispatched via Service Worker.');
    }
  };

  return (
    <Panel className="push-card-panel" bracket>
      <div className="push-card-header">
        <div>
          <h4 className="push-card-title">WEB PUSH TELEMETRY</h4>
          <p className="push-card-desc">
            Direct-to-desktop and mobile OS alerts dispatched via W3C Push API
          </p>
        </div>
        <div className="push-status-badge">
          <span className={`status-indicator ${permission === 'granted' ? 'active' : ''}`} />
          STATUS: {permission.toUpperCase()}
        </div>
      </div>

      <div className="push-card-details">
        <div className="push-detail-row">
          <span className="detail-key">Browser API Support:</span>
          <span className="detail-val">{supported ? 'AVAILABLE' : 'UNSUPPORTED'}</span>
        </div>
        <div className="push-detail-row">
          <span className="detail-key">Service Worker Worker Scope:</span>
          <span className="detail-val">/sw.js (ACTIVE)</span>
        </div>
        <div className="push-detail-row">
          <span className="detail-key">VAPID Public Key:</span>
          <span className="detail-val">
            {hasVapidKey ? 'CONFIGURED (VITE_VAPID_PUBLIC_KEY)' : 'OPTIONAL / DEMO MODE'}
          </span>
        </div>
      </div>

      <div className="push-card-actions">
        {permission !== 'granted' && (
          <Button
            variant="primary"
            onClick={handleEnablePush}
            disabled={loading || !supported}
            className="enable-push-btn"
          >
            {loading ? 'Requesting...' : 'Request Push Permissions'}
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={handleTestNotification}
          disabled={!supported}
          className="test-push-btn"
        >
          Send Test Local Alert
        </Button>
      </div>

      {statusMsg && <div className="push-status-note">&gt; {statusMsg}</div>}
    </Panel>
  );
}
