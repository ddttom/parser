import { name, perfect } from '../../src/services/parser/parsers/reminders.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Reminders Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('remind me in 30 minutes');
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
      const result = await perfect('remind me in 30 minutes');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'reminder',
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
    test('should handle relative time reminders', async () => {
      const variations = [
        {
          input: 'in 30 minutes',
          expected: 'in 30 minutes'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle various time units', async () => {
      const variations = [
        {
          input: 'in 1 hour',
          expected: 'in 1 hour'
        },
        {
          input: 'in 2 days',
          expected: 'in 2 days'
        },
        {
          input: 'in 1 week',
          expected: 'in 1 week'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle before-event reminders', async () => {
      const variations = [
        {
          input: '30 minutes before',
          expected: '30 minutes before'
        },
        {
          input: '1 hour before',
          expected: '1 hour before'
        },
        {
          input: '2 days before',
          expected: '2 days before'
        },
        {
          input: '1 week before',
          expected: '1 week before'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle specific time reminders', async () => {
      const variations = [
        {
          input: 'remind me at 2:30pm',
          expected: 'remind me at 2:30pm'
        },
        {
          input: 'remind me at 9:00am',
          expected: 'remind me at 9:00am'
        },
        {
          input: 'remind me at 12:00pm',
          expected: 'remind me at 12:00pm'
        },
        {
          input: 'remind me at 12:00am',
          expected: 'remind me at 12:00am'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle date-based reminders', async () => {
      const variations = [
        {
          input: 'remind me on Monday',
          expected: 'remind me on Monday'
        },
        {
          input: 'remind me on next Friday',
          expected: 'remind me on next Friday'
        },
        {
          input: 'remind me on December 25',
          expected: 'remind me on December 25'
        },
        {
          input: 'remind me on next week',
          expected: 'remind me on next week'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should handle time word reminders', async () => {
      const variations = [
        {
          input: 'remind me tomorrow',
          expected: 'remind me tomorrow'
        },
        {
          input: 'remind me next week',
          expected: 'remind me next week'
        },
        {
          input: 'remind me next month',
          expected: 'remind me next month'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });
  });

  describe('Time Format Handling', () => {
    test('should handle 12-hour format', async () => {
      const variations = [
        {
          input: 'remind me at 12:00am',
          expected: 'remind me at 12:00am'
        },
        {
          input: 'remind me at 12:00pm',
          expected: 'remind me at 12:00pm'
        },
        {
          input: 'remind me at 1:00pm',
          expected: 'remind me at 1:00pm'
        },
        {
          input: 'remind me at 11:30pm',
          expected: 'remind me at 11:30pm'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle missing minutes', async () => {
      const variations = [
        {
          input: 'remind me at 3pm',
          expected: 'remind me at 3:00pm'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle plural and singular units', async () => {
      const variations = [
        {
          input: 'in 1 hour',
          expected: 'in 1 hour'
        },
        {
          input: 'in 2 hours',
          expected: 'in 2 hours'
        },
        {
          input: 'in 1 day',
          expected: 'in 1 day'
        },
        {
          input: 'in 2 days',
          expected: 'in 2 days'
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
      const invalidTimes = [
        'remind me at 25:00',
        'remind me at -1:30',
        'remind me at 12:60'
      ];

      for (const input of invalidTimes) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle invalid time units', async () => {
      const invalidUnits = [
        'in 0 minutes',
        'in -1 hours',
        'in 1.5 days'
      ];

      for (const input of invalidUnits) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed patterns', async () => {
      const malformed = [
        'remind at',
        'remind in',
        'remind on',
        'in minutes',
        'at time'
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
