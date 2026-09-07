import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../store/authStore';
import type { AppNotification, CreateNotificationInput } from '../types';
import {
  fetchNotifications,
  getCurrentUserId,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  createNotification,
} from '../services/notificationService';

// Fallback seed notifications shown during local review if database tables are not yet migrated
const LOCAL_FALLBACK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'mock-1',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Directive Assigned: Review Telemetry Deck',
    message: 'Varun S. assigned task #TSK-104 (Subsystem Telemetry) to your station.',
    type: 'task_assigned',
    payload: {
      title: 'Directive Assigned: Review Telemetry Deck',
      message: 'Varun S. assigned task #TSK-104 (Subsystem Telemetry) to your station.',
    },
    read_at: null,
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
  },
  {
    id: 'mock-2',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Sprint 84 Sync In 30 Minutes',
    message: 'All command leads must report to Bridge Channel 1 for daily brief.',
    type: 'deadline_reminder',
    payload: {
      title: 'Sprint 84 Sync In 30 Minutes',
      message: 'All command leads must report to Bridge Channel 1 for daily brief.',
    },
    read_at: null,
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'mock-3',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Design Board Status Update',
    message: 'Card "Phosphor UI Spec" was moved to Review by Akash D.',
    type: 'task_status',
    payload: {
      title: 'Design Board Status Update',
      message: 'Card "Phosphor UI Spec" was moved to Review by Akash D.',
    },
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

export function useNotifications() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPendingMigration, setIsPendingMigration] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const uid = await getCurrentUserId(session?.name);
    setCurrentUserId(uid);

    const res = await fetchNotifications(uid);

    if (res.isPendingMigration) {
      setIsPendingMigration(true);
      setNotifications(LOCAL_FALLBACK_NOTIFICATIONS);
      setError(null);
    } else if (res.error) {
      setError(res.error);
    } else {
      setIsPendingMigration(false);
      setNotifications(res.data);
    }

    setLoading(false);
  }, [session?.name]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const uid = await getCurrentUserId(session?.name);
      if (!mounted) return;
      setCurrentUserId(uid);

      const res = await fetchNotifications(uid);
      if (!mounted) return;

      if (res.isPendingMigration) {
        setIsPendingMigration(true);
        setNotifications(LOCAL_FALLBACK_NOTIFICATIONS);
      } else if (res.error) {
        setError(res.error);
      } else {
        setIsPendingMigration(false);
        setNotifications(res.data);
      }
      setLoading(false);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, [session?.name]);

  // Realtime listener for Postgres changes on the notifications table
  useEffect(() => {
    if (!currentUserId || isPendingMigration) return;

    const channel = supabase
      .channel(`notifications-user-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isPendingMigration, loadData]);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
    );

    if (!isPendingMigration) {
      const res = await markNotificationAsRead(id);
      if (!res.success) {
        setError(res.error);
      }
    }
  };

  const markAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

    if (!isPendingMigration && currentUserId) {
      const res = await markAllNotificationsAsRead(currentUserId);
      if (!res.success) {
        setError(res.error);
      }
    }
  };

  const createAlert = async (input: Omit<CreateNotificationInput, 'user_id'>) => {
    if (!currentUserId) return;
    const res = await createNotification({
      ...input,
      user_id: currentUserId,
    });

    if (res.data) {
      setNotifications((prev) => [res.data as AppNotification, ...prev]);
    }
    return res;
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return {
    notifications,
    loading,
    error,
    isPendingMigration,
    unreadCount,
    markAsRead,
    markAllRead,
    createAlert,
    refresh: loadData,
  };
}
