import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CreateMeetingInput, Meeting, UpdateMeetingInput } from '../types';
import {
  getMeetings,
  createMeeting as apiCreateMeeting,
  updateMeeting as apiUpdateMeeting,
  cancelMeeting as apiCancelMeeting,
} from '../services/meetingService';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPendingMigration, setIsPendingMigration] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const res = await getMeetings();
    if (res.isPendingMigration) {
      setIsPendingMigration(true);
    }
    if (res.error && !res.data.length) {
      setError(res.error);
    } else {
      setMeetings(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const res = await getMeetings();
      if (!mounted) return;
      if (res.isPendingMigration) {
        setIsPendingMigration(true);
      }
      if (res.error && !res.data.length) {
        setError(res.error);
      } else {
        setMeetings(res.data);
      }
      setLoading(false);
    }
    void init();
    return () => {
      mounted = false;
    };
  }, []);

  const create = async (input: CreateMeetingInput) => {
    const res = await apiCreateMeeting(input);
    if (res.data) {
      setMeetings((prev) => [res.data as Meeting, ...prev]);
    }
    return res;
  };

  const update = async (id: string, input: UpdateMeetingInput) => {
    const res = await apiUpdateMeeting(id, input);
    if (res.data) {
      setMeetings((prev) => prev.map((m) => (m.id === id ? (res.data as Meeting) : m)));
    }
    return res;
  };

  const cancel = async (id: string) => {
    const res = await apiCancelMeeting(id);
    if (res.success) {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    }
    return res;
  };

  const [now] = useState(() => Date.now());

  const { upcomingMeetings, pastMeetings } = useMemo(() => {
    const upcoming = meetings
      .filter((m) => new Date(m.held_at).getTime() >= now - 1000 * 60 * 60)
      .sort((a, b) => new Date(a.held_at).getTime() - new Date(b.held_at).getTime());

    const past = meetings
      .filter((m) => Boolean(m.minutes) || new Date(m.held_at).getTime() < now - 1000 * 60 * 60)
      .sort((a, b) => new Date(b.held_at).getTime() - new Date(a.held_at).getTime());

    return { upcomingMeetings: upcoming, pastMeetings: past };
  }, [meetings, now]);

  const cancelledMeetings: Meeting[] = [];

  return {
    meetings,
    upcomingMeetings,
    pastMeetings,
    cancelledMeetings,
    loading,
    error,
    isPendingMigration,
    create,
    update,
    cancel,
    refresh: loadData,
  };
}
