import { name, perfect } from '../../src/services/parser/parsers/duration.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Duration Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('takes 2 hours and 30 minutes');
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
      const result = await perfect('takes 2 hours and 30 minutes');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'duration',
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
    test('should handle natural duration expressions', async () => {
      const variations = [
        {
          input: 'takes about 2 hours and 30 minutes',
          expected: 'takes 2h 30m'
        },
        {
          input: 'duration is 2 hours and 30 minutes',
          expected: 'duration is 2h 30m'
        },
        {
          input: 'takes 2 hours 30 minutes',
          expected: 'takes 2h 30m'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle short duration formats', async () => {
      const variations = [
        {
          input: '2.5h',
          expected: '2h 30m'
        },
        {
          input: '1.75h',
          expected: '1h 45m'
        },
        {
          input: '0.5h',
          expected: '30m'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle minutes only format', async () => {
      const variations = [
        {
          input: '90m',
          expected: '1h 30m'
        },
        {
          input: '45m',
          expected: '45m'
        },
        {
          input: '120m',
          expected: '2h'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Natural Language Variations', () => {
    test('should handle hours only', async () => {
      const variations = [
        {
          input: 'takes 2 hours',
          expected: 'takes 2h'
        },
        {
          input: 'duration is 2 hours',
          expected: 'duration is 2h'
        },
        {
          input: 'about 2 hours',
          expected: 'about 2h'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle minutes only', async () => {
      const variations = [
        {
          input: 'takes 45 minutes',
          expected: 'takes 45m'
        },
        {
          input: 'duration is 45 minutes',
          expected: 'duration is 45m'
        },
        {
          input: 'about 45 minutes',
          expected: 'about 45m'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle combined hours and minutes', async () => {
      const variations = [
        {
          input: 'takes 1 hour and 30 minutes',
          expected: 'takes 1h 30m'
        },
        {
          input: 'duration is 1 hour 30 minutes',
          expected: 'duration is 1h 30m'
        },
        {
          input: 'about 1 hour and 30 minutes',
          expected: 'about 1h 30m'
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
    test('should handle invalid time values', async () => {
      const invalid = [
        'takes 25 hours',
        'duration is 60 minutes and 2 hours',
        'about -1 hours'
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
        'takes hours',
        'duration is minutes',
        'about and minutes'
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
