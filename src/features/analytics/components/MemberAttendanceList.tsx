import { Panel } from '../../../components/Panel';
import { Avatar } from '../../../components/Avatar';
import type { MemberAttendanceMetric } from '../types';

export function MemberAttendanceList({ members }: { members: MemberAttendanceMetric[] }) {
  return (
    <Panel className="analytics-panel" bracket>
      <div className="analytics-panel-header">
        <div>
          <h3 className="analytics-panel-title">MEMBER ATTENDANCE RANKING</h3>
          <p className="analytics-panel-subtitle">
            Quorum and participation metrics ranked by attendance percentage
          </p>
        </div>
        <span className="roster-count">{members.length} OPERATORS</span>
      </div>

      {members.length === 0 ? (
        <div className="analytics-empty-note">No attendance records logged for team members.</div>
      ) : (
        <div className="member-rank-list">
          {members.map((m, index) => {
            const isTop = index === 0 && m.attendanceRate >= 80;
            const isWarning = m.attendanceRate < 60;
            const barColor = isWarning
              ? 'var(--st-blocked)'
              : m.attendanceRate >= 80
              ? 'var(--phosphor)'
              : 'var(--chan-design)';

            return (
              <div key={m.userId} className="member-rank-row">
                <div className="member-rank-index">
                  <span className={`rank-badge ${isTop ? 'top-rank' : ''}`}>#{index + 1}</span>
                </div>

                <div className="member-rank-user">
                  <Avatar initials={m.userInitials} />
                  <div className="member-name-wrap">
                    <div className="member-name">{m.userName}</div>
                    <div className="member-meta">
                      {m.role?.toUpperCase() || 'MEMBER'} · {m.attendedCount} of {m.totalMeetings} sessions
                    </div>
                  </div>
                </div>

                <div className="member-rank-stats">
                  <div className="rate-text-wrap">
                    <span className="rate-num" style={{ color: barColor }}>
                      {m.attendanceRate}%
                    </span>
                    <span className="rate-breakdown">
                      (P:{m.presentCount} E:{m.excusedCount} A:{m.absentCount})
                    </span>
                  </div>

                  <div className="rate-bar-track">
                    <div
                      className="rate-bar-fill"
                      style={{
                        width: `${m.attendanceRate}%`,
                        backgroundColor: barColor,
                        boxShadow: `0 0 6px ${barColor}44`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
