import type { ExternalPlace } from './spots';

/**
 * Загородные скальные районы Карельского перешейка и Карелии — внешний слой карты.
 * Пока это константа: приложение показывает её и без сети, seed пишет её же в external_places.
 * Список и категории — каталог «Скалы России» Федерации скалолазания (c-f-r.ru/rocks),
 * координаты — оттуда же или из OpenStreetMap (© участники OpenStreetMap).
 */
export const crags: ExternalPlace[] = [
  {
    id: 'crag-treugolnoe',
    name: 'Треугольное озеро',
    location: { lon: 29.16044, lat: 61.10987 },
    description: 'Выборгский район ЛО, через Лосево. Трудность и боулдеринг, 5A–8C.',
  },
  {
    id: 'crag-lietlahti',
    name: 'Лиетлахти',
    location: { lon: 29.12725, lat: 61.11086 },
    description: 'Боулдеринг в природно-этнографическом парке, Выборгский район ЛО.',
  },
  {
    id: 'crag-bolshie-skaly',
    name: 'Большие скалы (Ястребиное озеро)',
    location: { lon: 29.70659, lat: 61.16064 },
    description: 'У Кузнечного, Приозерский район ЛО. Главная стена — скала Парнас.',
  },
  {
    id: 'crag-malye-skaly',
    name: 'Малые Скалы',
    location: { lon: 30.00025, lat: 61.05755 },
    description: 'Приозерский район ЛО.',
  },
  {
    id: 'crag-paltsevo',
    name: 'Пальцево',
    location: { lon: 28.80938, lat: 60.78898 },
    description: '10 км к северу от Выборга. Трудность, 5C–8B.',
  },
  {
    id: 'crag-stalker',
    name: 'S.T.A.L.K.E.R. (Сталкер)',
    location: { lon: 28.79306, lat: 60.75017 },
    description: 'Боулдеринг у Выборга, Выборгский район ЛО. 4–7C.',
  },
  {
    id: 'crag-hiitola',
    name: 'Хиитола',
    location: { lon: 29.79885, lat: 61.22214 },
    description: 'У Хийтолы, Лахденпохский район Карелии. Трудность, 6A–8B.',
  },
  {
    id: 'crag-zmeinaya-gora',
    name: 'Змеиная гора (Сорола)',
    location: { lon: 30.21522, lat: 61.48078 },
    description: 'У Лахденпохьи, Карелия. Более 100 трасс.',
  },
  {
    id: 'crag-impilahti',
    name: 'Импилахти',
    location: { lon: 31.1649, lat: 61.6479 },
    description: 'Гранитные скалы до 60 м над заливом Ладоги, Питкярантский район Карелии. 5B–7B.',
  },
  {
    id: 'crag-shuiskie-skaly',
    name: 'Шуйские скалы',
    location: { lon: 34.21389, lat: 61.94861 },
    description: 'Скалы у станции Шуйская, 20 км от Петрозаводска. 5B–7C.',
  },
].map((c) => ({ ...c, kind: 'crag' as const, url: null }));
