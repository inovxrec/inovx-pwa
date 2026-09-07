import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../store/authStore';
import type {
  MemberProfile,
  PermissionKey,
  TriState,
  AuditLogEntry,
} from '../../lib/permissions/types';
import {
  PERMISSION_CATALOGUE,
} from '../../lib/permissions/types';
import {
  formatEffectivePreview,
  resolveEffectivePermission,
} from '../../lib/permissions/resolver';
import {
  fetchMembersWithPermissions,
  saveUserPermissions,
  resetUserPermissions,
  fetchAuditLogs,
} from '../../lib/permissions/service';
import './Permissions.css';

export function Permissions() {
  const { toast } = useToast();
  const { session } = useAuth();
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [permissionsState, setPermissionsState] = useState<Record<string, Record<string, TriState>>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Load members and permissions on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { members: loadedMembers, permissionsState: loadedState } =
          await fetchMembersWithPermissions();
        setMembers(loadedMembers);
        setPermissionsState(loadedState);
        if (loadedMembers.length > 0) {
          setSelectedId(loadedMembers[0].id);
        }
      } catch (err) {
        console.error('Failed to load permissions data:', err);
        toast('ERROR LOADING PERMISSIONS');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [toast]);

  // Load audit logs when toggled
  useEffect(() => {
    if (showAuditHistory) {
      fetchAuditLogs().then(setAuditLogs);
    }
  }, [showAuditHistory]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.domain.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // Find selected member by ID, fall back to first member, but handle empty list safely
  const selectedMember = useMemo(() => {
    const found = members.find((m) => m.id === selectedId);
    if (found) return found;
    if (members.length > 0) return members[0];
    return undefined;
  }, [members, selectedId]);

  const selectedOverrides = selectedMember ? permissionsState[selectedMember.id] || {} : {};

  // Group permissions by category for clear readability
  const categories = useMemo(() => {
    const map = new Map<string, typeof PERMISSION_CATALOGUE>();
    for (const item of PERMISSION_CATALOGUE) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, []);

  function setTriState(permKey: PermissionKey, value: TriState) {
    if (!selectedMember) return;
    setPermissionsState((prev) => ({
      ...prev,
      [selectedMember.id]: {
        ...(prev[selectedMember.id] || {}),
        [permKey]: value,
      },
    }));
  }

  async function handleSave() {
    if (!selectedMember) return;
    setSaving(true);
    try {
      const res = await saveUserPermissions(
        selectedMember.id,
        permissionsState[selectedMember.id] || {},
        session?.userId || 'unknown',
        session?.name || 'User',
        selectedMember.role
      );
      if (res.success) {
        toast(`PERMISSIONS SAVED — ${selectedMember.name.toUpperCase()}`);
        if (showAuditHistory) {
          fetchAuditLogs().then(setAuditLogs);
        }
      } else {
        toast(`SAVE FAILED: ${res.error || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selectedMember) return;
    const confirmReset = window.confirm(
      `Reset all custom permissions for ${selectedMember.name} back to role default (${selectedMember.role})?`
    );
    if (!confirmReset) return;

    setSaving(true);
    try {
      const res = await resetUserPermissions(
        selectedMember.id,
        session?.userId || 'unknown',
        session?.name || 'User'
      );
      if (res.success) {
        // Reset local state to all inherit
        setPermissionsState((prev) => {
          const resetMap: Record<string, TriState> = {};
          for (const p of PERMISSION_CATALOGUE) {
            resetMap[p.key] = 'inherit';
          }
          return { ...prev, [selectedMember.id]: resetMap };
        });
        toast(`RESET TO DEFAULT — ${selectedMember.role.toUpperCase()}`);
        if (showAuditHistory) {
          fetchAuditLogs().then(setAuditLogs);
        }
      } else {
        toast(`RESET FAILED: ${res.error || 'Unknown error'}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="perm-container">
        <h1 className="st">Permissions & Access Control</h1>
        <div className="preview-mono">INITIALIZING SECURITY ENGINE & FETCHING ROSTERS...</div>
      </div>
    );
  }

  return (
    <div className="perm-container">
      <div className="perm-header-row">
        <div>
          <h1 className="st">Permissions & Access Control</h1>
          <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: 2 }}>
            Granular Tri-State Authority Engine · Postgres Row-Level Security (RLS)
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={() => setShowAuditHistory(!showAuditHistory)}
        >
          {showAuditHistory ? 'Hide Audit Log' : 'View Audit Log'}
        </Button>
      </div>

      <div className="perm-layout">
        {/* Left: Member Directory Selector */}
        <div className="perm-members">
          <input
            type="text"
            className="perm-search-box"
            placeholder="Search member / role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="perm-members-list">
            {filteredMembers.map((m) => (
              <div
                key={m.id}
                className={`pm-row ${m.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(m.id)}
              >
                <div className="pm-name-row">
                  <span className="pm-name">{m.name}</span>
                  <span className="pm-role-tag">{m.role.replace('_', ' ')}</span>
                </div>
                <span className="pm-sub">{m.positionTitle || m.domain}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Permission Configuration & Effective Preview */}
        {selectedMember && (
          <div className="perm-content">
            <div className="perm-member-banner">
              <div className="perm-member-info">
                <h2>{selectedMember.name}</h2>
                <div className="perm-member-meta">
                  <span>Role: <strong>{selectedMember.role.toUpperCase()}</strong></span>
                  <span>·</span>
                  <span>Domain: <strong>{selectedMember.domain.toUpperCase()}</strong></span>
                  <span>·</span>
                  <span>{selectedMember.email}</span>
                </div>
              </div>
              <div className="perm-buttons">
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="ghost" onClick={handleReset} disabled={saving}>
                  Reset to Role Default
                </Button>
              </div>
            </div>

            {/* Categorized Permission Matrix */}
            {categories.map(([categoryName, perms]) => (
              <div className="perm-category-group" key={categoryName}>
                <div className="perm-category-title">{categoryName}</div>
                {perms.map((perm) => {
                  const currentValue = selectedOverrides[perm.key] || 'inherit';
                  const isEffectiveActive = resolveEffectivePermission(
                    selectedMember.role,
                    selectedOverrides,
                    perm.key
                  );

                  return (
                    <div className="perm-row" key={perm.key}>
                      <div className="perm-meta">
                        <span className="perm-label">{perm.label}</span>
                        <span className="perm-desc">{perm.description}</span>
                      </div>
                      <div className="tri">
                        {(['revoke', 'inherit', 'grant'] as TriState[]).map((value) => (
                          <button
                            type="button"
                            key={value}
                            className={`tri-btn ${currentValue === value ? `active ${value}` : ''}`}
                            onClick={() => setTriState(perm.key, value)}
                            title={
                              value === 'inherit'
                                ? `Inherit default from ${selectedMember.role} (${isEffectiveActive ? 'Allowed' : 'Denied'})`
                                : value === 'grant'
                                ? 'Explicitly Grant (+)'
                                : 'Explicitly Revoke (-)'
                            }
                          >
                            {value === 'revoke' ? 'Revoke' : value === 'inherit' ? 'Inherit' : 'Grant'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* FR-ROLE-2: Live Dynamic Effective Preview */}
            <div className="preview-mono">
              &gt; {selectedMember.name.toUpperCase()} WILL BE ABLE TO:{' '}
              {formatEffectivePreview(selectedMember.role, selectedOverrides)}
            </div>

            <div className="perm-actions-row">
              <div style={{ fontSize: '11.5px', color: 'var(--ink-3)' }}>
                * Granular grants override base role defaults in Postgres RLS policies immediately.
              </div>
              <div className="perm-buttons">
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="ghost" onClick={handleReset} disabled={saving}>
                  Reset to Role Default
                </Button>
              </div>
            </div>

            {/* FR-ROLE-3: Audit Log History Panel */}
            {showAuditHistory && (
              <div className="audit-panel">
                <div className="audit-title">
                  <span>Security & Permission Audit Trail (FR-ROLE-3)</span>
                  <span style={{ fontSize: '10px', color: 'var(--ink-3)' }}>Latest 20 Events</span>
                </div>
                {auditLogs.length === 0 ? (
                  <div style={{ fontSize: '11.5px', color: 'var(--ink-3)', padding: '8px 0' }}>
                    No audit records logged yet.
                  </div>
                ) : (
                  <table className="audit-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Action</th>
                        <th>Target ID</th>
                        <th>Diff / Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td>{new Date(log.createdAt).toLocaleString()}</td>
                          <td>
                            <span className="audit-action-tag">{log.action}</span>
                          </td>
                          <td>{log.entityId}</td>
                          <td>
                            <code>{JSON.stringify(log.diff)}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
