import { name, parse } from '../../src/services/parser/parsers/date.js';

describe('Date Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.type).toBe(name);
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should parse natural language dates', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.value).toEqual({
        date: '2024-01-20',
        format: 'natural'
      });
    });

    test('should parse relative dates', async () => {
      const result = await parse('tomorrow');
      expect(result.value.format).toBe('relative');
      expect(result.value.date).toBeDefined();
    });

    test('should parse weekday references', async () => {
      const result = await parse('next Wednesday');
      expect(result.value.format).toBe('weekday');
      expect(result.value.date).toBeDefined();
    });

    test('should parse period references', async () => {
      const result = await parse('in 2 weeks');
      expect(result.value.format).toBe('relative');
      expect(result.value.date).toBeDefined();
    });

    test('should parse next period references', async () => {
      const result = await parse('next month');
      expect(result.value.format).toBe('relative');
      expect(result.value.date).toBeDefined();
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
      expect(result.value.date).toBeDefined();
      const date = new Date(result.value.date);
      expect(date.getDay()).toBe(3); // Wednesday is day 3
      expect(date > new Date()).toBe(true); // Should be in the future
    });

    test('should handle relative date calculations', async () => {
      const result = await parse('tomorrow');
      expect(result.value.date).toBeDefined();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.value.date).toBe(tomorrow.toISOString().split('T')[0]);
    });

    test('should handle period calculations', async () => {
      const result = await parse('in 2 weeks');
      expect(result.value.date).toBeDefined();
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      expect(result.value.date).toBe(twoWeeks.toISOString().split('T')[0]);
    });
  });

});
