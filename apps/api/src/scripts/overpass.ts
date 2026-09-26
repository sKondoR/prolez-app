/**
 * Запросы к Overpass API с повторами и дисковым кэшем — общие для импортов из OSM.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Публичные серверы Overpass часто перегружены: при повторе берётся следующее зеркало.
const OVERPASS_URLS = process.env.OVERPASS_URL
  ? [process.env.OVERPASS_URL]
  : [
      'https://overpass-api.de/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.private.coffee/api/interpreter',
    ];
const MAX_ATTEMPTS = 9;

// Ответы Overpass кэшируются на диск: при сбое вставки или повторном запуске не нужно
// заново скачивать данные с перегруженных серверов. --refresh — скачать заново.
const CACHE_ROOT = new URL('../../.cache/', import.meta.url);
const refresh = process.argv.includes('--refresh');

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ответ Overpass из кэша `.cache/<dir>/<name>.json`, иначе — запрос и запись в кэш. */
export async function cachedOverpass(dir: string, name: string, query: string): Promise<unknown> {
  const cacheDir = new URL(`${dir}/`, CACHE_ROOT);
  const file = new URL(`${name}.json`, cacheDir);
  if (!refresh) {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch {
      // кэша нет — скачиваем
    }
  }
  const data = await overpass(query);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(file, JSON.stringify(data));
  await sleep(5_000); // не упираться в лимит Overpass
  return data;
}

export async function overpass(query: string, attempt = 1): Promise<unknown> {
  const url = OVERPASS_URLS[(attempt - 1) % OVERPASS_URLS.length]!;
  const retry = async (reason: string) => {
    const delay = 10_000 * Math.ceil(attempt / OVERPASS_URLS.length);
    console.warn(`  ${url}: ${reason}, повтор через ${delay / 1000} с`);
    await sleep(delay);
    return overpass(query, attempt + 1);
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        // Без User-Agent и Accept overpass-api.de отвечает 406.
        'User-Agent': 'prolez-osm-import/0.1',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ data: query }),
    });
  } catch (err) {
    if (attempt < MAX_ATTEMPTS) return retry(`сеть (${(err as Error).message})`);
    throw err;
  }
  // При перегрузке Overpass может вернуть HTML-страницу с ошибкой даже со статусом 200.
  const isJson = res.headers.get('content-type')?.includes('json') ?? false;
  if (res.ok && isJson) return res.json();
  if ((res.ok || res.status === 429 || res.status >= 500) && attempt < MAX_ATTEMPTS) {
    return retry(`HTTP ${res.status}`);
  }
  throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 300)}`);
}
