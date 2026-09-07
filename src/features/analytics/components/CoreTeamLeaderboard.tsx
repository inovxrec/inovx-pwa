import { Panel } from '../../../components/Panel';
import { Avatar } from '../../../components/Avatar';
import type { MemberAttendanceMetric } from '../types';

export interface LeaderboardMember extends MemberAttendanceMetric {
  positionTitle?: string;
  points: number;
  rank: number;
}

interface CoreTeamLeaderboardProps {
  members: MemberAttendanceMetric[];
  currentUserRole?: string;
}

export function CoreTeamLeaderboard({ members }: CoreTeamLeaderboardProps) {
  // Filter core team only: role is admin/super_admin or domain is core
  const coreMembers = members.filter((m) => {
    const role = (m.role || '').toLowerCase();
    return (
      role.includes('admin') ||
      role.includes('lead') ||
      role === 'super_admin' ||
      m.userName.includes('Command') ||
      m.userName.includes('Lead')
    );
  });

  // Calculate leaderboard points and rank
  const scoredMembers: LeaderboardMember[] = (coreMembers.length > 0 ? coreMembers : members)
    .map((m) => {
      // Composite operational score: (attendanceRate * 10) + (attendedCount * 15)
      const points = Math.round(m.attendanceRate * 10 + m.attendedCount * 15);
      return {
        ...m,
        points,
        rank: 0,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  return (
    <Panel className="analytics-panel">
      <div className="analytics-panel-header">
        <div>
          <div className="panel-eyebrow">RESTRICTED STATION CLEARANCE · PART F</div>
          <h3 className="analytics-panel-title">CORE TEAM OPERATIONAL LEADERBOARD</h3>
          <p className="analytics-panel-subtitle">
            Executive rank and participation telemetry for station leadership &amp; core council
          </p>
        </div>
        <span className="roster-count">{scoredMembers.length} CORE OPERATORS</span>
      </div>

      <div className="leaderboard-table-wrap">
        <table className="roster-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>RANK</th>
              <th>OPERATOR</th>
              <th>POSITION / ROLE</th>
              <th>SESSIONS</th>
              <th>ATTENDANCE RATE</th>
              <th>STATION MERIT PTS</th>
            </tr>
          </thead>
          <tbody>
            {scoredMembers.map((member) => {
              const isTop1 = member.rank === 1;
              const isTop2 = member.rank === 2;
              const isTop3 = member.rank === 3;

              let rankBadgeClass = 'rank-badge-standard';
              if (isTop1) rankBadgeClass = 'rank-badge-gold';
              else if (isTop2) rankBadgeClass = 'rank-badge-silver';
              else if (isTop3) rankBadgeClass = 'rank-badge-bronze';

              return (
                <tr key={member.userId} className={isTop1 ? 'leaderboard-top-row' : ''}>
                  <td>
                    <span className={`rank-badge ${rankBadgeClass}`}>
                      {member.rank <= 3 ? `★ ${member.rank}` : `#${member.rank}`}
                    </span>
                  </td>
                  <td>
                    <div className="member-name-cell">
                      <Avatar initials={member.userInitials} size="sm" />
                      <span className="member-name-text">{member.userName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="member-role-tag">
                      {member.role ? member.role.toUpperCase() : 'COMMAND CORE'}
                    </span>
                  </td>
                  <td>
                    <span className="member-attended-val">{member.attendedCount}</span>
                    <span className="member-total-sub"> / {member.totalMeetings}</span>
                  </td>
                  <td>
                    <div className="rate-cell-wrap">
                      <div className="rate-bar-track">
                        <div
                          className={`rate-bar-fill ${
                            member.attendanceRate >= 80
                              ? 'rate-high'
                              : member.attendanceRate >= 50
                              ? 'rate-med'
                              : 'rate-low'
                          }`}
                          style={{ width: `${member.attendanceRate}%` }}
                        />
                      </div>
                      <span className="rate-percent-text">{member.attendanceRate}%</span>
                    </div>
                  </td>
                  <td>
                    <span className="merit-points-text">{member.points} PTS</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
