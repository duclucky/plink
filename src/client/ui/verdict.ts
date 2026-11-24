import type { Play } from '../../shared/game';

const VERDICTS = [
  'Perfect pitch',
  'Sharp ears',
  'In tune',
  'Getting warmer',
  'Fixed by patience',
];

export const verdict = (play: Play) =>
  play.solved ? (VERDICTS[play.guesses.length - 1] ?? 'Fixed') : 'So close';
