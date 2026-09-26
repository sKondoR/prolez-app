import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';
import RegionsScreen from '@/app/regions';
import { useRegionStore } from '@/features/regions/region-store';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['regions'], { 'RU-SPE': 24, 'RU-LEN': 3 });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <RegionsScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('RegionsScreen', () => {
  beforeEach(() => {
    useRegionStore.setState({ code: 'RU-SPE', detection: 'done', focusKey: 0 });
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('offline')) as jest.Mock;
  });

  it('lists regions with spots first and marks the selected one', async () => {
    await renderScreen();
    expect(screen.getByText('24 спота')).toBeTruthy();
    expect(screen.getByText('3 спота')).toBeTruthy();
    expect(screen.getByText('Выбран')).toBeTruthy();
    expect(screen.getAllByText('Спотов пока нет')).toHaveLength(1);
  });

  it('finds a region by name ignoring case and ё', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Найти регион'), 'ленинградская');
    expect(screen.getByText('Ленинградская область')).toBeTruthy();
    expect(screen.queryByText('Санкт-Петербург')).toBeNull();
  });

  it('chooses a region by hand and closes the sheet', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Найти регион'), 'татарстан');
    await fireEvent.press(screen.getByText('Татарстан'));
    expect(useRegionStore.getState()).toMatchObject({ code: 'RU-TA', detection: 'done' });
    expect(mockBack).toHaveBeenCalled();
  });
});
