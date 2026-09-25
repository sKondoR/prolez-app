// Защита от запуска Expo из корня монорепо. Expo-проект живёт в apps/mobile; из корня Expo CLI
// придумывает свой пакет (com.<аккаунт>.prolez), создаёт лишние android/ и app.json и собирает
// приложение без нативных модулей apps/mobile. Expo читает этот файл первым и остановится здесь.
throw new Error(
  'Expo-проект — в apps/mobile. Запускайте expo оттуда (cd apps/mobile) ' +
    'или из корня через скрипты: pnpm mobile.',
);
