import { name, perfect } from '../../src/services/parser/parsers/recurring.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Recurring Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('every day');
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
      const result = await perfect('every day');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'recurring',
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
    test('should handle business days pattern', async () => {
      const variations = [
        {
          input: 'every business day',
          expected: 'every business day'
        },
        {
          input: 'each business day',
          expected: 'every business day'
        },
        {
          input: 'every working day',
          expected: 'every business day'
        },
        {
          input: 'each work day',
          expected: 'every business day'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle weekday pattern', async () => {
      const weekdays = [
        {
          input: 'every monday',
          expected: 'every monday'
        },
        {
          input: 'every tuesday',
          expected: 'every tuesday'
        },
        {
          input: 'every wednesday',
          expected: 'every wednesday'
        },
        {
          input: 'every thursday',
          expected: 'every thursday'
        },
        {
          input: 'every friday',
          expected: 'every friday'
        },
        {
          input: 'every saturday',
          expected: 'every saturday'
        },
        {
          input: 'every sunday',
          expected: 'every sunday'
        }
      ];

      for (const { input, expected } of weekdays) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle basic intervals', async () => {
      const intervals = [
        {
          input: 'every hour',
          expected: 'every hour'
        },
        {
          input: 'every day',
          expected: 'every day'
        },
        {
          input: 'every week',
          expected: 'every week'
        },
        {
          input: 'every month',
          expected: 'every month'
        }
      ];

      for (const { input, expected } of intervals) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle custom intervals', async () => {
      const intervals = [
        {
          input: 'every 2 hours',
          expected: 'every 2 hours'
        },
        {
          input: 'every 3 days',
          expected: 'every 3 days'
        },
        {
          input: 'every 2 weeks',
          expected: 'every 2 weeks'
        },
        {
          input: 'every 6 months',
          expected: 'every 6 months'
        }
      ];

      for (const { input, expected } of intervals) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });
  });

  describe('End Conditions', () => {
    test('should handle count end condition', async () => {
      const variations = [
        {
          input: 'every day for 5 times',
          expected: 'every day for 5 times'
        },
        {
          input: 'every week for 3 times',
          expected: 'every week for 3 times'
        },
        {
          input: 'every month for 12 times',
          expected: 'every month for 12 times'
        },
        {
          input: 'every business day for 20 times',
          expected: 'every business day for 20 times'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });

    test('should handle date end condition', async () => {
      const variations = [
        {
          input: 'every day until December 31',
          expected: 'every day until December 31'
        },
        {
          input: 'every week until next Friday',
          expected: 'every week until next Friday'
        },
        {
          input: 'every month until year end',
          expected: 'every month until year end'
        },
        {
          input: 'every business day until project completion',
          expected: 'every business day until project completion'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });

    test('should prioritize count over date when both present', async () => {
      const variations = [
        {
          input: 'every month for 3 times until December 31',
          expected: 'every month for 3 times'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid interval values', async () => {
      const invalidIntervals = [
        'every 0 days',
        'every -1 days',
        'every 1.5 days'
      ];

      for (const input of invalidIntervals) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle invalid end count values', async () => {
      const invalidCounts = [
        'every day for 0 times',
        'every day for -1 times',
        'every day for 1.5 times'
      ];

      for (const input of invalidCounts) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed patterns', async () => {
      const malformed = [
        'every',
        'every the day',
        'each the week',
        'every 1.5.2 days',
        'every . days'
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
