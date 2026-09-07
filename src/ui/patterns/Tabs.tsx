import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '../../lib/cn';
import './Tabs.css';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  /** Rendered as a count beside the label. */
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  /** Names the tablist for anyone arriving by keyboard. */
  label: string;
  className?: string;
}

/**
 * §7.13 — Anton uppercase, 40px tall, a 2px flame underline on the active tab.
 * Overflow scrolls horizontally with fade masks at the edges.
 *
 * Follows the tabs keyboard pattern: arrows move and select, Home and End jump
 * to the ends.
 */
export function Tabs<T extends string = string>({
  items, value, onChange, label, className,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  /**
   * One indicator that travels between tabs, rather than each tab growing its
   * own underline. The rule moving is what makes the change read as a single
   * object rather than as two separate fades.
   */
  const [rule, setRule] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    function place() {
      const list = listRef.current;
      if (!list) return;

      const index = items.findIndex((item) => item.id === value);
      const tab = list.querySelectorAll<HTMLElement>('.tabs__tab')[index];
      if (!tab) return;

      // Offsets, not client rects: the strip scrolls, and a rect would move the
      // rule every time it did.
      setRule({ left: tab.offsetLeft, width: tab.offsetWidth });
    }

    place();

    // Anton loads late, and the tabs change width when it does.
    const observer = new ResizeObserver(place);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [items, value]);


  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.id === value);
    let next = index;

    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else return;

    event.preventDefault();
    onChange(items[next].id);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('.tabs__tab')
      [next]?.focus();
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn('tabs no-scrollbar', className)}
      onKeyDown={onKeyDown}
    >
      {rule && (
        <span
          className="tabs__rule"
          style={{ transform: `translateX(${rule.left}px)`, width: rule.width }}
          aria-hidden="true"
        />
      )}

      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={selected}
            aria-controls={`panel-${item.id}`}
            tabIndex={selected ? 0 : -1}
            className={cn('tabs__tab', selected && 'tabs__tab--on')}
            onClick={() => onChange(item.id)}
          >
            {item.label}
            {item.count !== undefined && (
              <span className="tabs__count tnum">{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps<T extends string = string> {
  id: T;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel<T extends string = string>({ id, children, className }: TabPanelProps<T>) {
  return (
    <div
      role="tabpanel"
      id={`panel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
