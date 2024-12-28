import { name, parse } from '../../src/services/parser/parsers/date.js';

describe('Date Parser', () => {
  describe('Return Format', () => {
    test('should return object with date key', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result).toHaveProperty('date');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.date).toEqual(expect.objectContaining({
        value: expect.any(String),
        format: expect.any(String),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should parse natural language dates', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.date).toEqual(expect.objectContaining({
        value: '2024-01-20',
        format: 'natural'
      }));
    });

    test('should parse relative dates', async () => {
      const result = await parse('tomorrow');
      expect(result.date.format).toBe('relative');
      expect(result.date.value).toBeDefined();
    });

    test('should parse weekday references', async () => {
      const result = await parse('next Wednesday');
      expect(result.date.format).toBe('weekday');
      expect(result.date.value).toBeDefined();
    });

    test('should parse period references', async () => {
      const result = await parse('in 2 weeks');
      expect(result.date.format).toBe('relative');
      expect(result.date.value).toBeDefined();
    });

    test('should parse next period references', async () => {
      const result = await parse('next month');
      expect(result.date.format).toBe('relative');
      expect(result.date.value).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid month names', async () => {
      const result = await parse('on Jannuary 20th, 2024');
      expect(result).toBeNull();
    });

    test('should handle invalid day numbers', async () => {
      const result = await parse('on January 32nd, 2024');
      expect(result).toBeNull();
    });

    test('should handle invalid year formats', async () => {
      const result = await parse('on January 20th, 202');
      expect(result).toBeNull();
    });

    test('should handle malformed natural date strings', async () => {
      const invalidDates = [
        'on the January',
        'January 2024',
        '20th January',
        'January 20th two thousand twenty four'
      ];

      for (const date of invalidDates) {
        const result = await parse(date);
        expect(result).toBeNull();
      }
    });
  });

  describe('Date Calculations', () => {
    test('should calculate next weekday correctly', async () => {
      const result = await parse('next Wednesday');
      expect(result.date.value).toBeDefined();
      const date = new Date(result.date.value);
      expect(date.getDay()).toBe(3); // Wednesday is day 3
      expect(date > new Date()).toBe(true); // Should be in the future
    });

    test('should handle relative date calculations', async () => {
      const result = await parse('tomorrow');
      expect(result.date.value).toBeDefined();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.date.value).toBe(tomorrow.toISOString().split('T')[0]);
    });

    test('should handle period calculations', async () => {
      const result = await parse('in 2 weeks');
      expect(result.date.value).toBeDefined();
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      expect(result.date.value).toBe(twoWeeks.toISOString().split('T')[0]);
    });
  });

});
