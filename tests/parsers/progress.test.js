import { name, perfect } from '../../src/services/parser/parsers/progress.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Progress Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('Task is 75% complete');
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
      const result = await perfect('Task is 75% complete');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'progress',
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
    test('should handle percentage patterns', async () => {
      const variations = [
        {
          input: 'Task is 50% complete',
          expected: 'Task is 50% complete'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle various completion terms', async () => {
      const variations = [
        {
          input: '25% complete',
          expected: '25% complete'
        },
        {
          input: '50% done',
          expected: '50% complete'
        },
        {
          input: '75% finished',
          expected: '75% complete'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle progress in context', async () => {
      const variations = [
        {
          input: 'Project is now 30% complete',
          expected: 'Project is now 30% complete'
        },
        {
          input: 'Task progress: 45% done',
          expected: 'Task progress: 45% complete'
        },
        {
          input: 'Development is 60% finished',
          expected: 'Development is 60% complete'
        },
        {
          input: 'Implementation: 75% complete',
          expected: 'Implementation: 75% complete'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Percentage Validation', () => {
    test('should handle valid percentage range', async () => {
      const variations = [
        {
          input: '0% complete',
          expected: '0% complete'
        },
        {
          input: '25% complete',
          expected: '25% complete'
        },
        {
          input: '50% complete',
          expected: '50% complete'
        },
        {
          input: '75% complete',
          expected: '75% complete'
        },
        {
          input: '100% complete',
          expected: '100% complete'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle invalid percentages', async () => {
      const invalidPercentages = [
        '-10% complete',
        '101% complete',
        '150% complete',
        'abc% complete'
      ];

      for (const input of invalidPercentages) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed percentages', async () => {
      const malformed = [
        '% complete',
        'percent complete',
        '75 percent complete',
        '75%% complete'
      ];

      for (const input of malformed) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle missing completion terms', async () => {
      const missing = [
        '75%',
        '75% of',
        '75% the',
        '75% in'
      ];

      for (const input of missing) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle invalid formats', async () => {
      const invalid = [
        'complete 75%',
        'done 75%',
        'finished 75%',
        '75 complete%'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });
  });
});
