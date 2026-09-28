import type { ExternalPlaceKind } from '@prolez/shared';

/**
 * Метки внешнего слоя — чёрно-белые картинки 32 dp (круг 24 и ореол), лайм только у спотов.
 * PNG @3x рендерит scripts/render-map-marks.mjs.
 */
export const externalMarks: Record<ExternalPlaceKind, number> = {
  crag: require('../../../assets/images/map/external-crag.png'),
  gym: require('../../../assets/images/map/external-gym.png'),
};

/** Имя картинки метки в стиле карты. */
export const externalMarkImage = (kind: ExternalPlaceKind) => `external-${kind}`;
