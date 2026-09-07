import { Panel } from '../../../components/Panel';
import type { EventPreferenceMatrix, NotificationChannel, NotificationType } from '../types';

interface PreferencesMatrixProps {
  preferences: EventPreferenceMatrix[];
  saving: boolean;
  onToggle: (eventType: NotificationType, channel: NotificationChannel, nextValue: boolean) => void;
}

export function PreferencesMatrix({
  preferences,
  saving,
  onToggle,
}: PreferencesMatrixProps) {
  return (
    <div className="prefs-matrix-container">
      <div className="prefs-header">
        <div>
          <h3 className="section-title">CHANNEL & DISPATCH PREFERENCES</h3>
          <p className="section-subtitle">
            Configure how and where notifications are routed across transmission channels
          </p>
        </div>
        {saving && <span className="saving-indicator">&gt; PERSISTING PREFERENCES...</span>}
      </div>

      <Panel className="prefs-table-panel">
        <div className="prefs-table">
          <div className="prefs-table-header">
            <div className="col-event">EVENT CATEGORY</div>
            <div className="col-channel">
              <span className="channel-title">IN-APP</span>
              <span className="channel-desc">Notification Deck</span>
            </div>
            <div className="col-channel">
              <span className="channel-title">WEB PUSH</span>
              <span className="channel-desc">Device OS Alerts</span>
            </div>
            <div className="col-channel">
              <span className="channel-title">EMAIL</span>
              <span className="channel-desc">Digest & Dispatch</span>
            </div>
          </div>

          <div className="prefs-table-body">
            {preferences.map((row) => (
              <div key={row.event_type} className="prefs-table-row">
                <div className="col-event">
                  <div className="event-label">{row.label}</div>
                  <div className="event-description">{row.description}</div>
                </div>

                <div className="col-channel">
                  <label className="pref-toggle">
                    <input
                      type="checkbox"
                      checked={row.in_app}
                      onChange={(e) => onToggle(row.event_type, 'in_app', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="col-channel">
                  <label className="pref-toggle">
                    <input
                      type="checkbox"
                      checked={row.push}
                      onChange={(e) => onToggle(row.event_type, 'push', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>

                <div className="col-channel">
                  <label className="pref-toggle">
                    <input
                      type="checkbox"
                      checked={row.email}
                      onChange={(e) => onToggle(row.event_type, 'email', e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
