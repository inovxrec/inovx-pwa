import { useState } from 'react';
import { useAttendanceAnalytics } from './hooks/useAttendanceAnalytics';
import { LeadershipAnalyticsView } from './components/LeadershipAnalyticsView';
import { DomainAnalyticsView } from './components/DomainAnalyticsView';
import { AttendanceSummaryCards } from './components/AttendanceSummaryCards';
import { MemberAttendanceList } from './components/MemberAttendanceList';
import { CoreTeamLeaderboard } from './components/CoreTeamLeaderboard';
import { exportAttendanceRosterCsv, exportDomainMetricsCsv } from './utils/csvExport';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import './AttendanceAnalytics.css';

type AnalyticsTab = 'leadership' | 'domains' | 'roster' | 'leaderboard';

export function AttendanceAnalytics() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('leadership');
  const analyticsData = useAttendanceAnalytics();

  const {
    overview,
    memberMetrics,
    domainMetrics,
    loading,
    error,
    isPendingMigration,
    refresh,
  } = analyticsData;

  const hasData = overview.totalMeetings > 0;

  return (
    <div className="analytics-screen">
      {isPendingMigration && (
        <div className="notif-migration-alert">
          <div>
            <div className="alert-tag">PART B DATABASE NOTICE: ANALYTICS TELEMETRY</div>
            <div className="alert-message">
              Database tables <code>meetings</code> and <code>attendance</code> are pending in
              Supabase schema cache. Metrics are derived from synchronized persistent store so
              leadership KPIs, domain distributions, and quorum trends can be reviewed immediately.
            </div>
          </div>
        </div>
      )}

      {/* Analytics Header */}
      <div className="analytics-header">
        <div className="analytics-header-title">
          <div
            className="eyebrow"
            style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}
          >
            STATION OPERATIONAL INTELLIGENCE · PART F
          </div>
          <h1 className="section-title" style={{ fontSize: '20px' }}>
            LEADERSHIP &amp; DOMAIN ANALYTICS
          </h1>
        </div>

        <div className="analytics-header-actions" style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="ghost"
            onClick={() => exportAttendanceRosterCsv(memberMetrics)}
            title="Download quorum attendance CSV"
          >
            ⤓ Export Roster CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => exportDomainMetricsCsv(domainMetrics)}
            title="Download domain metrics CSV"
          >
            ⤓ Export Domains CSV
          </Button>
          <Button variant="ghost" onClick={refresh} title="Recalculate analytics telemetry">
            ↻ Recalculate
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="analytics-tabs-nav">
        <button
          type="button"
          className={`analytics-tab-btn ${activeTab === 'leadership' ? 'active' : ''}`}
          onClick={() => setActiveTab('leadership')}
        >
          LEADERSHIP OVERSIGHT
        </button>
        <button
          type="button"
          className={`analytics-tab-btn ${activeTab === 'domains' ? 'active' : ''}`}
          onClick={() => setActiveTab('domains')}
        >
          DOMAIN ANALYTICS ({domainMetrics.length})
        </button>
        <button
          type="button"
          className={`analytics-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          QUORUM ROSTER ({memberMetrics.length})
        </button>
        <button
          type="button"
          className={`analytics-tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          CORE LEADERBOARD
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <Panel className="notif-status-panel">
          <span>&gt; AGGREGATING PARTICIPATION ROSTERS AND COMPUTING ATTENDANCE RATES...</span>
        </Panel>
      )}

      {/* Error State */}
      {error && (
        <Panel className="notif-error-panel">
          <div className="error-title">ANALYTICS ENGINE NOTICE</div>
          <div className="error-body">{error}</div>
        </Panel>
      )}

      {/* Empty State when no meetings exist */}
      {!loading && !hasData && (
        <Panel className="analytics-panel">
          <div className="analytics-empty-state">
            <div className="empty-title">NO MEETING SESSIONS RECORDED YET</div>
            <p>
              Schedule meetings and submit attendance rosters in the Meetings module to populate
              leadership KPIs, quorum trends, and domain performance telemetry.
            </p>
          </div>
        </Panel>
      )}

      {/* Tab Content */}
      {!loading && hasData && (
        <>
          {activeTab === 'leadership' && (
            <LeadershipAnalyticsView data={analyticsData} />
          )}

          {activeTab === 'domains' && (
            <DomainAnalyticsView domains={domainMetrics} />
          )}

          {activeTab === 'roster' && (
            <div className="roster-view-container">
              <AttendanceSummaryCards overview={overview} />
              <div className="analytics-layout-grid" style={{ gridTemplateColumns: '1fr' }}>
                <MemberAttendanceList members={memberMetrics} />
              </div>
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <CoreTeamLeaderboard members={memberMetrics} />
          )}
        </>
      )}
    </div>
  );
}
