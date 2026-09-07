import { useState, useEffect, useCallback } from 'react';
import type { Attendance, AttendanceStatus } from '../types';
import {
  getMeetingAttendance,
  markAttendance,
  batchUpdateAttendance,
} from '../services/attendanceService';

export function useMeetingAttendance(meetingId: string | null) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!meetingId) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const res = await getMeetingAttendance(meetingId);
    if (res.error && !res.data.length) {
      setError(res.error);
    } else {
      setAttendance(res.data);
    }
    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!meetingId) {
        if (mounted) {
          setAttendance([]);
          setLoading(false);
        }
        return;
      }

      const res = await getMeetingAttendance(meetingId);
      if (!mounted) return;
      if (res.error && !res.data.length) {
        setError(res.error);
      } else {
        setAttendance(res.data);
      }
      setLoading(false);
    }

    void Promise.resolve().then(init);
    return () => {
      mounted = false;
    };
  }, [meetingId]);

  const setStatus = async (userId: string, status: AttendanceStatus) => {
    if (!meetingId) return;

    // Optimistic UI update
    setAttendance((prev) =>
      prev.map((a) => (a.user_id === userId ? { ...a, status } : a))
    );

    setSaving(true);
    const res = await markAttendance(meetingId, userId, status);
    setSaving(false);

    if (!res.success) {
      setError(res.error);
    }
  };

  const markAllPresent = async () => {
    if (!meetingId || !attendance.length) return;

    // Optimistic UI update
    setAttendance((prev) => prev.map((a) => ({ ...a, status: 'present' })));

    setSaving(true);
    const updates = attendance.map((a) => ({ user_id: a.user_id, status: 'present' as AttendanceStatus }));
    const res = await batchUpdateAttendance(meetingId, updates);
    setSaving(false);

    if (!res.success) {
      setError(res.error);
    }
  };

  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const stats = {
    total: attendance.length,
    present: presentCount,
    absent: attendance.filter((a) => a.status === 'absent').length,
    excused: attendance.filter((a) => a.status === 'excused').length,
    rate: attendance.length
      ? Math.round((presentCount / attendance.length) * 100)
      : 0,
  };

  return {
    attendance,
    stats,
    loading,
    saving,
    error,
    setStatus,
    markAllPresent,
    refresh: loadData,
  };
}
