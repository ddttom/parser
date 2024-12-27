import { name, parse } from '../../src/services/parser/parsers/task.js';

describe('Task Parser', () => {
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
      const result = await parse('[task:123]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[task:123]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit task markers', async () => {
      const result = await parse('[task:123]');
      expect(result).toEqual({
        type: 'task',
        value: {
          taskId: 123
        },
        metadata: {
          pattern: 'explicit',
          confidence: 0.95,
          originalMatch: '[task:123]'
        }
      });
    });

    test('should detect task with parameters', async () => {
      const result = await parse('[task:123(type=bug)]');
      expect(result).toEqual({
        type: 'task',
        value: {
          taskId: 123,
          parameters: {
            type: 'bug'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: 0.95,
          originalMatch: '[task:123(type=bug)]'
        }
      });
    });

    test('should detect inferred task references', async () => {
      const formats = [
        'task 123',
        'ticket #123',
        'issue 123',
        'story 123',
        'bug 123'
      ];

      for (const format of formats) {
        const result = await parse(format);
        expect(result.value.taskId).toBe(123);
        expect(result.metadata.pattern).toBe('inferred');
      }
    });

    test('should handle optional hash symbol', async () => {
      const withHash = await parse('task #123');
      const withoutHash = await parse('task 123');
      expect(withHash.value.taskId).toBe(123);
      expect(withoutHash.value.taskId).toBe(123);
    });

    test('should detect task references with context', async () => {
      const result = await parse('blocked by task 123');
      expect(result).toEqual({
        type: 'task',
        value: {
          taskId: 123,
          relationship: 'blocked_by'
        },
        metadata: {
          pattern: 'contextual',
          confidence: 0.85,
          originalMatch: 'blocked by task 123'
        }
      });
    });
  });

  describe('Task ID Validation', () => {
    test('should validate numeric task IDs', async () => {
      const result = await parse('[task:abc]');
      expect(result).toBeNull();
    });

    test('should parse task IDs as integers', async () => {
      const result = await parse('[task:123]');
      expect(typeof result.value.taskId).toBe('number');
      expect(result.value.taskId).toBe(123);
    });

    test('should handle task ID ranges', async () => {
      const validIds = [1, 100, 999999];
      for (const id of validIds) {
        const result = await parse(`[task:${id}]`);
        expect(result.value.taskId).toBe(id);
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[task:123]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('task #123');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('related to 123');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for task at start of text', async () => {
      const result = await parse('[task:123] is blocked');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[task:123] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should increase confidence for contextual references', async () => {
      const withContext = await parse('blocked by task 123');
      const withoutContext = await parse('task 123');
      expect(withContext.metadata.confidence)
        .toBeGreaterThan(withoutContext.metadata.confidence);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task format', async () => {
      const result = await parse('[task:]');
      expect(result).toBeNull();
    });

    test('should handle empty task value', async () => {
      const result = await parse('[task: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[task:123()]',
        '[task:123(type)]',
        '[task:123(type=)]',
        '[task:123(=bug)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid task IDs', async () => {
      const invalidIds = [
        '[task:0]',
        '[task:-1]',
        '[task:1.5]',
        '[task:abc]',
        '[task:!@#]'
      ];

      for (const id of invalidIds) {
        const result = await parse(id);
        expect(result).toBeNull();
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = parse.validateTaskId;

      // Replace with mock that throws
      parse.validateTaskId = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await parse('[task:123]');
        expect(result).toEqual({
          type: 'error',
          error: 'PARSER_ERROR',
          message: 'Validation error'
        });
      } finally {
        // Restore original function
        parse.validateTaskId = originalValidate;
      }
    });
  });
});
