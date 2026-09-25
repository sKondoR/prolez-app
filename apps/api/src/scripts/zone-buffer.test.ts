import { describe, expect, it } from 'vitest';

import { bufferMeters } from './zone-buffer';

describe('bufferMeters', () => {
  it('uses the small buffer for yard transformer substations', () => {
    expect(bufferMeters('power', { power: 'substation', substation: 'minor_distribution' })).toBe(
      10,
    );
    expect(bufferMeters('power', { power: 'substation' })).toBe(10);
    expect(bufferMeters('power', { power: 'substation', voltage: '10000;400' })).toBe(10);
    expect(bufferMeters('power', { power: 'substation', man_made: 'street_cabinet' })).toBe(10);
  });

  it('keeps 50 m for major power objects', () => {
    expect(bufferMeters('power', { power: 'substation', voltage: '110000;10000' })).toBe(50);
    expect(bufferMeters('power', { power: 'substation', substation: 'distribution' })).toBe(50);
    expect(bufferMeters('power', { power: 'tower' })).toBe(50);
    expect(bufferMeters('power', { power: 'line' })).toBe(50);
  });

  it('uses the small buffer for generic masts but not communication towers', () => {
    expect(bufferMeters('communication', { man_made: 'mast' })).toBe(10);
    expect(bufferMeters('communication', { man_made: 'mast', 'tower:type': 'communication' })).toBe(
      50,
    );
    expect(
      bufferMeters('communication', { man_made: 'tower', 'tower:type': 'communication' }),
    ).toBe(50);
  });

  it('keeps 50 m for every other category', () => {
    expect(bufferMeters('bridge', { bridge: 'yes' })).toBe(50);
    expect(bufferMeters('heritage', { heritage: '2' })).toBe(50);
  });
});
