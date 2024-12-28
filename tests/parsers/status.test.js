import { name, parse } from '../../src/services/parser/parsers/status.js';

describe('Status Parser', () => {
  describe('Return Format', () => {
    test('should return object with status key', async () => {
      const result = await parse('is completed');
      expect(result).toHaveProperty('status');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('is completed');
      expect(result.status).toEqual(expect.objectContaining({
        status: expect.any(String),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String),
        level: expect.any(Number)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should detect state declarations', async () => {
      const result = await parse('is completed');
      expect(result.status).toEqual(expect.objectContaining({
        status: 'completed'
      }));
    });

    test('should detect progress indicators', async () => {
      const result = await parse('50% complete');
      expect(result.status).toEqual(expect.objectContaining({
        progress: 50
      }));
    });

    test('should detect contextual status', async () => {
      const result = await parse('waiting for review');
      expect(result.status).toEqual(expect.objectContaining({
        status: 'blocked'
      }));
    });

    test('should handle all status types', async () => {
      const statuses = [
        { input: 'is pending', status: 'pending', level: 0 },
        { input: 'is started', status: 'started', level: 1 },
        { input: 'is blocked', status: 'blocked', level: 2 },
        { input: 'is completed', status: 'completed', level: 3 },
        { input: 'is cancelled', status: 'cancelled', level: 4 }
      ];

      for (const { input, status, level } of statuses) {
        const result = await parse(input);
        expect(result.status.status).toBe(status);
      }
    });
  });

  describe('Status Mapping', () => {
    test('should handle status aliases', async () => {
      const aliases = [
        { input: 'waiting', expected: 'blocked' },
        { input: 'done', expected: 'completed' },
        { input: 'finished', expected: 'completed' },
        { input: 'cancelled', expected: 'cancelled' }
      ];

      for (const { input, expected } of aliases) {
        const result = await parse(input);
        expect(result.status.status).toBe(expected);
      }
    });

    test('should normalize status values', async () => {
      const variations = [
        { input: 'is COMPLETED', expected: 'completed' },
        { input: 'is BLOCKED', expected: 'blocked' },
        { input: 'is CANCELLED', expected: 'cancelled' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(input);
        expect(result.status.status).toBe(expected);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid status values', async () => {
      const invalidStatuses = [
        'is 123',
        'is @#$',
        'is    ',
        'is invalid'
      ];

      for (const status of invalidStatuses) {
        const result = await parse(status);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid progress values', async () => {
      const invalidProgress = [
        '-10% complete',
        '150% complete',
        '0% complete',
        'abc% complete'
      ];

      for (const progress of invalidProgress) {
        const result = await parse(progress);
        expect(result).toBeNull();
      }
    });
  });
});
