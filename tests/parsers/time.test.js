import { name, perfect } from '../../src/services/parser/parsers/time.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Time Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('at 2:30pm');
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
      const result = await perfect('at 2:30pm');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'time_standardization',
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

  describe('Text Improvement', () => {
    test('should convert 12-hour to 24-hour format', async () => {
      const times = [
        { input: '2:30pm', expected: '14:30' },
        { input: '12:00am', expected: '00:00' },
        { input: '12:00pm', expected: '12:00' },
        { input: '11:59pm', expected: '23:59' }
      ];

      for (const { input, expected } of times) {
        const result = await perfect(`Meeting at ${input}`);
        expect(result.text).toBe(`Meeting at ${expected}`);
        expect(result.corrections[0]).toEqual(expect.objectContaining({
          original: input,
          correction: expected,
          confidence: Confidence.HIGH
        }));
      }
    });

    test('should standardize time periods with ranges', async () => {
      const periods = [
        { input: 'in the morning', expected: 'in the morning (09:00-12:00)' },
        { input: 'in the afternoon', expected: 'in the afternoon (12:00-17:00)' },
        { input: 'in the evening', expected: 'in the evening (17:00-21:00)' }
      ];

      for (const { input, expected } of periods) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0]).toEqual(expect.objectContaining({
          original: input,
          correction: expected,
          confidence: Confidence.MEDIUM
        }));
      }
    });

    test('should add leading zeros to hours and minutes', async () => {
      const times = [
        { input: '2pm', expected: '14:00' },
        { input: '9:5am', expected: '09:05' },
        { input: '2:5pm', expected: '14:05' }
      ];

      for (const { input, expected } of times) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });
  });

  describe('Position Tracking', () => {
    test('should track position of changes at start of text', async () => {
      const result = await perfect('2pm meeting');
      expect(result.corrections[0].position).toEqual({
        start: 0,
        end: '2pm'.length
      });
    });

    test('should track position of changes with leading text', async () => {
      const result = await perfect('Meeting at 2pm');
      expect(result.corrections[0].position).toEqual({
        start: 'Meeting at '.length,
        end: 'Meeting at 2pm'.length
      });
    });

    test('should preserve surrounding text', async () => {
      const result = await perfect('URGENT: Meeting at 2pm!');
      expect(result.text).toBe('URGENT: Meeting at 14:00!');
    });
  });

  describe('Confidence Levels', () => {
    test('should assign HIGH confidence to specific times', async () => {
      const result = await perfect('2:30pm');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should assign MEDIUM confidence to time periods with context', async () => {
      const result = await perfect('in the morning');
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
    });

    test('should assign LOW confidence to ambiguous periods', async () => {
      const result = await perfect('morning');
      expect(result.corrections[0].confidence).toBe(Confidence.LOW);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time values', async () => {
      const invalidTimes = [
        '25:00',  // Invalid hour
        '14:60',  // Invalid minute
        '-1:30',  // Negative hour
        '14:-30', // Negative minute
        'abc:30', // Non-numeric hour
        '14:def'  // Non-numeric minute
      ];

      for (const time of invalidTimes) {
        const result = await perfect(`at ${time}`);
        expect(result).toEqual({
          text: `at ${time}`,
          corrections: []
        });
      }
    });

    test('should handle invalid period names', async () => {
      const invalidPeriods = [
        'in the middlenight',
        'in the noontime',
        'in the daybreak'
      ];

      for (const period of invalidPeriods) {
        const result = await perfect(period);
        expect(result).toEqual({
          text: period,
          corrections: []
        });
      }
    });
  });

  describe('Complex Cases', () => {
    test('should handle multiple time references', async () => {
      const result = await perfect('Meeting from 9am to 2pm');
      expect(result.text).toBe('Meeting from 09:00 to 14:00');
      expect(result.corrections).toHaveLength(2);
    });

    test('should handle times with context', async () => {
      const result = await perfect('Urgent meeting at 2pm about project alpha');
      expect(result.text).toBe('Urgent meeting at 14:00 about project alpha');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should preserve text formatting', async () => {
      const result = await perfect('URGENT: Meeting at 2pm!');
      expect(result.text).toBe('URGENT: Meeting at 14:00!');
    });

    test('should not match numbers in date contexts', async () => {
      const inputs = [
        "in 2 weeks",
        "2 days from now",
        "2 months",
        "2nd of March"
      ];

      for (const input of inputs) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });
  });
});
