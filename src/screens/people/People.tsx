import { useMemo, useState } from 'react';
import { useTasks } from '../../store/taskStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useOpenTask } from '../../hooks/useOpenTask';
import { usePermissionCheck } from '../../hooks/usePermission';
import { openCountFor, upcomingBirthdays } from '../../lib/club';
import { useBoards, useClub } from '../../store/ClubProvider';
import { DOMAIN_LABELS, formatDate, type Domain } from '../../lib/tasks';
import { Avatar } from '../../ui/primitives/Avatar';
import { Chip } from '../../ui/primitives/Chip';
import { Tag } from '../../ui/primitives/Tag';
import { StatePill } from '../../ui/primitives/StatePill';
import { Card, EmptyState, SearchBar, TabPanel, Tabs } from '../../ui/patterns';
import { StickerCalendar } from '../../ui/stickers';
import { SkeletonTaskCard } from '../../ui/primitives/Skeleton';
import './People.css';

/**
 * §9.10 — a three-column grid of member cards on desktop, a 56px list on
 * mobile, and a BIRTHDAYS tab covering the next sixty days.
 */
export function People() {
  const { tasks } = useTasks();
  const { members: roster, loading, error } = useClub();
  const boards = useBoards();
  const isDesktop = useIsDesktop();
  const can = usePermissionCheck();
  const openTask = useOpenTask();

  const [tab, setTab] = useState<'members' | 'birthdays'>('members');
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState<Domain | 'all'>('all');

  /** §9.10 — the club's domains, plus an "all" resting state. */
  const domainFilters = useMemo<Array<Domain | 'all'>>(
    () => ['all', ...boards.map((board) => board.domain)],
    [boards],
  );

  const members = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return roster.filter((member) => {
      if (domain !== 'all' && member.domain !== domain) return false;
      if (!needle) return true;
      return `${member.name} ${member.title}`.toLowerCase().includes(needle);
    });
  }, [roster, query, domain]);

  const birthdays = useMemo(() => upcomingBirthdays(roster, 60), [roster]);

  /** The open-task count is analytics, so it is absent without the key. */
  const showCounts = can('analytics.view');

  return (
    <div className="people">
      <Tabs
        label="People"
        value={tab}
        onChange={setTab}
        items={[
          { id: 'members', label: 'Members', count: roster.length },
          { id: 'birthdays', label: 'Birthdays', count: birthdays.length },
        ]}
        className="people__tabs"
      />

      {tab === 'members' ? (
        <TabPanel id="members" className="people__panel">
          <div className="people__controls">
            <SearchBar
              className="people__search"
              label="Search members"
              value={query}
              onChange={setQuery}
            />

            <div className="people__filters no-scrollbar" role="group" aria-label="Filter by domain">
              {domainFilters.map((option) => (
                <Chip
                  key={option}
                  variant="toggle"
                  tone="ink"
                  selected={domain === option}
                  onClick={() => setDomain(option)}
                >
                  {option === 'all' ? 'All' : DOMAIN_LABELS[option]}
                </Chip>
              ))}
            </div>
          </div>

          {loading ? (
            <SkeletonTaskCard />
          ) : error ? (
            <Card>
              <EmptyState
                sticker={<StickerCalendar size="empty" />}
                title="Could not read the roster"
                line={error}
              />
            </Card>
          ) : members.length === 0 ? (
            <Card>
              <EmptyState
                sticker={<StickerCalendar size="empty" />}
                title="Nobody matches"
                line="try a different domain, or clear the search"
              />
            </Card>
          ) : isDesktop ? (
            <ul className="people__grid" role="list">
              {members.map((member) => (
                <li key={member.id}>
                  <Card as="article" className="people__card">
                    <div className="people__card-head">
                      <Avatar
                        size={44}
                        name={member.name}
                        initials={member.initials}
                        channel={member.domain}
                      />
                      <div className="people__card-id">
                        <h3 className="people__name display-4">{member.name}</h3>
                        <p className="people__title body-sm">{member.title}</p>
                      </div>
                    </div>

                    <div className="people__meta">
                      <Tag channel={member.domain}>{DOMAIN_LABELS[member.domain]}</Tag>
                      <span className="micro people__meta-item">
                        {member.committees.length}{' '}
                        {member.committees.length === 1 ? 'committee' : 'committees'}
                      </span>
                      {showCounts && (
                        <span className="micro people__meta-item tnum">
                          {openCountFor(member, tasks)} open
                        </span>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Card className="people__list-card">
              <ul className="people__list" role="list">
                {members.map((member) => (
                  <li className="people__row" key={member.id}>
                    <Avatar
                      size={32}
                      name={member.name}
                      initials={member.initials}
                      channel={member.domain}
                    />
                    <span className="people__row-body">
                      <span className="body-sm people__row-name">{member.name}</span>
                      <span className="micro people__row-title">{member.title}</span>
                    </span>
                    {showCounts && (
                      <span className="micro tnum people__row-count">
                        {openCountFor(member, tasks)} open
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </TabPanel>
      ) : (
        <TabPanel id="birthdays" className="people__panel">
          {birthdays.length === 0 ? (
            <Card>
              <EmptyState
                sticker={<StickerCalendar size="empty" />}
                title="No birthdays coming"
                line="nothing in the next sixty days"
              />
            </Card>
          ) : (
            <Card className="people__list-card">
              <ul className="people__list" role="list">
                {birthdays.map((entry) => {
                  // The poster task the occasion engine generated, if there is one.
                  const poster = tasks.find(
                    (task) =>
                      task.source?.kind === 'occasion' &&
                      task.title
                        .toLowerCase()
                        .includes(entry.member.name.split(' ')[0].toLowerCase()),
                  );

                  return (
                    <li className="people__row people__row--birthday" key={entry.member.id}>
                      <span className="people__date micro tnum">{formatDate(entry.date)}</span>

                      <Avatar
                        size={32}
                        name={entry.member.name}
                        initials={entry.member.initials}
                        channel={entry.member.domain}
                      />

                      <span className="people__row-body">
                        <span className="body-sm people__row-name">{entry.member.name}</span>
                        <span className="micro people__row-title">
                          {entry.inDays === 0 ? 'today' : `in ${entry.inDays} days`}
                        </span>
                      </span>

                      {/* The generated poster task and its state (§9.10). */}
                      {poster ? (
                        <button
                          type="button"
                          className="people__poster"
                          onClick={() => openTask(poster)}
                        >
                          <span className="micro people__poster-num">{poster.number}</span>
                          <StatePill state={poster.state} />
                        </button>
                      ) : (
                        <span className="micro people__none">No poster yet</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </TabPanel>
      )}
    </div>
  );
}
