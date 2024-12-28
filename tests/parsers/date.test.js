import { name, perfect } from '../../src/services/parser/parsers/date.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Date Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('on January 20th, 2024');
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
      const result = await perfect('on January 20th, 2024');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'date_standardization',
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
    test('should standardize natural language dates', async () => {
      const result = await perfect('on Jan 20th, 2024');
      expect(result.text).toBe('on January 20, 2024');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        original: 'on Jan 20th, 2024',
        correction: 'January 20, 2024',
        confidence: Confidence.HIGH
      }));
    });

    test('should convert relative dates to absolute', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const result = await perfect('tomorrow');
      const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][tomorrow.getDay()];
      const month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][tomorrow.getMonth()];
      
      expect(result.text).toBe(`${weekday}, ${month} ${tomorrow.getDate()}, ${tomorrow.getFullYear()}`);
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
    });

    test('should convert weekday references to absolute dates', async () => {
      const result = await perfect('next Wednesday');
      expect(result.text).toMatch(/^Wednesday, [A-Z][a-z]+ \d{1,2}, \d{4}$/);
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
    });

    test('should handle implicit dates', async () => {
      const result = await perfect('sometime next week');
      expect(result.text).toMatch(/^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4}$/);
      expect(result.corrections[0].confidence).toBe(Confidence.LOW);
    });
  });

  describe('Position Tracking', () => {
    test('should track position of changes at start of text', async () => {
      const text = 'tomorrow at 2pm';
      const result = await perfect(text);
      expect(result.corrections[0].position).toEqual({
        start: 0,
        end: 'tomorrow'.length
      });
    });

    test('should track position of changes with leading text', async () => {
      const result = await perfect('Meeting tomorrow');
      expect(result.corrections[0].position).toEqual({
        start: 'Meeting '.length,
        end: 'Meeting tomorrow'.length
      });
    });

    test('should preserve surrounding text', async () => {
      const result = await perfect('Meeting tomorrow at 2pm');
      expect(result.text).toMatch(/^Meeting [A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4} at 2pm$/);
    });
  });

  describe('Confidence Levels', () => {
    test('should assign HIGH confidence to natural dates', async () => {
      const result = await perfect('January 20, 2024');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should assign MEDIUM confidence to relative dates', async () => {
      const result = await perfect('tomorrow');
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
    });

    test('should assign MEDIUM confidence to weekday references', async () => {
      const result = await perfect('next Wednesday');
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
    });

    test('should assign LOW confidence to implicit dates', async () => {
      const result = await perfect('sometime next week');
      expect(result.corrections[0].confidence).toBe(Confidence.LOW);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid month names', async () => {
      const text = 'on Jannuary 20th, 2024';
      const result = await perfect(text);
      expect(result).toEqual({
        text,
        corrections: []
      });
    });

    test('should handle invalid day numbers', async () => {
      const text = 'on January 32nd, 2024';
      const result = await perfect(text);
      expect(result).toEqual({
        text,
        corrections: []
      });
    });

    test('should handle invalid year formats', async () => {
      const text = 'on January 20th, 202';
      const result = await perfect(text);
      expect(result).toEqual({
        text,
        corrections: []
      });
    });

    test('should handle malformed date strings', async () => {
      const invalidDates = [
        'on the January',
        'January 2024',
        '20th January',
        'January 20th two thousand twenty four'
      ];

      for (const date of invalidDates) {
        const result = await perfect(date);
        expect(result).toEqual({
          text: date,
          corrections: []
        });
      }
    });
  });

  describe('Complex Cases', () => {
    test('should handle multiple date references', async () => {
      const result = await perfect('Meeting tomorrow and next Wednesday');
      expect(result.corrections).toHaveLength(2);
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      expect(result.corrections[1].confidence).toBe(Confidence.MEDIUM);
    });

    test('should handle dates with context', async () => {
      const result = await perfect('Urgent meeting tomorrow about project alpha');
      expect(result.text).toMatch(/Urgent meeting [A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4} about project alpha/);
    });

    test('should preserve text formatting', async () => {
      const result = await perfect('URGENT: Meeting tomorrow!');
      expect(result.text).toMatch(/URGENT: Meeting [A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4}!/);
    });
  });
});
