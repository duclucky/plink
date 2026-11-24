import { useSyncExternalStore } from 'react';
import { isMuted, onMuteChange } from '../audio';

/** Whether the player has turned the sound off, kept in step everywhere. */
export const useMuted = () => useSyncExternalStore(onMuteChange, isMuted);
