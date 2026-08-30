import { useMemo, useState } from 'react';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import './Permissions.css';

type TriState = 'revoke' | 'inherit' | 'grant';

interface Member {
  id: string;
  name: string;
}

interface PermissionDef {
  key: string;
  label: string;
}

const MEMBERS: Member[] = [
  { id: 'riya', name: 'Riya S.' },
  { id: 'karan', name: 'Karan M.' },
  { id: 'sanjeev', name: 'Sanjeev V.' },
];

const PERMISSIONS: PermissionDef[] = [
  { key: 'viewAllBoards', label: 'View all boards' },
  { key: 'approveCompletions', label: 'Approve completions' },
  { key: 'manageRecurring', label: 'Manage recurring rules' },
];

// TEMP: default state per member — swap for a real fetch('/api/permissions')
// once the backend endpoint exists. Shape (Record<memberId, Record<permKey, TriState>>)
// should stay the same.
const DEFAULT_STATE: Record<string, Record<string, TriState>> = {
  riya: { viewAllBoards: 'inherit', approveCompletions: 'grant', manageRecurring: 'inherit' },
  karan: { viewAllBoards: 'inherit', approveCompletions: 'inherit', manageRecurring: 'revoke' },
  sanjeev: { viewAllBoards: 'inherit', approveCompletions: 'inherit', manageRecurring: 'revoke' },
};

export function Permissions() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState(MEMBERS[0].id);
  const [state, setState] = useState(DEFAULT_STATE);

  const selectedMember = MEMBERS.find((m) => m.id === selectedId)!;
  const selectedPerms = state[selectedId];

  const grantedLabels = useMemo(
    () =>
      PERMISSIONS.filter((p) => selectedPerms[p.key] === 'grant').map((p) => p.label.toLowerCase()),
    [selectedPerms],
  );

  function setPerm(permKey: string, value: TriState) {
    setState((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], [permKey]: value },
    }));
  }

  function handleSave() {
    toast(`PERMISSIONS SAVED — ${selectedMember.name.toUpperCase()}`);
  }

  function handleReset() {
    setState((prev) => ({ ...prev, [selectedId]: DEFAULT_STATE[selectedId] }));
    toast('RESET TO DEFAULT');
  }

  return (
    <div>
      <h1 className="st">Permissions</h1>
      <div className="perm-layout">
        <div className="perm-members">
          {MEMBERS.map((m) => (
            <div
              key={m.id}
              className={`pm-row ${m.id === selectedId ? 'active' : ''}`}
              onClick={() => setSelectedId(m.id)}
            >
              {m.name}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          {PERMISSIONS.map((perm) => (
            <div className="perm-row" key={perm.key}>
              <span>{perm.label}</span>
              <div className="tri">
                {(['revoke', 'inherit', 'grant'] as TriState[]).map((value) => (
                  <div
                    key={value}
                    className={`tri-btn ${selectedPerms[perm.key] === value ? 'active' : ''}`}
                    onClick={() => setPerm(perm.key, value)}
                  >
                    {value === 'revoke' ? 'Revoke' : value === 'inherit' ? 'Inherit' : 'Grant'}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="preview-mono">
            &gt; {selectedMember.name.toUpperCase()} WILL BE ABLE TO:{' '}
            {grantedLabels.length > 0 ? grantedLabels.join(' · ') : 'nothing beyond inherited defaults'}
          </div>

          <div style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 8 }}>
            <Button variant="primary" onClick={handleSave}>Save</Button>
            <Button variant="ghost" onClick={handleReset}>Reset to default</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
