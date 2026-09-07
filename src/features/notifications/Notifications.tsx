import { useState } from 'react';
import { useNotifications } from './hooks/useNotifications';
import { useAnnouncements } from './hooks/useAnnouncements';
import { useNotificationPrefs } from './hooks/useNotificationPrefs';
import { NotificationList } from './components/NotificationList';
import { AnnouncementList } from './components/AnnouncementList';
import { PreferencesMatrix } from './components/PreferencesMatrix';
import { PushSubscriptionCard } from './components/PushSubscriptionCard';
import { EdgeArchitectureDocs } from './components/EdgeArchitectureDocs';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import './Notifications.css';

type Tab = 'transmissions' | 'announcements' | 'preferences' | 'architecture';

export function Notifications() {
  const [activeTab, setActiveTab] = useState<Tab>('transmissions');
  const { toast } = useToast();

  const {
    notifications,
    loading: notifsLoading,
    error: notifsError,
    isPendingMigration: notifsPendingMigration,
    unreadCount,
    markAsRead,
    markAllRead,
    createAlert,
    refresh: refreshNotifs,
  } = useNotifications();

  const {
    announcements,
    loading: annLoading,
    error: annError,
    isPendingMigration: annPendingMigration,
    refresh: refreshAnnouncements,
  } = useAnnouncements();

  const {
    preferences,
    loading: prefsLoading,
    saving: prefsSaving,
    error: prefsError,
    isPendingMigration: prefsPendingMigration,
    togglePreference,
  } = useNotificationPrefs();

  const isPendingMigration =
    notifsPendingMigration || annPendingMigration || prefsPendingMigration;

  const handleSendTestAlert = async () => {
    const res = await createAlert({
      title: 'TEST DISPATCH — RADAR CONTACT',
      message: 'Autonomous ping dispatched from local terminal to verify deduplication filter.',
      type: 'system',
      deduplication_key: 'test-radar-contact-ping',
    });

    if (res?.skipped) {
      toast('DEDUPLICATED — RECENT ALERT ALREADY LOGGED');
    } else {
      toast('TRANSMISSION LOGGED TO NOTIFICATION QUEUE');
    }
  };

  return (
    <div className="notifications-screen">
      {isPendingMigration && (
        <div className="notif-migration-alert">
          <div>
            <div className="alert-tag">PART B DATABASE MIGRATION NOTICE</div>
            <div className="alert-message">
              Supabase tables <code>notifications</code>, <code>notification_prefs</code>, and{' '}
              <code>announcements</code> are not yet detected in the schema cache. Operating in
              fail-safe local mode with seed telemetry. Review the &quot;Specs &amp; Edge Ops&quot;
              tab for the SQL migration script.
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('architecture')}
            style={{ whiteSpace: 'nowrap' }}
          >
            View Migration SQL
          </Button>
        </div>
      )}

      <div className="notif-subnav">
        <button
          type="button"
          className={`subnav-btn ${activeTab === 'transmissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transmissions')}
        >
          Transmissions
          <span className={`badge-count ${unreadCount > 0 ? 'accent' : ''}`}>
            {unreadCount > 0 ? unreadCount : notifications.length}
          </span>
        </button>

        <button
          type="button"
          className={`subnav-btn ${activeTab === 'announcements' ? 'active' : ''}`}
          onClick={() => setActiveTab('announcements')}
        >
          Broadcasts
          <span className="badge-count">{announcements.length}</span>
        </button>

        <button
          type="button"
          className={`subnav-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Preferences &amp; Push
        </button>

        <button
          type="button"
          className={`subnav-btn ${activeTab === 'architecture' ? 'active' : ''}`}
          onClick={() => setActiveTab('architecture')}
        >
          Specs &amp; Edge Ops
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            onClick={handleSendTestAlert}
            title="Test deduplication and notification insertion"
          >
            + Test Dispatch
          </Button>
        </div>
      </div>

      <div className="notif-tab-content">
        {activeTab === 'transmissions' && (
          <NotificationList
            notifications={notifications}
            loading={notifsLoading}
            error={notifsError}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllRead}
            onRefresh={refreshNotifs}
          />
        )}

        {activeTab === 'announcements' && (
          <AnnouncementList
            announcements={announcements}
            loading={annLoading}
            error={annError}
            onRefresh={refreshAnnouncements}
          />
        )}

        {activeTab === 'preferences' && (
          <div>
            <PushSubscriptionCard />
            {prefsError && (
              <div style={{ color: 'var(--st-blocked)', fontSize: '12px', marginBottom: '8px' }}>
                {prefsError}
              </div>
            )}
            <PreferencesMatrix
              preferences={preferences}
              saving={prefsSaving || prefsLoading}
              onToggle={togglePreference}
            />
          </div>
        )}

        {activeTab === 'architecture' && <EdgeArchitectureDocs />}
      </div>
    </div>
  );
}
