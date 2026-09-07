import { useState } from 'react';
import { useMeetings } from './hooks/useMeetings';
import { MeetingCard } from './components/MeetingCard';
import { MeetingDetailModal } from './components/MeetingDetailModal';
import { MeetingFormModal } from './components/MeetingFormModal';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { useToast } from '../../components/Toast';
import type { CreateMeetingInput, Meeting, UpdateMeetingInput } from './types';
import './Meetings.css';

type Tab = 'upcoming' | 'past';

export function Meetings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const {
    upcomingMeetings,
    pastMeetings,
    loading,
    error,
    isPendingMigration,
    create,
    update,
    cancel,
    refresh,
  } = useMeetings();

  const handleFormSubmit = async (data: CreateMeetingInput | UpdateMeetingInput) => {
    if (editingMeeting) {
      await update(editingMeeting.id, data as UpdateMeetingInput);
      toast('BRIEFING RESCHEDULED / UPDATED');
      if (selectedMeeting && selectedMeeting.id === editingMeeting.id) {
        setSelectedMeeting((prev) => (prev ? { ...prev, ...data } : null));
      }
    } else {
      await create(data as CreateMeetingInput);
      toast('NEW BRIEFING SCHEDULED & NOTIFIED');
    }
    setFormOpen(false);
    setEditingMeeting(null);
  };

  const handleCancelMeeting = async (id: string) => {
    await cancel(id);
    toast('MEETING SESSION REMOVED');
    if (selectedMeeting?.id === id) {
      setSelectedMeeting(null);
    }
  };

  const handleSaveMinutes = async (id: string, minutes: string) => {
    await update(id, { minutes });
    if (selectedMeeting?.id === id) {
      setSelectedMeeting((prev) => (prev ? { ...prev, minutes } : null));
    }
  };

  const currentList = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const filtered = currentList.filter((m: Meeting) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      m.venue.toLowerCase().includes(q) ||
      m.scope.toLowerCase().includes(q) ||
      (m.scope_id && m.scope_id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="meetings-screen">
      {isPendingMigration && (
        <div className="notif-migration-alert">
          <div>
            <div className="alert-tag">PART B DATABASE NOTICE: MEETINGS &amp; ATTENDANCE</div>
            <div className="alert-message">
              Database tables <code>meetings</code> and <code>attendance</code> are pending in
              Supabase schema cache. Operating with synchronized local storage store so meetings,
              minutes, and attendance tracking can be verified immediately.
            </div>
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="meetings-top-bar">
        <div className="meetings-title-group">
          <div className="eyebrow" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
            OPERATIONAL LOG &amp; ROSTER
          </div>
          <h1 className="section-title" style={{ fontSize: '20px' }}>
            STATION BRIEFINGS &amp; ATTENDANCE
          </h1>
        </div>

        <div className="meetings-header-actions">
          <input
            type="text"
            className="meeting-input"
            style={{ width: '220px', padding: '6px 10px', fontSize: '12px' }}
            placeholder="Search briefings or venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button
            variant="primary"
            onClick={() => {
              setEditingMeeting(null);
              setFormOpen(true);
            }}
          >
            + Schedule Briefing
          </Button>
          <Button variant="ghost" onClick={refresh} title="Refresh meetings">
            ↻
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="meetings-tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Briefings
          <span className={`badge-count ${upcomingMeetings.length > 0 ? 'accent' : ''}`}>
            {upcomingMeetings.length}
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past Archive
          <span className="badge-count">{pastMeetings.length}</span>
        </button>
      </div>

      {/* Content Area */}
      {loading && (
        <Panel className="notif-status-panel">
          <span>&gt; INTERCEPTING SCHEDULED BRIEFINGS AND ROSTER TELEMETRY...</span>
        </Panel>
      )}

      {error && (
        <Panel className="notif-error-panel">
          <div className="error-title">BRIEFING QUERY ERROR</div>
          <div className="error-body">{error}</div>
        </Panel>
      )}

      {!loading && !error && filtered.length === 0 && (
        <Panel className="meetings-empty-panel">
          <div className="empty-indicator">&gt; NO SESSIONS MATCHING CURRENT CRITERIA</div>
          <p className="empty-sub">
            {activeTab === 'upcoming'
              ? 'No upcoming sessions scheduled. Use "+ Schedule Briefing" to create a new session.'
              : 'Archive is empty. Past sessions will appear here.'}
          </p>
        </Panel>
      )}

      <div className="meetings-grid">
        {filtered.map((meeting: Meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onSelect={(m: Meeting) => setSelectedMeeting(m)}
          />
        ))}
      </div>

      {/* Meeting Details and Attendance Modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onEdit={(m) => {
            setSelectedMeeting(null);
            setEditingMeeting(m);
            setFormOpen(true);
          }}
          onCancelMeeting={handleCancelMeeting}
          onSaveMinutes={handleSaveMinutes}
        />
      )}

      {/* Create / Reschedule Form Modal */}
      {formOpen && (
        <MeetingFormModal
          initialMeeting={editingMeeting}
          onClose={() => {
            setFormOpen(false);
            setEditingMeeting(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}
