import { name, parse } from '../../src/services/parser/parsers/status.js';

describe('Status Parser', () => {
  describe('Input Validation', () => {
    test('should handle null input', async () => {
      const result = await parse(null);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle empty string', async () => {
      const result = await parse('');
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle undefined input', async () => {
      const result = await parse(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle non-string input', async () => {
      const numberResult = await parse(123);
      expect(numberResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const objectResult = await parse({});
      expect(objectResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const arrayResult = await parse([]);
      expect(arrayResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[status:completed]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[status:completed]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
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
      expect(result).toEqual({
        type: 'status',
        value: {
          status: 'completed'
        },
        metadata: {
          pattern: 'explicit',
          confidence: 0.95,
          originalMatch: '[status:completed]',
          level: 3
        }
      });
    });

    test('should detect status with parameters', async () => {
      const result = await parse('[status:blocked(reason=dependency)]');
      expect(result).toEqual({
        type: 'status',
        value: {
          status: 'blocked',
          parameters: {
            reason: 'dependency'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: 0.95,
          originalMatch: '[status:blocked(reason=dependency)]',
          level: 2
        }
      });
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
        expect(result.metadata.level).toBe(level);
      }
    });

    test('should detect progress indicators', async () => {
      const result = await parse('50% complete');
      expect(result).toEqual({
        type: 'status',
        value: {
          status: 'in_progress',
          progress: 50
        },
        metadata: {
          pattern: 'progress',
          confidence: 0.85,
          originalMatch: '50% complete',
          level: 1
        }
      });
    });

    test('should detect state declarations', async () => {
      const result = await parse('is completed');
      expect(result.value.status).toBe('completed');
      expect(result.metadata.pattern).toBe('state');
    });

    test('should detect shorthand notation', async () => {
      const result = await parse('[completed]');
      expect(result.value.status).toBe('completed');
      expect(result.metadata.pattern).toBe('shorthand');
    });
  });

  describe('Status Mapping', () => {
    test('should handle status aliases', async () => {
      const aliases = [
        { input: 'waiting', expected: 'blocked' },
        { input: 'done', expected: 'completed' },
        { input: 'finished', expected: 'completed' },
        { input: 'in progress', expected: 'started' },
        { input: 'on hold', expected: 'blocked' }
      ];

      for (const { input, expected } of aliases) {
        const result = await parse(input);
        expect(result.value.status).toBe(expected);
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
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[status:completed]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('status: completed');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('task is done');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for status at start of text', async () => {
      const result = await parse('[status:completed] task');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[status:completed] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
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
