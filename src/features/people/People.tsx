import { Avatar } from '../../components/Avatar';
import './People.css';

interface Person {
  initials: string;
  name: string;
  domain: string;
  roleLabel: string; // "Domain Lead" | "Member" | etc.
}

// TEMP: swap for a real fetch('/api/people') once the backend endpoint exists.
// Keep the Person shape the same so this file barely has to change.
const PEOPLE: Person[] = [
  { initials: 'AR', name: 'Ananya Rao', domain: 'Design', roleLabel: 'Domain Lead' },
  { initials: 'KM', name: 'Karan M.', domain: 'Events', roleLabel: 'Member' },
  { initials: 'SV', name: 'Sanjeev V.', domain: 'Technical', roleLabel: 'Member' },
];

export function People() {
  return (
    <div>
      <h1 className="st">People</h1>
      <div className="people-list">
        {PEOPLE.map((p) => (
          <div className="person-row" key={p.initials}>
            <Avatar initials={p.initials} size="lg" />
            <div>
              <div className="person-name">{p.name}</div>
              <div className="person-sub">{p.domain} · {p.roleLabel}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
