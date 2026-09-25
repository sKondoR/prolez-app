import type { Bbox, SpotFilters } from '@prolez/shared';
import { create } from 'zustand';

interface MapState {
  filters: SpotFilters;
  layers: { forbidden: boolean; external: boolean };
  /** Видимая область карты, округлённая, чтобы соседние сдвиги попадали в один кэш запроса. */
  bbox: Bbox;
  zoom: number;
  setFilters: (filters: SpotFilters) => void;
  resetFilters: () => void;
  toggleLayer: (layer: keyof MapState['layers']) => void;
  setViewport: (bbox: Bbox, zoom: number) => void;
}

export const SPB_CENTER: [number, number] = [30.3351, 59.9343];
export const SPB_BBOX: Bbox = [29.42, 59.63, 30.76, 60.25];

const round = (value: number) => Math.round(value * 500) / 500;

export const useMapStore = create<MapState>()((set) => ({
  filters: {},
  // Слой запретных зон включён по умолчанию (IDEA.md: «Безопасность и закон»).
  layers: { forbidden: true, external: true },
  bbox: SPB_BBOX,
  zoom: 10,
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: {} }),
  toggleLayer: (layer) => set((s) => ({ layers: { ...s.layers, [layer]: !s.layers[layer] } })),
  setViewport: ([w, s, e, n], zoom) =>
    set({ bbox: [round(w), round(s), round(e), round(n)], zoom }),
}));

export function activeFilterCount(filters: SpotFilters): number {
  return Object.values(filters).filter((v) => v !== undefined).length;
}
