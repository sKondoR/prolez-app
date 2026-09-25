// В Hermes нет Intl.PluralRules, без него i18next не выбирает формы `_one/_few/_many`.
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/ru.js';

import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './ru.json';

// Интерфейс пока только на русском, но все строки живут здесь, а не в компонентах.
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  lng: 'ru',
  fallbackLng: 'ru',
  resources: { ru: { translation: ru } },
  interpolation: { escapeValue: false },
});

export default i18n;
