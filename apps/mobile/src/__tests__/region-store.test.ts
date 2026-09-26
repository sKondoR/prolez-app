import { useRegionStore } from '@/features/regions/region-store';
import { storage } from '@/lib/storage';

const reset = () => useRegionStore.setState({ code: 'RU-SPE', detection: 'pending', focusKey: 0 });

describe('region store', () => {
  beforeEach(reset);

  it('starts in Saint Petersburg until the region is detected', () => {
    expect(useRegionStore.getState()).toMatchObject({ code: 'RU-SPE', detection: 'pending' });
  });

  it('moves to the detected region and flies the camera there', () => {
    useRegionStore.getState().detectedRegion('RU-TA', 'done');
    expect(useRegionStore.getState()).toMatchObject({
      code: 'RU-TA',
      detection: 'done',
      focusKey: 1,
    });
  });

  it('keeps the default region when detection finds nothing', () => {
    useRegionStore.getState().detectedRegion(null, 'done');
    expect(useRegionStore.getState()).toMatchObject({ code: 'RU-SPE', focusKey: 0 });
  });

  it('never lets detection override a region chosen by hand', () => {
    useRegionStore.getState().chooseRegion('RU-LEN');
    useRegionStore.getState().detectedRegion('RU-TA', 'done');
    expect(useRegionStore.getState().code).toBe('RU-LEN');
  });

  it('persists the chosen region on the device', () => {
    useRegionStore.getState().chooseRegion('RU-MOW');
    expect(JSON.parse(storage.getString('region')!).state).toEqual({
      code: 'RU-MOW',
      detection: 'done',
    });
  });
});
