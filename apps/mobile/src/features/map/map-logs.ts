import { LogManager, type LogLevel } from '@maplibre/maplibre-react-native';

// Признаки того, что ресурс карты не скачался из-за сети. Без интернета это штатный
// режим (офлайн обязателен в MVP), поэтому красный экран LogBox тут не нужен.
const NETWORK_FAILURE =
  /unable to resolve host|no address associated|failed to connect|connection (?:refused|reset|abort|closed)|timed? ?out|network is unreachable|software caused connection abort|ssl handshake|http status code 5\d\d|temporary error/i;

/** Уровень, с которым сообщение MapLibre стоит показать в консоли. */
export function classifyMapLog(event: { level: LogLevel; message: string }): LogLevel {
  if (event.level === 'error' && NETWORK_FAILURE.test(event.message)) return 'warn';
  return event.level;
}

let installed = false;

/** Перехватывает логи MapLibre: сетевые ошибки загрузки уходят в `console.warn`. */
export function installMapLogHandler(): void {
  if (installed) return;
  installed = true;
  LogManager.onLog((event) => {
    if (classifyMapLog(event) === event.level) return false;
    console.warn(`MapLibre Native [WARN] [${event.tag}] ${event.message}`);
    return true;
  });
}
