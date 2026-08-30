import { NavLink } from 'react-router-dom';
import { getBottomBarItems, type Role } from './navConfig';
import './BottomBar.css';

export function BottomBar({ role }: { role: Role }) {
  const items = getBottomBarItems(role);
  return (
    <nav className="bottom-bar">
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.path}
          className={({ isActive }) => `bb-item ${isActive ? 'active' : ''}`}
        >
          <span className="ic">▸</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
