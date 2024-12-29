import { name, perfect } from '../../src/services/parser/parsers/timeOfDay.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('TimeOfDay Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('2:30 PM');
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
      const result = await perfect('2:30 PM');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'timeofday',
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
    test('should handle 12-hour format times', async () => {
      const variations = [
        {
          input: 'Meeting at 2:30 PM',
          expected: 'Meeting at 2:30 PM'
        },
        {
          input: 'Meeting at 12:00 AM',
          expected: 'Meeting at 12:00 AM'
        },
        {
          input: 'Meeting at 12:00 PM',
          expected: 'Meeting at 12:00 PM'
        },
        {
          input: 'Meeting at 11:59 PM',
          expected: 'Meeting at 11:59 PM'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle natural time expressions', async () => {
      const variations = [
        {
          input: 'Meeting in the morning',
          expected: 'Meeting in the morning (6:00-11:00)'
        },
        {
          input: 'Meeting in the afternoon',
          expected: 'Meeting in the afternoon (12:00-17:00)'
        },
        {
          input: 'Meeting in the evening',
          expected: 'Meeting in the evening (18:00-21:00)'
        },
        {
          input: 'Meeting in the night',
          expected: 'Meeting in the night (22:00-5:00)'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Time Format Handling', () => {
    test('should handle period variations', async () => {
      const variations = [
        {
          input: 'Meeting at 2:30 PM',
          expected: 'Meeting at 2:30 PM'
        },
        {
          input: 'Meeting at 2:30 pm',
          expected: 'Meeting at 2:30 PM'
        },
        {
          input: 'Meeting at 2:30 p.m.',
          expected: 'Meeting at 2:30 PM'
        },
        {
          input: 'Meeting at 2:30 P.M.',
          expected: 'Meeting at 2:30 PM'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle natural period variations', async () => {
      const variations = [
        {
          input: 'in the morning',
          expected: 'in the morning (6:00-11:00)'
        },
        {
          input: 'during the afternoon',
          expected: 'in the afternoon (12:00-17:00)'
        },
        {
          input: 'in evening',
          expected: 'in the evening (18:00-21:00)'
        },
        {
          input: 'at night',
          expected: 'in the night (22:00-5:00)'
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
        '13:00 PM',  // Invalid hour for 12-hour format
        '12:60 AM',  // Invalid minutes
        '0:00 PM',   // Invalid hour for 12-hour format
        '24:00 PM'   // Invalid hour
      ];

      for (const input of invalidTimes) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle invalid period names', async () => {
      const invalidPeriods = [
        'in the middlenight',
        'in the noontime',
        'in the daybreak',
        'in the midnight',
        'at dawn'
      ];

      for (const input of invalidPeriods) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed time formats', async () => {
      const malformed = [
        '2:PM',      // Missing minutes
        '2: PM',     // Space after colon
        '2 :30 PM',  // Space before colon
        '2.30 PM',   // Period instead of colon
        '2-30 PM'    // Hyphen instead of colon
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
