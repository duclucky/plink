/** What a screen may ask of the page it runs in (Reddit or the demo). */
export type Host = {
  toast: (text: string) => void;
};

export const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
