import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LRUCache } from '#server/utils/lru-cache';

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing keys', () => {
      const cache = new LRUCache<string>();
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing keys', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');
      expect(cache.get('key1')).toBe('value2');
    });

    it('should delete keys', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return false when deleting nonexistent key', () => {
      const cache = new LRUCache<string>();
      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should report correct size', () => {
      const cache = new LRUCache<string>();
      expect(cache.size).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);
    });

    it('should check existence with has()', () => {
      const cache = new LRUCache<string>();
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when at capacity', () => {
      const cache = new LRUCache<string>(3);
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');
      cache.set('d', '4'); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe('2');
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
      expect(cache.size).toBe(3);
    });

    it('should update LRU order on get()', () => {
      const cache = new LRUCache<string>(3);
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Access 'a' to make it most recently used
      cache.get('a');

      // Add new entry - should evict 'b' (oldest after 'a' was accessed)
      cache.set('d', '4');

      expect(cache.get('a')).toBe('1');
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe('3');
      expect(cache.get('d')).toBe('4');
    });

    it('should update LRU order on set() for existing key', () => {
      const cache = new LRUCache<string>(3);
      cache.set('a', '1');
      cache.set('b', '2');
      cache.set('c', '3');

      // Update 'a' to make it most recently used
      cache.set('a', 'updated');

      // Add new entry - should evict 'b'
      cache.set('d', '4');

      expect(cache.get('a')).toBe('updated');
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire entries after TTL', () => {
      const cache = new LRUCache<string>(100, 1000); // 1 second TTL
      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should not expire entries before TTL', () => {
      const cache = new LRUCache<string>(100, 1000);
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(999);

      expect(cache.get('key1')).toBe('value1');
    });

    it('should remove expired entries from cache on get()', () => {
      const cache = new LRUCache<string>(100, 1000);
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(1001);
      cache.get('key1'); // Triggers removal

      expect(cache.size).toBe(0);
    });

    it('should return false for has() on expired entries', () => {
      const cache = new LRUCache<string>(100, 1000);
      cache.set('key1', 'value1');

      vi.advanceTimersByTime(1001);

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('prune()', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove all expired entries', () => {
      const cache = new LRUCache<string>(100, 1000);
      cache.set('a', '1');
      cache.set('b', '2');

      vi.advanceTimersByTime(500);
      cache.set('c', '3'); // Added later

      vi.advanceTimersByTime(600); // a and b expired, c not yet

      const pruned = cache.prune();

      expect(pruned).toBe(2);
      expect(cache.size).toBe(1);
      expect(cache.get('c')).toBe('3');
    });

    it('should return 0 when no entries expired', () => {
      const cache = new LRUCache<string>(100, 1000);
      cache.set('a', '1');

      const pruned = cache.prune();
      expect(pruned).toBe(0);
    });
  });

  describe('type safety', () => {
    it('should work with object values', () => {
      interface User {
        id: number;
        name: string;
      }
      const cache = new LRUCache<User>();
      cache.set('user1', { id: 1, name: 'Alice' });

      const user = cache.get('user1');
      expect(user?.id).toBe(1);
      expect(user?.name).toBe('Alice');
    });

    it('should work with array values', () => {
      const cache = new LRUCache<string[]>();
      cache.set('list', ['a', 'b', 'c']);

      expect(cache.get('list')).toEqual(['a', 'b', 'c']);
    });

    it('should work with null values', () => {
      const cache = new LRUCache<string | null>();
      cache.set('nullable', null);

      expect(cache.get('nullable')).toBeNull();
      expect(cache.has('nullable')).toBe(true);
    });
  });

  describe('default configuration', () => {
    it('should use default maxSize of 1000', () => {
      const cache = new LRUCache<number>();
      for (let i = 0; i < 1001; i++) {
        cache.set(`key${i}`, i);
      }
      expect(cache.size).toBe(1000);
      expect(cache.get('key0')).toBeUndefined(); // First key evicted
      expect(cache.get('key1000')).toBe(1000); // Last key present
    });
  });
});
