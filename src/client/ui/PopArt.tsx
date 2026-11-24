import { motion, useReducedMotion } from 'motion/react';

/** Original vector artwork: a tiny record with a very big personality. */
export const PopArt = ({ compact = false }: { compact?: boolean }) => {
  const still = useReducedMotion();
  return (
    <svg
      className={`pop-art${compact ? ' is-compact' : ''}`}
      viewBox="0 0 360 230"
      aria-hidden="true"
    >
      <path
        d="M38 195H322"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="3 6"
        opacity=".25"
      />
      <motion.g
        animate={still ? {} : { y: [0, -6, 0], rotate: [-4, 2, -4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '180px 120px' }}
      >
        <circle
          cx="180"
          cy="117"
          r="91"
          fill="#d4f76c"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="180" cy="117" r="68" fill="#252621" />
        <circle cx="180" cy="117" r="56" fill="none" stroke="#4c4d43" />
        <circle cx="180" cy="117" r="46" fill="none" stroke="#4c4d43" />
        <motion.g
          animate={still ? {} : { rotate: 360 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '180px 117px' }}
        >
          <path
            d="M137 77A58 58 0 0 1 210 70M144 85A47 47 0 0 1 205 80"
            fill="none"
            stroke="#77786b"
            strokeWidth="2"
          />
          <path
            d="M218 158A55 55 0 0 1 153 164"
            fill="none"
            stroke="#77786b"
            strokeWidth="2"
          />
        </motion.g>
        <circle cx="180" cy="117" r="29" fill="#ae9de8" />
        <ellipse cx="171" cy="113" rx="3.5" ry="5" fill="#252621" />
        <ellipse cx="190" cy="113" rx="3.5" ry="5" fill="#252621" />
        <path
          d="M173 126Q181 134 189 125"
          fill="none"
          stroke="#252621"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M124 88C122 15 239 15 237 89"
          fill="none"
          stroke="#252621"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <rect
          x="111"
          y="81"
          width="21"
          height="45"
          rx="10"
          fill="#ff633c"
          stroke="#252621"
          strokeWidth="2"
          transform="rotate(-14 120 104)"
        />
        <rect
          x="230"
          y="81"
          width="21"
          height="45"
          rx="10"
          fill="#ff633c"
          stroke="#252621"
          strokeWidth="2"
          transform="rotate(14 240 104)"
        />
      </motion.g>
      <motion.g
        animate={still ? {} : { rotate: [0, 15, 0], y: [0, -8, 0] }}
        transition={{ duration: 3.5, repeat: Infinity }}
        style={{ transformOrigin: '56px 72px' }}
      >
        <path
          d="M52 27L59 47L79 39L70 58L91 65L71 72L79 92L60 83L52 105L45 83L25 91L34 72L12 65L34 58L26 38L45 47Z"
          fill="#ae9de8"
          stroke="currentColor"
          strokeWidth="2"
        />
      </motion.g>
      <motion.g
        animate={still ? {} : { y: [0, 7, 0], rotate: [8, 0, 8] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ transformOrigin: '301px 153px' }}
      >
        <rect
          x="269"
          y="119"
          width="65"
          height="65"
          rx="19"
          fill="#7ed8d0"
          stroke="currentColor"
          strokeWidth="2"
          transform="rotate(12 301 150)"
        />
        <path
          d="M300 159V136L316 133V154M300 142L316 139"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <ellipse cx="294" cy="160" rx="7" ry="5" fill="currentColor" />
        <ellipse cx="310" cy="155" rx="7" ry="5" fill="currentColor" />
      </motion.g>
      <path
        d="M290 40V60M280 50H300M57 155V169M50 162H64"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="316" cy="86" r="4" fill="#ff633c" />
      <circle cx="80" cy="126" r="3" fill="currentColor" />
    </svg>
  );
};
