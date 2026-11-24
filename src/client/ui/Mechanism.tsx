import { useEffect, useId, useRef } from 'react';
import { animate, stagger } from 'animejs';

export const Gear = ({
  x,
  y,
  r,
  reverse = false,
}: {
  x: number;
  y: number;
  r: number;
  reverse?: boolean;
}) => (
  <g transform={`translate(${x} ${y})`}>
    <g className={`gear${reverse ? ' gear-reverse' : ''}`}>
      {Array.from({ length: 16 }, (_, i) => (
        <rect
          key={i}
          x={-3}
          y={-r - 3}
          width={6}
          height={9}
          rx={1}
          transform={`rotate(${i * 22.5})`}
        />
      ))}
      <circle r={r} />
      <circle className="gear-cutout" r={r * 0.68} />
      {[0, 120, 240].map((angle) => (
        <path
          key={angle}
          d={`M-3 -${r - 3} H3 V${r - 3} H-3Z`}
          transform={`rotate(${angle})`}
        />
      ))}
      <circle className="gear-hub" r={r * 0.23} />
      <path className="screw-slot" d="M-3 0H3" />
    </g>
  </g>
);

export const MakerMark = () => (
  <svg
    viewBox="0 0 32 32"
    width="29"
    height="29"
    fill="none"
    aria-hidden="true"
  >
    <rect x="3" y="3" width="26" height="26" rx="7" stroke="currentColor" />
    <path
      d="M10 22V10h8a4 4 0 010 8h-8m6-8v12"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="22" cy="22" r="1.5" fill="currentColor" />
  </svg>
);

/** Self-contained vector artwork; only the actual moving gears are animated. */
export const Mechanism = ({
  hero = false,
  running = false,
}: {
  hero?: boolean;
  running?: boolean;
}) => {
  const root = useRef<SVGSVGElement>(null);
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    if (
      !root.current ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      (!hero && !running)
    )
      return;
    const forward = animate(
      root.current.querySelectorAll('.gear:not(.gear-reverse)'),
      {
        rotate: '+=360',
        duration: hero ? 24000 : 4400,
        ease: 'linear',
        loop: true,
      }
    );
    const reverse = animate(root.current.querySelectorAll('.gear-reverse'), {
      rotate: '-=360',
      duration: hero ? 18000 : 3300,
      ease: 'linear',
      loop: true,
    });
    const pins = hero
      ? animate(root.current.querySelectorAll('.cylinder-pin'), {
          opacity: [0.35, 1, 0.35],
          delay: stagger(180),
          duration: 2200,
          loop: true,
        })
      : null;
    return () => {
      forward.revert();
      reverse.revert();
      pins?.revert();
    };
  }, [hero, running]);
  return (
    <svg
      ref={root}
      className={`mechanism-art${hero ? ' is-hero' : ''}${running ? ' is-running' : ''}`}
      viewBox={hero ? '0 0 360 285' : '32 112 300 103'}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-wood`} x2=".2" y2="1">
          <stop stopColor="#99633d" />
          <stop offset=".2" stopColor="#714629" />
          <stop offset=".55" stopColor="#885633" />
          <stop offset="1" stopColor="#462c1e" />
        </linearGradient>
        <linearGradient id={`${id}-brass`} x2="0" y2="1">
          <stop stopColor="#8e6834" />
          <stop offset=".28" stopColor="#f4dda0" />
          <stop offset=".52" stopColor="#c19b50" />
          <stop offset=".77" stopColor="#8c642d" />
          <stop offset="1" stopColor="#cba65f" />
        </linearGradient>
        <linearGradient id={`${id}-steel`} x2="0" y2="1">
          <stop stopColor="#c4c4af" />
          <stop offset=".4" stopColor="#eee9cb" />
          <stop offset="1" stopColor="#7d806d" />
        </linearGradient>
        <pattern
          id={`${id}-grain`}
          width="70"
          height="12"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M0 3Q18 -1 40 4T80 3M-5 9Q22 5 50 10T85 8"
            stroke="#27160b"
            strokeOpacity=".2"
            fill="none"
          />
          <path
            d="M0 5Q30 2 65 6"
            stroke="#ecc08a"
            strokeOpacity=".12"
            fill="none"
          />
        </pattern>
        <filter
          id={`${id}-shadow`}
          x="-25%"
          y="-25%"
          width="150%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="9"
            floodColor="#382715"
            floodOpacity=".25"
          />
        </filter>
      </defs>
      {hero && (
        <>
          <ellipse
            cx="178"
            cy="262"
            rx="144"
            ry="13"
            fill="#6f5b3a"
            opacity=".12"
          />
          <g className="box-lid" filter={`url(#${id}-shadow)`}>
            <path
              d="M33 38Q32 26 46 25L294 20Q309 20 311 34L324 119 35 127Z"
              fill={`url(#${id}-wood)`}
              stroke="#4a2e1b"
              strokeWidth="2"
            />
            <path
              d="M33 38Q32 26 46 25L294 20Q309 20 311 34L324 119 35 127Z"
              fill={`url(#${id}-grain)`}
            />
            <path
              d="M49 41L294 36 306 103 50 110Z"
              fill="#35483b"
              stroke="#c29a55"
              strokeWidth="1.5"
            />
            <path
              d="M56 47L288 42 298 97 57 103Z"
              fill="none"
              stroke="#ac965e"
              strokeOpacity=".4"
            />
            <text x="176" y="76" textAnchor="middle" className="lid-lettering">
              Plink
            </text>
            <text x="178" y="91" textAnchor="middle" className="lid-subtitle">
              A LITTLE DAILY WONDER
            </text>
            <path
              d="M72 72h26m158-3h26M84 68v8m184-11v8"
              stroke="#b49b63"
              strokeWidth=".7"
            />
          </g>
          <path
            d="M24 150L40 120 319 114 334 146 329 245Q328 252 315 253L43 260Q29 260 28 246Z"
            fill={`url(#${id}-wood)`}
            stroke="#4c301e"
            strokeWidth="2"
            filter={`url(#${id}-shadow)`}
          />
          <path
            d="M24 150L40 120 319 114 334 146 329 245Q328 252 315 253L43 260Q29 260 28 246Z"
            fill={`url(#${id}-grain)`}
          />
          <path
            d="M24 150L334 146 329 216 28 223Z"
            fill="#9f7148"
            opacity=".22"
          />
          <path
            d="M35 157L323 153 318 210 40 216Z"
            fill="#26382e"
            stroke="#37271b"
            strokeWidth="4"
          />
          <path
            d="M33 227L325 221M37 237L322 231M41 247L318 240"
            stroke="#342113"
            opacity=".4"
          />
          <path
            d="M70 119l-1-9 27-1 2 10m162-3-1-9 27-1 2 10"
            fill={`url(#${id}-brass)`}
            stroke="#77582e"
          />
          <rect
            x="168"
            y="232"
            width="28"
            height="20"
            rx="4"
            fill={`url(#${id}-brass)`}
            stroke="#6b4a24"
          />
          <circle cx="182" cy="240" r="3" fill="#5b4224" />
          <path d="M180 241l-1 5h6l-1-5" fill="#5b4224" />
          <path
            d="M325 182h15v-12h9v29h-9v-10h-15"
            fill={`url(#${id}-brass)`}
            stroke="#77582e"
          />
          <rect
            x="341"
            y="160"
            width="12"
            height="18"
            rx="6"
            fill="#493b2b"
            stroke="#b99956"
          />
          <path d="M45 257v8h20v-8m227-5v8h20v-8" fill="#39281c" />
        </>
      )}
      <g className="movement">
        <rect
          x="51"
          y="124"
          width="258"
          height="80"
          rx="6"
          fill="#a38b54"
          stroke="#665832"
        />
        <rect x="56" y="128" width="248" height="72" rx="3" fill="#b7a16a" />
        <path d="M58 134H301M58 194H301" stroke="#e2c887" opacity=".6" />
        <rect
          x="62"
          y="137"
          width="192"
          height="39"
          rx="9"
          fill={`url(#${id}-brass)`}
          stroke="#836332"
        />
        <ellipse
          cx="65"
          cy="156.5"
          rx="8"
          ry="19.5"
          fill={`url(#${id}-brass)`}
          stroke="#8e6935"
        />
        <path
          d="M66 137v39M247 140v32M72 140H241"
          stroke="#f0dca5"
          opacity=".65"
        />
        {Array.from({ length: 22 }, (_, i) => (
          <line
            key={i}
            x1={78 + i * 7.4}
            x2={78 + i * 7.4}
            y1="138"
            y2="175"
            stroke="#89652c"
            opacity=".32"
            strokeWidth=".6"
          />
        ))}
        {Array.from({ length: 18 }, (_, i) => (
          <g className="cylinder-pin" key={i}>
            <circle
              cx={80 + i * 9}
              cy={145 + ((i * 7) % 22)}
              r="1.7"
              fill="#5e4827"
            />
            <circle
              cx={80 + i * 9}
              cy={144 + ((i * 7) % 22)}
              r="1.3"
              fill="#f8e7b4"
            />
          </g>
        ))}
        <path
          d="M62 177H248V195H62Z"
          fill={`url(#${id}-steel)`}
          stroke="#676e5f"
        />
        {Array.from({ length: 27 }, (_, i) => (
          <path
            key={i}
            d={`M${67 + i * 6.6} 178v${9 + (i % 5)}`}
            stroke="#4a564b"
            strokeWidth="1.5"
          />
        ))}
        <path d="M62 192h186" stroke="#f2ecd4" />
        <Gear x={277} y={158} r={20} />
        <Gear x={260} y={187} r={11} reverse />
        <path
          d="M288 180c20 0 17 17 3 16s-5-10 2-8"
          fill="none"
          stroke="#6b603b"
          strokeWidth="2"
        />
        {[
          [58, 131],
          [300, 131],
          [58, 197],
          [300, 197],
        ].map(([x = 0, y = 0]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="3" fill="#dbc289" stroke="#8c7543" />
            <path d={`M${x - 2} ${y}h4`} stroke="#645434" />
          </g>
        ))}
      </g>
    </svg>
  );
};
