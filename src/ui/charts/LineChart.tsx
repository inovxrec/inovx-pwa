import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';
import { useIsDesktop } from '../../hooks/useBreakpoint';
import './charts.css';

export interface LinePoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  points: LinePoint[];
  /** Names the series. One series needs no legend — the title names it (§9.12). */
  title: string;
  /** What one unit is, for the readout: "tasks completed". */
  unit: string;
  className?: string;
}

const PAD = { top: 12, right: 46, bottom: 26, left: 32 };

/** §9.6 and §9.12 both fix these. */
const HEIGHT = { mobile: 180, desktop: 280 };

/**
 * §9.12's activity chart — a single series over twelve weeks.
 *
 * One series on purpose. Two would need two hues to tell apart, and the domain
 * channel tokens this system is limited to sit too close in lightness to carry
 * identity by colour alone. A single line needs no legend and no palette: the
 * title names it and the endpoint is labelled with where it landed.
 *
 * The SVG is drawn at its real pixel size rather than scaled from a viewBox,
 * because a viewBox that stretches to the container's width would also stretch
 * the height — a 280px chart becomes 480px on a wide card — and distort the
 * 1.5px stroke §9.12 asks for.
 */
export function LineChart({ points, title, unit, className }: LineChartProps) {
  const isDesktop = useIsDesktop();
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  /** Desktop hovers; mobile taps to pin (§9.12). */
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const height = isDesktop ? HEIGHT.desktop : HEIGHT.mobile;
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = height - PAD.top - PAD.bottom;

  const max = Math.max(...points.map((p) => p.value));
  // A rounded ceiling, so the gridline labels are whole numbers a reader trusts.
  const ceiling = Math.max(1, Math.ceil(max / 5) * 5);

  const x = (index: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (index / (points.length - 1)) * plotW);
  const y = (value: number) => PAD.top + plotH - (value / ceiling) * plotH;

  const ticks = [0, ceiling / 2, ceiling];
  const last = points[points.length - 1];
  const shown = active === null ? null : points[active];

  return (
    <figure className={cn('chart', className)} ref={boxRef}>
      <figcaption className="sr-only">{title}</figcaption>

      {/* Nothing is drawn until the box has been measured. */}
      {width > 0 && (
        <svg
          className="chart__svg"
          width={width}
          height={height}
          role="img"
          aria-label={`${title}. ${points.map((p) => `${p.label}: ${p.value}`).join(', ')}.`}
          onMouseLeave={() => setActive(null)}
        >
          {/* Solid hairlines, one shade off the surface — never dashed. */}
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className="chart__grid"
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="chart__axis" x={PAD.left - 8} y={y(tick) + 4} textAnchor="end">
                {tick}
              </text>
            </g>
          ))}

          {/* First, middle and last only — twelve x labels would collide. */}
          {[0, Math.floor(points.length / 2), points.length - 1].map((index) => (
            <text
              key={index}
              className="chart__axis"
              x={x(index)}
              y={height - 8}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            >
              {points[index].label}
            </text>
          ))}

          <path
            className="chart__line"
            d={points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.value)}`).join(' ')}
          />

          {/* Direct-labelled, so the last value never needs a hover to be read. */}
          <circle className="chart__end" cx={x(points.length - 1)} cy={y(last.value)} r="4" />
          <text
            className="chart__end-label"
            x={x(points.length - 1) + 8}
            y={y(last.value) + 4}
          >
            {last.value}
          </text>

          {shown && (
            <line
              className="chart__crosshair"
              x1={x(active!)}
              x2={x(active!)}
              y1={PAD.top}
              y2={PAD.top + plotH}
            />
          )}

          {/* Hit areas wider than the marks they stand for. */}
          {points.map((point, index) => (
            <rect
              key={point.label}
              className="chart__hit"
              x={x(index) - plotW / points.length / 2}
              y={PAD.top}
              width={plotW / points.length}
              height={plotH}
              onMouseEnter={isDesktop ? () => setActive(index) : undefined}
              onClick={!isDesktop ? () => setActive(active === index ? null : index) : undefined}
            />
          ))}
        </svg>
      )}

      {/* Below the plot rather than floating over it, so it never clips. */}
      <p className={cn('chart__readout body-sm', !shown && 'chart__readout--idle')}>
        {shown
          ? `${shown.label} — ${shown.value} ${unit}`
          : isDesktop
            ? 'Hover a week for its figure'
            : 'Tap a week for its figure'}
      </p>
    </figure>
  );
}
