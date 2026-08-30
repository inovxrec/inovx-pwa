import { NavLink } from 'react-router-dom';
import { getNavItems, type Role } from './navConfig';
import './NavRail.css';

export function NavRail({ role }: { role: Role }) {
  const items = getNavItems(role);
  return (
    <nav className="nav-rail">
      <div className="brand">INOVX84</div>
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="ic">▸</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
