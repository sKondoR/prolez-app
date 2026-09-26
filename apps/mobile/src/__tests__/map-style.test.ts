import type { Bbox } from '@prolez/shared';

import { limitBasemap, mapColors } from '@/features/map/map-style';

const BBOX: Bbox = [29, 59, 32, 61];

const style = {
  version: 8 as const,
  sources: {
    openmaptiles: { type: 'vector' as const, tiles: ['https://example.org/{z}/{x}/{y}.pbf'] },
  },
  layers: [
    { id: 'background', type: 'background' as const },
    { id: 'water', type: 'fill' as const, source: 'openmaptiles', 'source-layer': 'water' },
  ],
};

describe('limitBasemap', () => {
  it('bounds the tile source to the region so no tiles load outside it', () => {
    const limited = limitBasemap(style, BBOX);
    expect(limited.sources.openmaptiles).toMatchObject({ bounds: BBOX });
    // Исходный стиль не меняется: он лежит в кэше запросов.
    expect(style.sources.openmaptiles).not.toHaveProperty('bounds');
  });

  it('covers everything outside the region with concrete above the basemap', () => {
    const limited = limitBasemap(style, BBOX);
    // Тайлы на краю прямоугольника рисуют и соседей — маска должна быть выше их слоёв.
    expect(limited.layers.map((l) => l.id)).toEqual(['background', 'water', 'outside-mask']);
    expect(limited.layers[2]).toMatchObject({ paint: { 'fill-color': mapColors.outside } });
    const mask = limited.sources['outside-mask'] as { data: GeoJSON.Feature<GeoJSON.Polygon> };
    // Дырка в маске — ровно прямоугольник подложки.
    expect(mask.data.geometry.coordinates[1]).toContainEqual([29, 59]);
    expect(mask.data.geometry.coordinates[1]).toContainEqual([32, 61]);
  });
});
