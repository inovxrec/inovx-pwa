import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../store/authStore';
import type { EventPreferenceMatrix, NotificationChannel, NotificationType } from '../types';
import {
  fetchPreferences,
  updatePreference,
  DEFAULT_EVENT_TYPES,
} from '../services/preferenceService';
import { getCurrentUserId } from '../services/notificationService';

export function useNotificationPrefs() {
  const { session } = useAuth();
  const [preferences, setPreferences] = useState<EventPreferenceMatrix[]>(() =>
    DEFAULT_EVENT_TYPES.map((item) => ({
      event_type: item.type,
      label: item.label,
      description: item.description,
      in_app: item.defaultInApp,
      push: item.defaultPush,
      email: item.defaultEmail,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPendingMigration, setIsPendingMigration] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const uid = await getCurrentUserId(session?.name);
    setCurrentUserId(uid);

    const res = await fetchPreferences(uid);

    if (res.isPendingMigration) {
      setIsPendingMigration(true);
      setPreferences(res.data);
      setError(null);
    } else if (res.error) {
      setError(res.error);
    } else {
      setIsPendingMigration(false);
      setPreferences(res.data);
    }

    setLoading(false);
  }, [session?.name]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const uid = await getCurrentUserId(session?.name);
      if (!mounted) return;
      setCurrentUserId(uid);

      const res = await fetchPreferences(uid);
      if (!mounted) return;

      if (res.isPendingMigration) {
        setIsPendingMigration(true);
        setPreferences(res.data);
      } else if (res.error) {
        setError(res.error);
      } else {
        setIsPendingMigration(false);
        setPreferences(res.data);
      }
      setLoading(false);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [session?.name]);

  const togglePreference = async (
    eventType: NotificationType,
    channel: NotificationChannel,
    nextValue: boolean
  ) => {
    // Optimistic UI state update
    setPreferences((prev) =>
      prev.map((row) => (row.event_type === eventType ? { ...row, [channel]: nextValue } : row))
    );

    if (!isPendingMigration && currentUserId) {
      setSaving(true);
      const res = await updatePreference(currentUserId, eventType, channel, nextValue);
      setSaving(false);
      if (!res.success) {
        setError(res.error);
        // Revert on failure
        setPreferences((prev) =>
          prev.map((row) =>
            row.event_type === eventType ? { ...row, [channel]: !nextValue } : row
          )
        );
      }
    }
  };

  return {
    preferences,
    loading,
    saving,
    error,
    isPendingMigration,
    togglePreference,
    refresh: loadData,
  };
}
