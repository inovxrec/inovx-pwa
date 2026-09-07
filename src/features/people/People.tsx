import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Avatar } from '../../components/Avatar';
import { Panel } from '../../components/Panel';
import { Button } from '../../components/Button';
import './People.css';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  initials: string;
  domain_id?: string | null;
  role: 'super_admin' | 'admin' | 'member' | 'faculty';
  position_title?: string | null;
  status: string;
  must_change_password?: boolean;
  tenure_id?: string | null;
}

const FALLBACK_USERS: UserProfile[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'varun.s@inovx.internal',
    name: 'Varun S.',
    initials: 'VS',
    domain_id: 'technical',
    role: 'super_admin',
    position_title: 'Station Lead & Systems Architect',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'ananya.r@inovx.internal',
    name: 'Ananya Rao',
    initials: 'AR',
    domain_id: 'design',
    role: 'admin',
    position_title: 'Domain Lead · Visual Design',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'karan.m@inovx.internal',
    name: 'Karan M.',
    initials: 'KM',
    domain_id: 'events',
    role: 'member',
    position_title: 'Events Specialist',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'sanjeev.v@inovx.internal',
    name: 'Sanjeev V.',
    initials: 'SV',
    domain_id: 'technical',
    role: 'member',
    position_title: 'Subsystem Engineer',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'akash.d@inovx.internal',
    name: 'Akash D.',
    initials: 'AD',
    domain_id: 'design',
    role: 'member',
    position_title: 'UI Engineer',
    status: 'active',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'dr.menon@college.edu',
    name: 'Dr. Menon',
    initials: 'DM',
    domain_id: 'core',
    role: 'faculty',
    position_title: 'Faculty Advisor',
    status: 'active',
  },
];

export function People() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadUsers() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, name, initials, domain_id, role, position_title, status, must_change_password, tenure_id')
          .order('name', { ascending: true });

        if (!mounted) return;

        if (error || !data || data.length === 0) {
          setUsers(FALLBACK_USERS);
        } else {
          setUsers(data as UserProfile[]);
        }
      } catch {
        if (mounted) setUsers(FALLBACK_USERS);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadUsers();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.domain_id && u.domain_id.toLowerCase().includes(q)) ||
      (u.position_title && u.position_title.toLowerCase().includes(q)) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="people-screen">
      <div className="people-top-bar">
        <div>
          <div className="people-eyebrow">STATION PERSONNEL ROSTER · PART F</div>
          <h1 className="st" style={{ margin: 0 }}>MEMBER PROFILES</h1>
        </div>

        <div className="people-search-bar">
          <input
            type="text"
            className="people-search-input"
            placeholder="Search by name, role, domain, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Panel className="notif-status-panel">
          <span>&gt; RETRIEVING PERSONNEL TELEMETRY FROM CREW MANIFEST...</span>
        </Panel>
      ) : (
        <div className="people-grid">
          {filteredUsers.map((p) => (
            <Panel
              key={p.id}
              className="person-card"
              onClick={() => setSelectedUser(p)}
              style={{ cursor: 'pointer' }}
            >
              <div className="person-card-header">
                <Avatar initials={p.initials || p.name.substring(0, 2).toUpperCase()} size="lg" />
                <div className="person-card-meta">
                  <div className="person-name">{p.name}</div>
                  <div className="person-sub">
                    {p.domain_id ? p.domain_id.toUpperCase() : 'GENERAL'} ·{' '}
                    <span className="person-role-tag">{p.role.toUpperCase()}</span>
                  </div>
                  {p.position_title && (
                    <div className="person-title-text">{p.position_title}</div>
                  )}
                </div>
              </div>
              <div className="person-card-footer">
                <span className="person-email-text">{p.email}</span>
                <span className={`person-status-badge status-${p.status}`}>{p.status.toUpperCase()}</span>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* Profile Detail Drawer Modal */}
      {selectedUser && (
        <div className="profile-modal-scrim" onClick={() => setSelectedUser(null)}>
          <div className="profile-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <div className="profile-header-meta">
                <Avatar
                  initials={selectedUser.initials || selectedUser.name.substring(0, 2).toUpperCase()}
                  size="lg"
                />
                <div>
                  <h2 className="profile-name-title">{selectedUser.name}</h2>
                  <div className="profile-sub-title">
                    {selectedUser.position_title || selectedUser.role.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="profile-close-btn"
                onClick={() => setSelectedUser(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="profile-info-grid">
              <div className="profile-info-cell">
                <span className="cell-label">OPERATOR EMAIL</span>
                <span className="cell-value">{selectedUser.email}</span>
              </div>
              <div className="profile-info-cell">
                <span className="cell-label">PRIMARY DOMAIN</span>
                <span className="cell-value">
                  {selectedUser.domain_id ? selectedUser.domain_id.toUpperCase() : 'CORE / UNASSIGNED'}
                </span>
              </div>
              <div className="profile-info-cell">
                <span className="cell-label">STATION ROLE</span>
                <span className="cell-value">{selectedUser.role.toUpperCase()}</span>
              </div>
              <div className="profile-info-cell">
                <span className="cell-label">CREW STATUS</span>
                <span className="cell-value">
                  <span className={`person-status-badge status-${selectedUser.status}`}>
                    {selectedUser.status.toUpperCase()}
                  </span>
                </span>
              </div>
              {selectedUser.tenure_id && (
                <div className="profile-info-cell">
                  <span className="cell-label">ACTIVE TENURE</span>
                  <span className="cell-value">{selectedUser.tenure_id}</span>
                </div>
              )}
            </div>

            <div className="profile-actions-bar">
              <Button variant="ghost" onClick={() => setSelectedUser(null)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
