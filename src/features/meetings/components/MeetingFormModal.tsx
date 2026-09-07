import { useState } from 'react';
import { Button } from '../../../components/Button';
import type { CreateMeetingInput, Meeting, MeetingScope, UpdateMeetingInput } from '../types';

interface MeetingFormModalProps {
  initialMeeting?: Meeting | null;
  onClose: () => void;
  onSubmit: (data: CreateMeetingInput | UpdateMeetingInput) => void;
}

function toLocalDatetimeInput(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

export function MeetingFormModal({
  initialMeeting,
  onClose,
  onSubmit,
}: MeetingFormModalProps) {
  const isEditing = Boolean(initialMeeting);

  const [title, setTitle] = useState(initialMeeting?.title || '');
  const [heldAt, setHeldAt] = useState(() =>
    toLocalDatetimeInput(initialMeeting?.held_at) ||
      toLocalDatetimeInput(new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString())
  );
  const [venue, setVenue] = useState(initialMeeting?.venue || 'Bridge Conf Room · Virtual Deck');
  const [scope, setScope] = useState<MeetingScope>(initialMeeting?.scope || 'domain');
  const [scopeId, setScopeId] = useState(initialMeeting?.scope_id || 'technical');
  const [minutes, setMinutes] = useState(initialMeeting?.minutes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !heldAt || !venue.trim()) return;

    const payload: CreateMeetingInput | UpdateMeetingInput = {
      title: title.trim(),
      held_at: new Date(heldAt).toISOString(),
      venue: venue.trim(),
      scope,
      scope_id: scope === 'club' ? null : scopeId.trim() || null,
      minutes: minutes.trim() || undefined,
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <div className="meeting-modal-scrim" onClick={onClose}>
      <div className="meeting-form-box" onClick={(e) => e.stopPropagation()}>
        <div className="meeting-form-header">
          <div>
            <span className="section-micro-label">
              {isEditing ? 'UPDATE / RESCHEDULE' : 'SCHEDULE NEW BRIEFING'}
            </span>
            <h3 className="meeting-form-title">
              {isEditing ? `Edit: ${initialMeeting?.title}` : 'Directives & Briefing Roster'}
            </h3>
          </div>
          <button type="button" className="meeting-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="meeting-form">
          <div className="form-group">
            <label htmlFor="meet-title">BRIEFING TITLE *</label>
            <input
              id="meet-title"
              type="text"
              required
              className="meeting-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint 84 Domain Architecture Review"
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="meet-held-at">SCHEDULED DATE &amp; TIME (HELD AT) *</label>
              <input
                id="meet-held-at"
                type="datetime-local"
                required
                className="meeting-input"
                value={heldAt}
                onChange={(e) => setHeldAt(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="meet-venue">VENUE / CHANNEL *</label>
              <input
                id="meet-venue"
                type="text"
                required
                className="meeting-input"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Studio Terminal 4 / Discord"
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="meet-scope">SCOPE *</label>
              <select
                id="meet-scope"
                className="meeting-select"
                value={scope}
                onChange={(e) => setScope(e.target.value as MeetingScope)}
              >
                <option value="club">Club-wide (General)</option>
                <option value="domain">Domain Specific</option>
                <option value="committee">Committee</option>
              </select>
            </div>

            {scope !== 'club' && (
              <div className="form-group">
                <label htmlFor="meet-scope-id">
                  {scope === 'domain' ? 'DOMAIN IDENTIFIER' : 'COMMITTEE IDENTIFIER'}
                </label>
                <input
                  id="meet-scope-id"
                  type="text"
                  className="meeting-input"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  placeholder={scope === 'domain' ? 'technical, design, etc.' : 'organizing, techfest, etc.'}
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="meet-minutes">AGENDA / MINUTES OF MEETING (OPTIONAL)</label>
            <textarea
              id="meet-minutes"
              className="meeting-textarea"
              rows={3}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Initial agenda topics or recorded decision minutes..."
            />
          </div>

          <div className="meeting-form-actions">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              {isEditing ? 'Update Session' : 'Create Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
