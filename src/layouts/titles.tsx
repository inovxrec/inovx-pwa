import type { ReactNode } from 'react';

export const SCREEN_TITLES: Record<string, ReactNode> = {
  myday: <>My <span className="accent">Day</span></>,
  deck: <>Command <span className="accent">Deck</span></>,
  oversight: <>Oversight <span className="accent">Deck</span></>,
  board: <><span className="accent">Design</span> Board</>,
  taskdetail: <>Task <span className="accent">Detail</span></>,
  calendar: <><span className="accent">Calendar</span></>,
  people: <><span className="accent">People</span></>,
  permissions: <><span className="accent">Permissions</span></>,
};
