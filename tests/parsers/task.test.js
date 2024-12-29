import { name, perfect } from '../../src/services/parser/parsers/task.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Task Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('task 123');
      expect(result).toEqual(expect.objectContaining({
        text: expect.any(String),
        corrections: expect.any(Array)
      }));
    });

    test('should return original text with empty corrections for no matches', async () => {
      const text = '   ';
      const result = await perfect(text);
      expect(result).toEqual({
        text,
        corrections: []
      });
    });

    test('should include all required correction properties', async () => {
      const result = await perfect('task 123');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'task',
        original: expect.any(String),
        correction: expect.any(String),
        position: expect.objectContaining({
          start: expect.any(Number),
          end: expect.any(Number)
        }),
        confidence: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should handle task references', async () => {
      const variations = [
        {
          input: 'task 123',
          expected: 'task #123'
        },
        {
          input: 'ticket #123',
          expected: 'task #123'
        },
        {
          input: 'issue 123',
          expected: 'task #123'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle optional hash symbol', async () => {
      const variations = [
        {
          input: 'task #123',
          expected: 'task #123'
        },
        {
          input: 'task 123',
          expected: 'task #123'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle task references in context', async () => {
      const variations = [
        {
          input: 'working on task 123',
          expected: 'working on task #123'
        },
        {
          input: 'related to ticket #123',
          expected: 'related to task #123'
        },
        {
          input: 'fixes issue 123',
          expected: 'fixes task #123'
        },
        {
          input: 'implements task #123',
          expected: 'implements task #123'
        },
        {
          input: 'completes ticket 123',
          expected: 'completes task #123'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Task ID Validation', () => {
    test('should handle non-numeric task IDs', async () => {
      const result = await perfect('task abc');
      expect(result).toEqual({
        text: 'task abc',
        corrections: []
      });
    });

    test('should handle valid task IDs', async () => {
      const variations = [
        {
          input: 'task 123',
          expected: 'task #123'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle task ID ranges', async () => {
      const variations = [
        {
          input: 'task 1',
          expected: 'task #1'
        },
        {
          input: 'task 100',
          expected: 'task #100'
        },
        {
          input: 'task 999999',
          expected: 'task #999999'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task IDs', async () => {
      const invalidIds = [
        'task 0',
        'task -1',
        'task 1.5',
        'task abc',
        'task !@#'
      ];

      for (const input of invalidIds) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed references', async () => {
      const malformed = [
        'task',
        'task #',
        'task#',
        'task ##123',
        'task # 123'
      ];

      for (const input of malformed) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = perfect.validateTaskId;

      // Replace with mock that throws
      perfect.validateTaskId = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await perfect('task 123');
        expect(result).toEqual({
          text: 'task 123',
          corrections: []
        });
      } finally {
        // Restore original function
        perfect.validateTaskId = originalValidate;
      }
    });
  });
});
