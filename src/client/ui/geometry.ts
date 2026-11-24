import { ROWS } from '../../shared/game';

export const WIDTH = 360;
export const GUTTER = 34;
export const ROW_H = 44;
export const TOP = 10;
export const HEIGHT = TOP * 2 + ROW_H * ROWS;

/** Where a pin sits, as fractions of the board's width and height. */
export const pinSpot = (columns: number, column: number, row: number) => ({
  x: (GUTTER + ((WIDTH - GUTTER - 8) / columns) * (column + 0.5)) / WIDTH,
  y: (TOP + ROW_H * (ROWS - 1 - row + 0.5)) / HEIGHT,
});
