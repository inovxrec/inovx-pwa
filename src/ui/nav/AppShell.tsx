import { useState } from 'react';
import { Outlet, useLocation, useMatches } from 'react-router-dom';
import { useAuth } from '../../store/authStore';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { usePermissionCheck } from '../../hooks/usePermission';
import { splitForBottomBar, visibleNavItems } from '../../lib/navConfig';
import { NavRail } from './NavRail';
import { BottomBar } from './BottomBar';
import { Header } from './Header';
import { MoreSheet } from './MoreSheet';
import { OfflineBanner } from './OfflineBanner';
import { PageTransition } from './PageTransition';
import { TaskDrawer } from '../../screens/task/TaskDetail';
import './AppShell.css';

/** Route handles carry their own title so the header doesn't map paths itself. */
export interface RouteHandle {
  title?: string;
  /** Full-screen routes (task detail on mobile) show a back chevron. */
  back?: boolean;
}

/**
 * The authenticated frame: nav chrome, header, offline banner and the routed
 * screen.
 *
 * §8 fork #1 lives here. Below 1024px only the bottom bar is rendered and above
 * it only the rail — never both with one hidden, since §8 forbids using
 * display:none to hide desktop markup from phones.
 */
export function AppShell() {
  const { session } = useAuth();
  const can = usePermissionCheck();
  const isDesktop = useIsDesktop();
  const online = useOnlineStatus();
  const headerVisible = useHideOnScroll();
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const matches = useMatches();

  const handle = (matches[matches.length - 1]?.handle ?? {}) as RouteHandle;

  // TEMP: the alert count is mock until the notifications endpoint exists.
  const counts = { notifications: 3 };

  const items = session ? visibleNavItems(session.role, can) : [];
  const { tabs, more } = splitForBottomBar(items);
  const moreActive = more.some((item) => pathname.startsWith(item.path));

  // A route change while the sheet is open would leave it covering the new
  // screen — including on browser back, which MoreSheet's own close can't
  // catch. Adjusting during render is the cheaper half of the trade against an
  // effect that would paint the stale sheet for a frame first.
  const [sheetPath, setSheetPath] = useState(pathname);
  if (sheetPath !== pathname) {
    setSheetPath(pathname);
    setMoreOpen(false);
  }

  return (
    <div className={isDesktop ? 'shell shell--rail' : 'shell'}>
      {isDesktop && <NavRail items={items} counts={counts} />}

      <div className="shell__frame">
        <Header
          title={handle.title ?? 'INOVX Ops'}
          showBack={handle.back}
          showLogo={!isDesktop}
          visible={headerVisible}
          onSearch={() => {}}
        />

        {!online && <OfflineBanner lastSyncedAt="14:02" />}

        <main className="shell__main" id="main">
          <PageTransition routeKey={pathname}>
            <Outlet />
          </PageTransition>
        </main>

        {/*
          §9.8's desktop drawer lives at the shell level, driven by a ?task=
          search param, so the screen behind it stays mounted and interactive.
          It renders nothing when the param is absent, and nothing on mobile,
          where the task is a route of its own.
        */}
        {isDesktop && <TaskDrawer />}
      </div>

      {!isDesktop && (
        <>
          <BottomBar
            tabs={tabs}
            counts={counts}
            onMore={() => setMoreOpen(true)}
            moreOpen={moreOpen}
            moreActive={moreActive}
          />
          <MoreSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            items={more}
            counts={counts}
          />
        </>
      )}
    </div>
  );
}
