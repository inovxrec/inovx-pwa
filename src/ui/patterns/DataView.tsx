import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import './DataView.css';

export interface Column<T> {
  id: string;
  header: string;
  /** Right-aligned and tabular. For anything a reader compares down a column. */
  numeric?: boolean;
  /**
   * On mobile the first two columns are shown prominently and the rest as
   * `label: value` rows (§7.12).
   */
  render: (row: T) => ReactNode;
}

export interface DataViewProps<T> {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  /** Names the table for screen readers. */
  label: string;
  /** Trailing-edge actions, revealed on hover on desktop. */
  actions?: (row: T) => ReactNode;
  className?: string;
}

/**
 * §7.12 — responsive fork #5 (§8). A real table with a sticky header on
 * desktop; a stack of compact cards on mobile, never a horizontally scrolling
 * table.
 *
 * Both come out of one component so a screen author never writes the fork, and
 * neither half can be forgotten when a column is added.
 */
export function DataView<T>({
  rows, columns, rowKey, label, actions, className,
}: DataViewProps<T>) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className={cn('dataview', className)}>
        <table className="dataview__table">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn('dataview__th label', column.numeric && 'dataview__cell--num')}
                >
                  {column.header}
                </th>
              ))}
              {actions && <th scope="col" className="dataview__th"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="dataview__tr" key={rowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn('dataview__td', column.numeric && 'dataview__cell--num')}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {actions && <td className="dataview__td dataview__actions">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // The two most important fields lead; the rest become label/value rows.
  const [lead, second, ...rest] = columns;

  return (
    <ul className={cn('dataview__cards', className)} role="list" aria-label={label}>
      {rows.map((row) => (
        <li className="dataview__card" key={rowKey(row)}>
          <div className="dataview__card-head">
            <span className="dataview__card-lead">{lead.render(row)}</span>
            {second && <span className="dataview__card-second tnum">{second.render(row)}</span>}
          </div>

          {rest.length > 0 && (
            <dl className="dataview__card-rest">
              {rest.map((column) => (
                <div className="dataview__card-row" key={column.id}>
                  <dt className="label">{column.header}</dt>
                  <dd className={column.numeric ? 'tnum body-sm' : 'body-sm'}>
                    {column.render(row)}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {actions && <div className="dataview__card-actions">{actions(row)}</div>}
        </li>
      ))}
    </ul>
  );
}
