import {
  createContext, useCallback, useContext, useMemo, useState, type ReactNode,
} from 'react';
import { PEOPLE } from '../lib/mockTasks';
import type { Domain, Person } from '../lib/tasks';

/**
 * Committees are the club's cross-domain unit (§0): a group drawn from more
 * than one domain, with its own board. They are the reason a Design member
 * sees an Events task on their board at all.
 */
export interface Committee {
  id: string;
  name: string;
  members: Person[];
  /** Derived from the members — a committee spans whatever they span. */
  domains: Domain[];
  createdAt: string;
}

export function domainsOf(members: Person[]): Domain[] {
  return [...new Set(members.map((person) => person.domain))];
}

/** TEMP: seeded until GET /committees exists. */
const SEED: Committee[] = [
  {
    id: 'techfest',
    name: 'Techfest',
    members: [PEOPLE.arjun, PEOPLE.karan, PEOPLE.ananya, PEOPLE.nithya, PEOPLE.dev],
    domains: domainsOf([PEOPLE.arjun, PEOPLE.karan, PEOPLE.ananya, PEOPLE.nithya, PEOPLE.dev]),
    createdAt: '2026-08-01',
  },
  {
    id: 'alumni-meet',
    name: 'Alumni meet',
    members: [PEOPLE.sana, PEOPLE.riya, PEOPLE.dev],
    domains: domainsOf([PEOPLE.sana, PEOPLE.riya, PEOPLE.dev]),
    createdAt: '2026-08-18',
  },
];

export interface CommitteeContextValue {
  committees: Committee[];
  byId: (id: string) => Committee | undefined;
  create: (name: string, members: Person[]) => Committee;
  rename: (id: string, name: string) => void;
  setMembers: (id: string, members: Person[]) => void;
  remove: (id: string) => void;
}

const CommitteeContext = createContext<CommitteeContextValue | null>(null);

/** A URL-safe id from the name, kept unique against what already exists. */
function slugify(name: string, taken: Set<string>): string {
  const base =
    name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'committee';

  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function CommitteeProvider({ children }: { children: ReactNode }) {
  const [committees, setCommittees] = useState<Committee[]>(SEED);

  const byId = useCallback(
    (id: string) => committees.find((committee) => committee.id === id),
    [committees],
  );

  const create = useCallback((name: string, members: Person[]) => {
    const committee: Committee = {
      id: slugify(name, new Set(committees.map((c) => c.id))),
      name: name.trim(),
      members,
      domains: domainsOf(members),
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setCommittees((current) => [...current, committee]);
    return committee;
  }, [committees]);

  const rename = useCallback((id: string, name: string) => {
    setCommittees((current) =>
      current.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
    );
  }, []);

  const setMembers = useCallback((id: string, members: Person[]) => {
    setCommittees((current) =>
      current.map((c) =>
        c.id === id ? { ...c, members, domains: domainsOf(members) } : c,
      ),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setCommittees((current) => current.filter((c) => c.id !== id));
  }, []);

  const value = useMemo(
    () => ({ committees, byId, create, rename, setMembers, remove }),
    [committees, byId, create, rename, setMembers, remove],
  );

  return <CommitteeContext.Provider value={value}>{children}</CommitteeContext.Provider>;
}

export function useCommittees(): CommitteeContextValue {
  const ctx = useContext(CommitteeContext);
  if (!ctx) throw new Error('useCommittees must be used within a CommitteeProvider');
  return ctx;
}
