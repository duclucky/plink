import type { Play } from '../../shared/game';

const VERDICTS = ['Perfect pitch', 'Sharp ears', 'In tune', 'By a whisker'];

export const verdict = (play: Play) =>
  play.solved
    ? (VERDICTS[play.guesses.length - 1] ?? 'Fixed')
    : 'The box stays broken';
