import { activeFilterCount, useMapStore } from '@/features/map/map-store';

describe('map store', () => {
  it('counts only set filters', () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ discipline: 'boulder', gradeMin: '6A', needsPad: false })).toBe(3);
  });

  it('rounds viewport bbox so small pans share a query cache entry', () => {
    useMapStore.getState().setViewport([30.3001, 59.9001, 30.4001, 59.9601], 13);
    expect(useMapStore.getState().bbox).toEqual([30.3, 59.9, 30.4, 59.96]);
  });

  it('shows forbidden zones by default', () => {
    expect(useMapStore.getState().layers.forbidden).toBe(true);
  });
});
