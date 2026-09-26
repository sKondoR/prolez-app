import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

const subscribe = (listener: () => void) => onlineManager.subscribe(listener);
const getSnapshot = () => onlineManager.isOnline();

/** Есть ли сеть — по NetInfo (см. query-client.ts). */
export function useOnline() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
