# Prolez (Пролез)

Карта городских мест для лазания в Санкт-Петербурге. Концепция и план — уровнем выше: `../IDEA.md`, `../PLAN.md`.

## Структура

- `apps/mobile` — Expo (React Native), expo-router.
- `apps/api` — Fastify + Drizzle, PostgreSQL + PostGIS.
- `packages/shared` — шкалы категорий и доменные правила, общие для клиента и сервера.
- `infra` — локальное окружение (docker compose).

## Запуск

Нужны Node 24, pnpm 10 и Docker.

```bash
pnpm install
pnpm db:up          # PostGIS + MinIO
pnpm api            # API на http://localhost:3000, проверка: /health
pnpm mobile         # Metro для dev build
```

На Windows standalone-сборка pnpm падает с `EPERM` на симлинках — запускайте её через системный Node: `npx pnpm@10 install`.

Проверки: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## База данных и фото

Настройки API — в `apps/api/.env` (образец — `.env.example`). PostGIS из docker compose слушает порт **5434**, MinIO — 9010: порты 5432–5433 и 9000–9001 на машине разработки заняты.

```bash
pnpm --filter api db:migrate   # применить миграции из apps/api/drizzle
pnpm --filter api db:seed      # демо-споты и демо-фото стены с разметкой в MinIO; печатает id спота с фото
```

После изменения `.env` (например, новых `S3_*`) перезапустите API: переменные читаются только при старте.

## Android dev build

Приложению нужен dev build, Expo Go не подойдёт. После добавления нативных модулей или config-плагинов (например, `expo-location`, `react-native-svg`) пересоберите его при запущенном эмуляторе.

Команды `expo` запускайте **только из `apps/mobile`**. Из корня репозитория Expo возьмёт корневой `package.json` без `main` и упадёт с `Unable to resolve "../../App" from "node_modules\expo\AppEntry.js"`.

```bash
# терминал 1, из корня: Metro с перезагрузкой при изменениях
pnpm mobile

# терминал 2, из корня
pnpm android:prebuild   # expo prebuild -p android: обновить android/ из app.json и плагинов
pnpm android            # expo run:android --device Galaxy_S24_API34 --no-bundler
```

Оба скрипта выполняются в `apps/mobile`. `Galaxy_S24_API34` — имя AVD на машине разработки; для другого эмулятора запустите из `apps/mobile` напрямую: `npx expo run:android --device <AVD> --no-bundler`.

`--no-bundler` подключает сборку к уже запущенному Metro. Если запускать `run:android` с `CI=1` и без него, Metro поднимется в CI-режиме, где отключены перезагрузки: изменения кода в приложении не появятся.
