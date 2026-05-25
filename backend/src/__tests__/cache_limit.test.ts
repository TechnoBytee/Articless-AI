import { LimitedMap as TRDizinLimitedMap, titleCache as trDizinCache } from '../services/sources/tr-dizin';
import { LimitedMap as YOKTezLimitedMap, titleCache as yokTezCache } from '../services/sources/yoktez';

describe('LimitedMap & Caching Behavior Tests', () => {
  it('should enforce size limit and remove oldest item (FIFO)', () => {
    const map = new TRDizinLimitedMap<number, string>(3);
    
    map.set(1, 'one');
    map.set(2, 'two');
    map.set(3, 'three');
    
    expect(map.size).toBe(3);
    expect(map.has(1)).toBe(true);

    // Adding 4th item when limit is 3 should evict 1 (the oldest)
    map.set(4, 'four');
    expect(map.size).toBe(3);
    expect(map.has(1)).toBe(false);
    expect(map.has(2)).toBe(true);
    expect(map.has(3)).toBe(true);
    expect(map.has(4)).toBe(true);
  });

  it('should verify TR Dizin titleCache is a LimitedMap with limit 500', () => {
    expect(trDizinCache).toBeInstanceOf(TRDizinLimitedMap);
    
    // Clear and fill up to 510 items
    trDizinCache.clear();
    for (let i = 1; i <= 510; i++) {
      trDizinCache.set(`id-${i}`, `Title ${i}`);
    }

    expect(trDizinCache.size).toBe(500);
    expect(trDizinCache.has('id-1')).toBe(false); // Evicted oldest
    expect(trDizinCache.has('id-11')).toBe(true); // Retained
    expect(trDizinCache.has('id-510')).toBe(true); // Latest
  });

  it('should verify YOK Tez titleCache is a LimitedMap with limit 500', () => {
    expect(yokTezCache).toBeInstanceOf(YOKTezLimitedMap);
    
    // Clear and fill up to 510 items
    yokTezCache.clear();
    for (let i = 1; i <= 510; i++) {
      yokTezCache.set(`id-${i}`, `Title ${i}`);
    }

    expect(yokTezCache.size).toBe(500);
    expect(yokTezCache.has('id-1')).toBe(false); // Evicted oldest
    expect(yokTezCache.has('id-11')).toBe(true); // Retained
    expect(yokTezCache.has('id-510')).toBe(true); // Latest
  });
});
