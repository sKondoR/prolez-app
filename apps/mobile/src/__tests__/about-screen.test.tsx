import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '@/i18n';
import { AboutScreen } from '@/features/about/about-screen';

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderAbout() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <AboutScreen />
    </SafeAreaProvider>,
  );
}

describe('AboutScreen', () => {
  it('shows the landing sections up to the roles note, without the launch sign-up', async () => {
    await renderAbout();
    expect(screen.getByLabelText('Город — твой скалодром')).toBeTruthy();
    expect(screen.getByText('Как читать разметку')).toBeTruthy();
    expect(screen.getByText('Легально по построению')).toBeTruthy();
    expect(screen.getByText('Категорию ставит не автор')).toBeTruthy();
    expect(screen.getByText('Без сети и без GPS')).toBeTruthy();
    expect(screen.getByText(/Выберите одну роль или все три/)).toBeTruthy();
    expect(screen.queryByText(/Узнать о запуске/)).toBeNull();
    expect(screen.queryByText(/RuStore/)).toBeNull();
  });

  it('sends queued ascents one by one once the queue scrolls into view', async () => {
    jest.useFakeTimers();
    await renderAbout();
    expect(screen.getAllByText('в очереди')).toHaveLength(3);

    await fireEvent(screen.getByTestId('about-offline'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 3000, width: 390, height: 600 } },
    });
    await fireEvent.scroll(screen.getByTestId('about-scroll'), {
      nativeEvent: { contentOffset: { y: 5000 }, contentSize: { height: 6000, width: 390 } },
    });
    await act(async () => {
      jest.advanceTimersByTime(1400 + 2 * 650);
    });

    expect(screen.getAllByText('ушла')).toHaveLength(3);
    jest.useRealTimers();
  });
});
