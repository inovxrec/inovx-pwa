import { useState, useEffect, useCallback } from 'react';
import type { Announcement } from '../types';
import { fetchAnnouncements } from '../services/announcementService';

// Fallback announcements shown during local review if database tables are not yet migrated
const LOCAL_FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'STATION SECURITY DIRECTIVE: PASSKEY ROTATION',
    body: 'All operators across Engineering and Design domains must verify two-factor credentials prior to the end of Sprint 84.',
    sender_id: 'Command Staff',
    pinned: true,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 'ann-2',
    title: 'INOVX84 DESIGN SYSTEM FREEZE',
    body: 'Token palette in tokens.css is locked. Any component contributions must pull from existing CSS variables without ad-hoc hex values.',
    sender_id: 'Lead Architect',
    pinned: false,
    expires_at: null,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPendingMigration, setIsPendingMigration] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await fetchAnnouncements();

    if (res.isPendingMigration) {
      setIsPendingMigration(true);
      setAnnouncements(LOCAL_FALLBACK_ANNOUNCEMENTS);
      setError(null);
    } else if (res.error) {
      setError(res.error);
    } else {
      setIsPendingMigration(false);
      setAnnouncements(res.data);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const res = await fetchAnnouncements();
      if (!mounted) return;

      if (res.isPendingMigration) {
        setIsPendingMigration(true);
        setAnnouncements(LOCAL_FALLBACK_ANNOUNCEMENTS);
      } else if (res.error) {
        setError(res.error);
      } else {
        setIsPendingMigration(false);
        setAnnouncements(res.data);
      }
      setLoading(false);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  return {
    announcements,
    loading,
    error,
    isPendingMigration,
    refresh: loadData,
  };
}
