import { Outlet, useLocation } from 'react-router-dom';
import { NavRail } from './NavRail';
import { BottomBar } from './BottomBar';
import { Topbar } from './Topbar';
import { FrameDeco } from './FrameDeco';
import { SCREEN_TITLES } from './titles';
import { useIsMobile } from '../hooks/useMediaQuery';
import type { Role } from './navConfig';
import './AppShell.css';

interface AppShellProps {
  role: Role;
  userInitials: string;
}

/**
 * The shared shell for every screen except Login and the boot sequence.
 * Feature screens (My Day, Board, Calendar, etc.) render inside <Outlet/>
 * and only need to worry about their own content — nav, topbar, and the
 * desktop/mobile switch are all handled here. The topbar title is derived
 * from the current path's first segment against SCREEN_TITLES — add a new
 * screen there, not by passing a title prop down through routes.
 */
export function AppShell({ role, userInitials }: AppShellProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const screenKey = location.pathname.split('/')[1] || 'myday';
  const title = SCREEN_TITLES[screenKey] ?? screenKey;

  return (
    <div className="app-frame">
      <FrameDeco />
      <div className={`shell ${isMobile ? 'mobile-mode' : ''}`}>
        {!isMobile && <NavRail role={role} />}
        <div className="main-col">
          <Topbar title={title} userInitials={userInitials} />
          <div className="screen">
            <Outlet />
          </div>
        </div>
        {isMobile && <BottomBar role={role} />}
      </div>
    </div>
  );
}
