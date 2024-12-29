import { name, perfect } from '../../src/services/parser/parsers/contexts.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Contexts Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('at the office');
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
      const result = await perfect('at the office');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'context',
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
    test('should handle @ symbol contexts', async () => {
      const variations = [
        {
          input: 'Task @home',
          expected: 'Task @home'
        },
        {
          input: 'Working @office',
          expected: 'Working @office'
        },
        {
          input: 'Using @computer',
          expected: 'Using @computer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle multiple @ contexts', async () => {
      const variations = [
        {
          input: 'Task @home @computer',
          expected: 'Task @home @computer'
        },
        {
          input: '@office @morning @computer',
          expected: '@office @morning @computer'
        },
        {
          input: '@home @evening @computer',
          expected: '@home @evening @computer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle parameterized contexts', async () => {
      const variations = [
        {
          input: '@office(desk)',
          expected: '@office(desk)'
        },
        {
          input: '@home(study)',
          expected: '@home(study)'
        },
        {
          input: '@computer(laptop)',
          expected: '@computer(laptop)'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle natural language contexts', async () => {
      const variations = [
        {
          input: 'at the office',
          expected: '@office'
        },
        {
          input: 'in the morning',
          expected: '@morning'
        },
        {
          input: 'while at home',
          expected: '@home'
        },
        {
          input: 'during afternoon',
          expected: '@afternoon'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });
  });

  describe('Context Types', () => {
    test('should handle location contexts', async () => {
      const variations = [
        {
          input: '@home',
          expected: '@home'
        },
        {
          input: '@office',
          expected: '@office'
        },
        {
          input: 'at the office',
          expected: '@office'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });

    test('should handle tool contexts', async () => {
      const variations = [
        {
          input: '@computer',
          expected: '@computer'
        },
        {
          input: 'using computer',
          expected: '@computer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });

    test('should handle time contexts', async () => {
      const variations = [
        {
          input: '@morning',
          expected: '@morning'
        },
        {
          input: '@afternoon',
          expected: '@afternoon'
        },
        {
          input: '@evening',
          expected: '@evening'
        },
        {
          input: 'in the morning',
          expected: '@morning'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid @ contexts', async () => {
      const invalid = [
        '@',
        '@ ',
        '@123',
        '@!invalid'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle invalid parameters', async () => {
      const invalid = [
        '@office()',
        '@home()',
        '@computer(  )'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed expressions', async () => {
      const malformed = [
        'at the',
        'in',
        'during the',
        'while at'
      ];

      for (const input of malformed) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });
  });
});
