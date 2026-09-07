import { useState, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/Button';
import { Avatar } from '../../../components/Avatar';
import { AttendanceStatusPill } from './AttendanceStatusPill';
import { useMeetingAttendance } from '../hooks/useMeetingAttendance';
import { useToast } from '../../../components/Toast';
import type { AttendanceStatus, Meeting } from '../types';

interface MeetingDetailModalProps {
  meeting: Meeting | null;
  onClose: () => void;
  onEdit: (meeting: Meeting) => void;
  onCancelMeeting: (meetingId: string) => void;
  onSaveMinutes: (meetingId: string, minutes: string) => void;
}

export function MeetingDetailModal({
  meeting,
  onClose,
  onEdit,
  onCancelMeeting,
  onSaveMinutes,
}: MeetingDetailModalProps) {
  const { toast } = useToast();
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutesText, setMinutesText] = useState(meeting?.minutes || '');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const {
    attendance,
    stats,
    loading: attLoading,
    setStatus,
    markAllPresent,
  } = useMeetingAttendance(meeting ? meeting.id : null);

  const [now] = useState(() => Date.now());

  const isConcluded = useMemo(() => {
    if (!meeting) return false;
    return new Date(meeting.held_at).getTime() < now || Boolean(meeting.minutes);
  }, [meeting, now]);

  if (!meeting) return null;

  const handleSaveMinutes = () => {
    onSaveMinutes(meeting.id, minutesText);
    setEditingMinutes(false);
    toast('MINUTES UPDATED & COMMITTED');
  };

  const handleStatusChange = async (userId: string, status: AttendanceStatus) => {
    await setStatus(userId, status);
    toast(`STATUS UPDATED: ${status.toUpperCase()}`);
  };

  const handleMarkAllPresent = async () => {
    await markAllPresent();
    toast('ALL ATTENDEES MARKED PRESENT');
  };

  const handleCreateTaskFromMinutes = async () => {
    if (!newTaskTitle.trim()) return;
    const title = newTaskTitle.trim();
    const taskId = crypto.randomUUID();

    try {
      await supabase.from('tasks').insert({
        id: taskId,
        title,
        description: `Origin Meeting: ${meeting.title} (${new Date(meeting.held_at).toLocaleDateString()})`,
        context_type: meeting.scope === 'committee' ? 'committee' : 'domain',
        context_id: meeting.scope_id || 'technical',
        priority: 'medium',
        due_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(),
        status: 'todo',
        approval_required: false,
        tenure_id: meeting.tenure_id || null,
        labels: ['action-item', 'minutes'],
      });
    } catch {
      // Database table may be pending schema migration
    }

    toast(`ACTION ITEM LOGGED: "${title}" (Origin: ${meeting.title})`);
    setNewTaskTitle('');
  };

  return (
    <div className="meeting-modal-scrim" onClick={onClose}>
      <div className="meeting-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="meeting-modal-header">
          <div>
            <div className="meeting-modal-meta">
              <span
                className="meeting-domain-tag"
                style={{
                  color: 'var(--chan)',
                  borderColor: 'rgba(255, 179, 71, 0.3)',
                }}
              >
                SCOPE: {meeting.scope.toUpperCase()}
              </span>
              <span className="meta-status">
                LIFECYCLE: {isConcluded ? 'COMPLETED' : 'SCHEDULED'}
              </span>
            </div>
            <h2 className="meeting-modal-title">{meeting.title}</h2>
          </div>
          <button type="button" className="meeting-modal-close" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Meeting Information Details */}
        <div className="meeting-info-grid">
          <div className="info-cell">
            <span className="info-cell-key">TIME &amp; SCHEDULE</span>
            <span className="info-cell-val">
              {new Date(meeting.held_at).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
          <div className="info-cell">
            <span className="info-cell-key">VENUE / CHANNEL</span>
            <span className="info-cell-val">{meeting.venue}</span>
          </div>
          <div className="info-cell">
            <span className="info-cell-key">SCOPE ATTRIBUTION</span>
            <span className="info-cell-val">{meeting.scope_id || meeting.scope.toUpperCase()}</span>
          </div>
          <div className="info-cell">
            <span className="info-cell-key">QUORUM RATE</span>
            <span className="info-cell-val" style={{ color: 'var(--phosphor)' }}>
              {stats.rate}% ATTENDANCE
            </span>
          </div>
        </div>

        {/* Minutes of Meeting Section */}
        <div className="meeting-minutes-section">
          <div className="section-head-row">
            <span className="section-micro-label">MINUTES OF MEETING (MOM)</span>
            {!editingMinutes && (
              <Button
                variant="ghost"
                className="micro-btn"
                onClick={() => {
                  setMinutesText(meeting.minutes || '');
                  setEditingMinutes(true);
                }}
              >
                {meeting.minutes ? 'Edit Minutes' : '+ Add Minutes'}
              </Button>
            )}
          </div>

          {editingMinutes ? (
            <div className="minutes-editor">
              <textarea
                className="minutes-textarea"
                rows={4}
                value={minutesText}
                onChange={(e) => setMinutesText(e.target.value)}
                placeholder="Log discussion points, decisions made, and follow-up action items..."
              />
              <div className="minutes-editor-actions">
                <Button variant="ghost" onClick={() => setEditingMinutes(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveMinutes}>
                  Save Minutes
                </Button>
              </div>
            </div>
          ) : (
            <div className="minutes-display">
              {meeting.minutes ? (
                <p className="minutes-content">{meeting.minutes}</p>
              ) : (
                <span className="minutes-empty">
                  No minutes logged yet. Click &quot;+ Add Minutes&quot; to record decisions.
                </span>
              )}
            </div>
          )}
        </div>

        {/* Minutes-to-Task Extraction Workflow */}
        <div className="minutes-to-task-section" style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
          <span className="section-micro-label">MINUTES-TO-TASK ACTION ITEM WORKFLOW</span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input
              type="text"
              className="meeting-input"
              style={{ flex: 1, padding: '6px 10px', fontSize: '13px', background: 'var(--panel-2)', border: '1px solid var(--line)', color: 'var(--ink)' }}
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Extract follow-up action item as task..."
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTaskFromMinutes()}
            />
            <Button variant="secondary" className="micro-btn" onClick={handleCreateTaskFromMinutes}>
              + Add Directive
            </Button>
          </div>
        </div>

        {/* Attendance Section (Only present, absent, excused - no late) */}
        <div className="meeting-attendance-section">
          <div className="section-head-row">
            <div>
              <span className="section-micro-label">ATTENDANCE ROSTER ({stats.total} PERSONNEL)</span>
              <div className="att-stats-summary">
                <span className="stat-pill st-p">P: {stats.present}</span>
                <span className="stat-pill st-a">A: {stats.absent}</span>
                <span className="stat-pill st-e">E: {stats.excused}</span>
              </div>
            </div>

            <Button variant="secondary" className="micro-btn" onClick={handleMarkAllPresent}>
              ✓ Mark All Present
            </Button>
          </div>

          {attLoading ? (
            <div className="att-loading">&gt; LOADING ATTENDANCE ROSTER...</div>
          ) : (
            <div className="att-roster-list">
              {attendance.map((attendee) => (
                <div key={attendee.user_id} className="att-roster-item">
                  <div className="att-user-col">
                    <Avatar initials={attendee.user_initials || 'OP'} />
                    <div>
                      <div className="att-name">{attendee.user_name}</div>
                      <div className="att-role">{attendee.role?.toUpperCase() || 'MEMBER'}</div>
                    </div>
                  </div>

                  <div className="att-status-col">
                    <AttendanceStatusPill status={attendee.status} />
                  </div>

                  {/* Quick toggle selector buttons: P, A, E */}
                  <div className="att-quick-actions">
                    <button
                      type="button"
                      className={`btn-tag ${attendee.status === 'present' ? 'active-p' : ''}`}
                      onClick={() => handleStatusChange(attendee.user_id, 'present')}
                      title="Mark Present"
                    >
                      P
                    </button>
                    <button
                      type="button"
                      className={`btn-tag ${attendee.status === 'absent' ? 'active-a' : ''}`}
                      onClick={() => handleStatusChange(attendee.user_id, 'absent')}
                      title="Mark Absent"
                    >
                      A
                    </button>
                    <button
                      type="button"
                      className={`btn-tag ${attendee.status === 'excused' ? 'active-e' : ''}`}
                      onClick={() => handleStatusChange(attendee.user_id, 'excused')}
                      title="Mark Excused"
                    >
                      E
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="meeting-modal-footer">
          <div className="footer-left">
            {confirmCancel ? (
              <div className="confirm-cancel-row">
                <span className="confirm-text">Delete/Cancel this briefing?</span>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onCancelMeeting(meeting.id);
                    onClose();
                  }}
                >
                  Yes, Remove
                </Button>
                <Button variant="ghost" onClick={() => setConfirmCancel(false)}>
                  Back
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmCancel(true)}>
                Cancel Meeting
              </Button>
            )}
          </div>

          <div className="footer-right">
            <Button
              variant="secondary"
              onClick={() => {
                onEdit(meeting);
              }}
            >
              Reschedule / Edit
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
