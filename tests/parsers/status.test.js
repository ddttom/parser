import { name, parse } from '../../src/services/parser/parsers/status.js';

describe('Status Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[status:completed]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[status:completed]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
        pattern: expect.any(String),
        originalMatch: expect.any(String),
        level: expect.any(Number)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit status markers', async () => {
      const result = await parse('[status:completed]');
      expect(result.value).toEqual({
        status: 'completed'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[status:completed]');
      expect(result.metadata.level).toBe(3);
    });

    test('should detect status with parameters', async () => {
      const result = await parse('[status:blocked(reason=dependency)]');
      expect(result.value).toEqual({
        status: 'blocked',
        parameters: {
          reason: 'dependency'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[status:blocked(reason=dependency)]');
      expect(result.metadata.level).toBe(2);
    });

    test('should handle all status types', async () => {
      const statuses = [
        { status: 'pending', level: 0 },
        { status: 'started', level: 1 },
        { status: 'blocked', level: 2 },
        { status: 'completed', level: 3 },
        { status: 'cancelled', level: 4 }
      ];

      for (const { status, level } of statuses) {
        const result = await parse(`[status:${status}]`);
        expect(result.value.status).toBe(status);
        expect(result.metadata.pattern).toBe('explicit');
        expect(result.metadata.originalMatch).toBe(`[status:${status}]`);
        expect(result.metadata.level).toBe(level);
      }
    });

    test('should detect progress indicators', async () => {
      const result = await parse('50% complete');
      expect(result.value).toEqual({
        status: 'in_progress',
        progress: 50
      });
      expect(result.metadata.pattern).toBe('progress');
      expect(result.metadata.originalMatch).toBe('50% complete');
      expect(result.metadata.level).toBe(1);
    });

    test('should detect state declarations', async () => {
      const result = await parse('is completed');
      expect(result.value.status).toBe('completed');
      expect(result.metadata.pattern).toBe('state');
      expect(result.metadata.originalMatch).toBe('is completed');
    });

    test('should detect shorthand notation', async () => {
      const result = await parse('[completed]');
      expect(result.value.status).toBe('completed');
      expect(result.metadata.pattern).toBe('shorthand');
      expect(result.metadata.originalMatch).toBe('[completed]');
    });
  });

  describe('Status Mapping', () => {
    test('should handle status aliases', async () => {
      const aliases = [
        { input: 'waiting', expected: 'blocked', pattern: 'state' },
        { input: 'done', expected: 'completed', pattern: 'state' },
        { input: 'finished', expected: 'completed', pattern: 'state' },
        { input: 'in progress', expected: 'started', pattern: 'state' },
        { input: 'on hold', expected: 'blocked', pattern: 'state' }
      ];

      for (const { input, expected, pattern } of aliases) {
        const result = await parse(input);
        expect(result.value.status).toBe(expected);
        expect(result.metadata.pattern).toBe(pattern);
        expect(result.metadata.originalMatch).toBe(input);
      }
    });

    test('should normalize status values', async () => {
      const variations = [
        { input: 'COMPLETED', expected: 'completed' },
        { input: 'In Progress', expected: 'started' },
        { input: 'CANCELLED', expected: 'cancelled' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(`[status:${input}]`);
        expect(result.value.status).toBe(expected);
        expect(result.metadata.pattern).toBe('explicit');
        expect(result.metadata.originalMatch).toBe(`[status:${input}]`);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid status format', async () => {
      const result = await parse('[status:]');
      expect(result).toBeNull();
    });

    test('should handle empty status value', async () => {
      const result = await parse('[status: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[status:blocked()]',
        '[status:blocked(reason)]',
        '[status:blocked(reason=)]',
        '[status:blocked(=dependency)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid status values', async () => {
      const invalidStatuses = [
        '[status:123]',
        '[status:@#$]',
        '[status:   ]',
        '[status:invalid]'
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
