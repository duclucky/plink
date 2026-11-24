type IconProps = { size?: number };

const svg = (size: number) => ({
  viewBox: '0 0 24 24',
  width: size,
  height: size,
  'aria-hidden': true,
  className: 'icon',
});

export const PlayIcon = ({ size = 16 }: IconProps) => (
  <svg {...svg(size)}>
    <path
      d="M7 4.5v15a1 1 0 001.5.86l12.5-7.5a1 1 0 000-1.72L8.5 3.64A1 1 0 007 4.5z"
      fill="currentColor"
    />
  </svg>
);

export const StopIcon = ({ size = 16 }: IconProps) => (
  <svg {...svg(size)}>
    <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" />
  </svg>
);

export const HeartIcon = ({ size = 14 }: IconProps) => (
  <svg {...svg(size)}>
    <path
      d="M12 20.5s-8-4.9-8-10.6A4.4 4.4 0 0112 7.3a4.4 4.4 0 018 2.6c0 5.7-8 10.6-8 10.6z"
      fill="currentColor"
    />
  </svg>
);

export const CheckIcon = ({ size = 14 }: IconProps) => (
  <svg {...svg(size)}>
    <path
      d="M4.5 12.5l5 5 10-11"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);
