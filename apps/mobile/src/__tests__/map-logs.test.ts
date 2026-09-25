import { classifyMapLog } from '@/features/map/map-logs';

jest.mock('@maplibre/maplibre-react-native', () => ({ LogManager: { onLog: jest.fn() } }));

describe('classifyMapLog', () => {
  it('downgrades tile load failures without network to warn', () => {
    const message =
      'Failed to load tile 13/4788/2376=>13 for source с: Unable to resolve host "tiles.openfreemap.org": No address associated with hostname';
    expect(classifyMapLog({ level: 'error', message })).toBe('warn');
    expect(classifyMapLog({ level: 'error', message: 'Failed to load sprite: timeout' })).toBe(
      'warn',
    );
  });

  it('keeps other errors as errors', () => {
    expect(classifyMapLog({ level: 'error', message: 'Failed to parse style: bad JSON' })).toBe(
      'error',
    );
    expect(classifyMapLog({ level: 'info', message: 'Unable to resolve host' })).toBe('info');
  });
});
