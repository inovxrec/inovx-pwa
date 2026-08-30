import { useEffect, useRef, useState } from 'react';
import './BootSequence.css';

interface BootSequenceProps {
  operatorName: string;
  channel: string;
  personalLine: string; // e.g. "3 TASKS DUE · 1 OVERDUE"
  onDone: () => void;
}

const POST_LINES = [
  'POST ....................... OK',
  'AUTH MODULE ................ OK',
  'DIRECTORY SYNC ............. OK',
];

/**
 * Runs once per session (call it only when there's no existing session —
 * don't replay this on every route change). Total runtime ~1.6s, tap/keypress
 * skips immediately. All animation is skipped outright under
 * prefers-reduced-motion, per section 15.7's "nothing loops" rule.
 */
export function BootSequence({ operatorName, channel, personalLine, onDone }: BootSequenceProps) {
  const [stage, setStage] = useState<'line' | 'panel' | 'wordmark' | 'done'>('line');
  const doneRef = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      finish();
      return;
    }
    const t1 = setTimeout(() => setStage('panel'), 190);
    const t2 = setTimeout(() => setStage('wordmark'), 520);
    const t3 = setTimeout(finish, 1650);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    setStage('done');
    onDone();
  }

  useEffect(() => {
    window.addEventListener('keydown', finish, { once: true });
    return () => window.removeEventListener('keydown', finish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stage === 'done') return null;

  return (
    <div className={`boot ${stage === 'wordmark' ? 'hide-lines' : ''}`} role="status" aria-label="Loading" onClick={finish}>
      {stage === 'line' && <div className="boot-line-open on" />}

      {stage === 'panel' && (
        <div className="boot-panel show">
          <div className="boot-out-line on">&gt; INOVX84 SYSTEM — TERMINAL 001</div>
          {POST_LINES.map((line, i) => (
            <div key={line} className="boot-out-line on" style={{ transitionDelay: `${i * 55}ms` }}>&gt; {line}</div>
          ))}
          <div className="boot-out-line on">&gt; CHANNEL .................... {channel.toUpperCase()}</div>
          <div className="boot-out-line on">&gt; OPERATOR ................... {operatorName.toUpperCase()}</div>
        </div>
      )}

      {stage === 'wordmark' && (
        <>
          <div className="boot-wordmark glitch">INOVX84</div>
          <div className="boot-personal on">&gt; {personalLine}</div>
          <div className="boot-bar"><div className="boot-bar-fill full" /></div>
          <div className="boot-skip on">TAP OR PRESS ANY KEY TO SKIP</div>
        </>
      )}
    </div>
  );
}
