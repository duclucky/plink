declare module '*.css';

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module 'ola' {
  /** A number that glides to each new value over `time` milliseconds. */
  const Ola: (value: number, time?: number) => { value: number };
  export default Ola;
}
