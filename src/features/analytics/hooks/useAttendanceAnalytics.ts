import { useState, useEffect, useCallback } from 'react';
import {
  getAttendanceAnalytics,
  type AttendanceAnalyticsResult,
} from '../services/attendanceAnalyticsService';

const DEFAULT_RESULT: AttendanceAnalyticsResult = {
  overview: {
    totalMeetings: 0,
    totalAttendanceRecords: 0,
    presentCount: 0,
    absentCount: 0,
    excusedCount: 0,
    overallRate: 0,
  },
  memberMetrics: [],
  domainMetrics: [],
  meetingStats: [],
  statusDistribution: {
    total: 0,
    scheduled: 0,
    completed: 0,
    completionRate: 0,
  },
  attendanceTrend: [],
  leadershipOps: {
    cadenceWeekly: 0,
    documentationRate: 0,
    highQuorumRate: 0,
    averageRosterSize: 0,
    activeDomainsCount: 0,
  },
  isPendingMigration: false,
  error: null,
};

export function useAttendanceAnalytics() {
  const [data, setData] = useState<AttendanceAnalyticsResult>(DEFAULT_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAttendanceAnalytics();
    if (res.error && !res.overview.totalMeetings) {
      setError(res.error);
    } else {
      setData(res);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const res = await getAttendanceAnalytics();
      if (!mounted) return;
      if (res.error && !res.overview.totalMeetings) {
        setError(res.error);
      } else {
        setData(res);
      }
      setLoading(false);
    }

    void Promise.resolve().then(init);
    return () => {
      mounted = false;
    };
  }, []);

  return {
    ...data,
    loading,
    error,
    refresh: loadData,
  };
}
