import { useState } from 'react';
import { isMuted, setMuted } from '../audio';

export const MuteButton = () => {
  const [muted, setState] = useState(isMuted);
  return (
    <button
      type="button"
      className={`icon-btn${muted ? ' is-off' : ''}`}
      aria-pressed={muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      onClick={() => {
        setMuted(!muted);
        setState(!muted);
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
        {muted ? (
          <path
            d="M15.5 9.5l5 5m0-5l-5 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        ) : (
          <path
            d="M15 9a4.2 4.2 0 010 6m2.6-8.6a8 8 0 010 11.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
    </button>
  );
};
