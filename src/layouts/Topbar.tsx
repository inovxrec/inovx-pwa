import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import './Topbar.css';

interface TopbarProps {
  /** Title markup — the design highlights one word per screen in --chan color,
   *  e.g. <>My <span className="accent">Day</span></> */
  title: ReactNode;
  userInitials: string;
}

export function Topbar({ title, userInitials }: TopbarProps) {
  return (
    <div className="topbar">
      <div className="tb-title">{title}</div>
      <div className="tb-right">
        <NavLink
          to="/notifications"
          className={({ isActive }) => `tb-notif-link ${isActive ? 'active' : ''}`}
          title="Notification Centre & Directives"
        >
          ⬡
        </NavLink>
        <Avatar initials={userInitials} />
      </div>
    </div>
  );
}
