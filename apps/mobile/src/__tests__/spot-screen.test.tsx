import type { SpotDetail } from '@prolez/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';
import SpotScreen from '@/app/spot/[id]';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const SPOT_ID = '3f0c8a1e-2b4d-4c6e-9f10-1a2b3c4d5e6f';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: SPOT_ID }),
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
}));

const spot: SpotDetail = {
  id: SPOT_ID,
  name: 'Стенка на Ланской',
  location: { lon: 30.32, lat: 59.99 },
  disciplines: ['boulder'],
  needsPad: false,
  gradeMin: '5C',
  gradeMax: '6B',
  problemCount: 2,
  address: 'Ланская ул., 3',
  note: 'Резиновое покрытие у воркаут-зоны.',
  lastVisitAt: null,
  photos: [],
  problems: [
    {
      id: 'a1b2c3d4-0000-4000-8000-000000000001',
      name: 'Угол',
      discipline: 'boulder',
      grade: '5C',
      status: 'confirmed',
      ascentCount: 4,
      photoId: null,
      marks: [],
    },
    {
      id: 'a1b2c3d4-0000-4000-8000-000000000002',
      name: 'Траверс',
      discipline: 'boulder',
      grade: '6B',
      status: 'project',
      ascentCount: 0,
      photoId: null,
      marks: [],
    },
  ],
};

function renderScreen(response: { status: number; body: unknown }) {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: response.status < 400,
    status: response.status,
    json: async () => response.body,
  }) as jest.Mock;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <SpotScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('SpotScreen', () => {
  it('shows spot attributes and problems with their status', async () => {
    await renderScreen({ status: 200, body: spot });

    expect(await screen.findByText('Стенка на Ланской')).toBeTruthy();
    expect(screen.getByText('5C–6B')).toBeTruthy();
    expect(screen.getByText('2 проблемы')).toBeTruthy();
    expect(screen.getByText('Ланская ул., 3')).toBeTruthy();
    expect(screen.getByText('Можно без пада')).toBeTruthy();
    expect(screen.getByText('Резиновое покрытие у воркаут-зоны.')).toBeTruthy();
    expect(screen.getByText('Боулдеринг · подтверждена · пролезли 4')).toBeTruthy();
    expect(screen.getByText('Боулдеринг · проект')).toBeTruthy();
    expect(screen.getByText('Визитов ещё не было')).toBeTruthy();
  });

  it('numbers problems marked on the wall photo and opens the marking editor', async () => {
    const PHOTO_ID = 'b1b2c3d4-0000-4000-8000-0000000000aa';
    const marks = [
      { kind: 'hand', x: 0.2, y: 0.6 },
      { kind: 'top', x: 0.5, y: 0.1 },
    ] as const;
    await renderScreen({
      status: 200,
      body: {
        ...spot,
        photos: [
          { id: PHOTO_ID, url: `/photos/${PHOTO_ID}`, width: 1200, height: 1800, credit: 'Пример' },
        ],
        problems: [{ ...spot.problems[0]!, photoId: PHOTO_ID, marks }, spot.problems[1]!],
      },
    });

    expect(await screen.findByText('Пример')).toBeTruthy();
    // Номер есть на фото и в строке списка; у неразмеченной проблемы номера нет.
    expect(screen.getByLabelText('Проблема 1: Угол')).toBeTruthy();
    expect(screen.getAllByText('1')).toHaveLength(2);

    await fireEvent.press(screen.getByText('Разметить новую проблему'));
    expect(screen.getByText('Разметка проблемы')).toBeTruthy();
    expect(screen.getByText('Дальше')).toBeTruthy();
  });

  it('opens a spot of the selected region without network', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    // Выгрузка региона сделана час назад: карточка устарела, обновить её без сети нельзя.
    client.setQueryData(['region-spots', 'RU-SPE'], [spot], { updatedAt: Date.now() - 3_600_000 });
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <QueryClientProvider client={client}>
          <SpotScreen />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByText('Стенка на Ланской')).toBeTruthy();
    expect(screen.getByText('Боулдеринг · проект')).toBeTruthy();
    await waitFor(() => expect(client.getQueryState(['spot', SPOT_ID])?.status).toBe('error'));
    expect(screen.queryByText('Не удалось загрузить спот')).toBeNull();
    expect(screen.getByText('Стенка на Ланской')).toBeTruthy();
  });

  it('shows not found for 404', async () => {
    await renderScreen({ status: 404, body: { message: 'Spot not found' } });
    expect(await screen.findByText('Спот не найден')).toBeTruthy();
  });
});
