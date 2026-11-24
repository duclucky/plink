import { useCallback, useEffect, useMemo, useState } from 'react';
import { App } from '../App';
import { createDemoBackend, resetDemo } from '../demoBackend';
import { Splash } from '../ui/Splash';
import type { Host } from '../ui/host';

const Session = ({ onReset }: { onReset: () => void }) => {
  const [backend] = useState(createDemoBackend);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const show = useCallback((text: string) => setToast(text), []);
  const host = useMemo<Host>(() => ({ toast: show }), [show]);

  useEffect(() => {
    if (toast === null) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div className="demo">
      <div className="demo-bar">
        <span>
          <strong>Plink demo.</strong>{' '}
          {open
            ? 'The game, as it opens from the post.'
            : 'The post, as it sits in the feed.'}
        </span>
        {open ? (
          <button
            type="button"
            className="demo-link"
            onClick={() => setOpen(false)}
          >
            Close game
          </button>
        ) : (
          <button type="button" className="demo-link" onClick={onReset}>
            Start over
          </button>
        )}
      </div>
      <div className={`demo-frame ${open ? 'is-game' : 'is-post'}`}>
        {open ? (
          <App backend={backend} host={host} />
        ) : (
          <Splash backend={backend} onOpen={() => setOpen(true)} />
        )}
        {toast !== null && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </div>
      <p className="fineprint">
        Runs in your browser with pretend players. On Reddit the same screens
        talk to the real server.
      </p>
    </div>
  );
};

export const Demo = () => {
  const [round, setRound] = useState(0);
  return (
    <Session
      key={round}
      onReset={() => {
        resetDemo();
        setRound((n) => n + 1);
      }}
    />
  );
};
