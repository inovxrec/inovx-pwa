import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import './Breadcrumb.css';

export interface Crumb {
  label: string;
  /** Omit for the current page, which is text rather than a link. */
  to?: string;
}

export interface BreadcrumbProps {
  items: Crumb[];
  tone?: 'paper' | 'ink';
  className?: string;
}

/**
 * §7.19 — the `label` token with `/` separators, collapsing to "… / current"
 * on mobile.
 *
 * The collapse drops the parent crumbs from the DOM rather than hiding them,
 * per §8's rule against display:none forks. The ancestors are one back-press
 * away on a phone, which is where that shape comes from.
 */
export function Breadcrumb({ items, tone = 'paper', className }: BreadcrumbProps) {
  const isDesktop = useIsDesktop();
  const shown = isDesktop ? items : items.slice(-1);
  const collapsed = shown.length < items.length;

  return (
    <nav aria-label="Breadcrumb" className={cn('crumbs', `crumbs--on-${tone}`, className)}>
      <ol className="crumbs__list label" role="list">
        {collapsed && (
          <>
            <li className="crumbs__item crumbs__item--elided">
              <span className="sr-only">
                {items.slice(0, -1).map((item) => item.label).join(', ')}
              </span>
              <span aria-hidden="true">…</span>
            </li>
            <li className="crumbs__sep" aria-hidden="true">/</li>
          </>
        )}

        {shown.map((item, index) => {
          const last = index === shown.length - 1;
          return (
            <Fragment key={item.label}>
              <li className={cn('crumbs__item', last && 'crumbs__item--current')}>
                {item.to && !last ? (
                  <Link className="crumbs__link" to={item.to}>{item.label}</Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined}>{item.label}</span>
                )}
              </li>
              {!last && <li className="crumbs__sep" aria-hidden="true">/</li>}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
