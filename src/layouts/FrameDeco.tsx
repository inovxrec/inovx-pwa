import './FrameDeco.css';

/**
 * Purely decorative atmosphere layer: corner crosshairs + vertical side-rail
 * ticks. Sits behind interactive content (z-index handled in CSS) and is
 * aria-hidden. The oversized watermark + glow are pseudo-elements on
 * .app-frame itself (see FrameDeco.css) since they need to clip to the frame.
 */
export function FrameDeco({ activeTick = 3 }: { activeTick?: number }) {
  return (
    <div className="frame-deco" aria-hidden="true">
      <span className="xhair tl" />
      <span className="xhair tr" />
      <span className="xhair bl" />
      <span className="xhair br" />
      <div className="side-rail">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n === activeTick ? 'active' : ''}>
            {String(n).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  );
}
