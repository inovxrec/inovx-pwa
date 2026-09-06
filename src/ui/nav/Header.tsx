import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { IconChevronLeft, IconSearch } from '../icons';
import { IconButton } from '../primitives/IconButton';
import { Menu, type MenuItem } from '../primitives/Menu';
import './Header.css';

export interface HeaderProps {
  /** Screen title, Anton 15px uppercase, centred (§7.18). */
  title: string;
  /** Shows a back chevron instead of the logo. */
  showBack?: boolean;
  /**
   * §7.18 puts a logo in the header's left slot because on mobile nothing else
   * carries it. With the rail on screen it would be the second wordmark in one
   * viewport, so the shell turns it off there.
   */
  showLogo?: boolean;
  /** Hidden on scroll-down, shown on scroll-up. Mobile only. */
  visible?: boolean;
  onSearch?: () => void;
  overflowItems?: MenuItem[];
}

export function Header({
  title,
  showBack = false,
  showLogo = true,
  visible = true,
  onSearch,
  overflowItems,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={cn('header', !visible && 'header--hidden')}>
      <div className="header__side">
        {showBack ? (
          <IconButton
            label="Back"
            icon={<IconChevronLeft />}
            tone="ink"
            onClick={() => navigate(-1)}
          />
        ) : showLogo ? (
          /* TODO(logo): public/brand/inovx-logo.png, min-width 88px (§2). */
          <span className="header__mark display-4">INOVX</span>
        ) : null}
      </div>

      {/*
        One h1 per screen (§11). The header owns it, so screens must not
        declare a second — their own sections start at h2.
      */}
      <h1 className="header__title">{title}</h1>

      <div className="header__side header__side--end">
        {onSearch && (
          <IconButton label="Search" icon={<IconSearch />} tone="ink" onClick={onSearch} />
        )}
        {overflowItems && overflowItems.length > 0 && (
          <Menu label="More actions" items={overflowItems} tone="ink" />
        )}
      </div>
    </header>
  );
}
