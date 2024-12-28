import { name, parse } from '../../src/services/parser/parsers/duration.js';

describe('Duration Parser', () => {
  describe('Return Format', () => {
    test('should return object with duration key', async () => {
      const result = await parse('takes 2 hours and 30 minutes');
      expect(result).toHaveProperty('duration');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('takes 2 hours and 30 minutes');
      const expectedProps = {
        hours: expect.any(Number),
        minutes: expect.any(Number),
        totalMinutes: expect.any(Number),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.duration).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect natural duration expressions', async () => {
      const variations = [
        'takes about 2 hours and 30 minutes',
        'duration is 2 hours and 30 minutes',
        'takes 2 hours 30 minutes'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.duration).toMatchObject({
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        });
      }
    });

    test('should detect short duration formats', async () => {
      const variations = [
        { input: '2.5h', hours: 2, minutes: 30 },
        { input: '1.75h', hours: 1, minutes: 45 },
        { input: '0.5h', hours: 0, minutes: 30 }
      ];

      for (const { input, hours, minutes } of variations) {
        const result = await parse(input);
        expect(result.duration).toMatchObject({
          hours,
          minutes,
          totalMinutes: hours * 60 + minutes
        });
      }
    });

    test('should detect minutes only format', async () => {
      const variations = [
        { input: '90m', hours: 1, minutes: 30 },
        { input: '45m', hours: 0, minutes: 45 },
        { input: '120m', hours: 2, minutes: 0 }
      ];

      for (const { input, hours, minutes } of variations) {
        const result = await parse(input);
        expect(result.duration).toMatchObject({
          hours,
          minutes,
          totalMinutes: hours * 60 + minutes
        });
      }
    });
  });

  describe('Natural Language Variations', () => {
    test('should handle hours only', async () => {
      const variations = [
        'takes 2 hours',
        'duration is 2 hours',
        'about 2 hours'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.duration).toMatchObject({
          hours: 2,
          minutes: 0,
          totalMinutes: 120
        });
      }
    });

    test('should handle minutes only', async () => {
      const variations = [
        'takes 45 minutes',
        'duration is 45 minutes',
        'about 45 minutes'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.duration).toMatchObject({
          hours: 0,
          minutes: 45,
          totalMinutes: 45
        });
      }
    });

    test('should handle combined hours and minutes', async () => {
      const variations = [
        'takes 1 hour and 30 minutes',
        'duration is 1 hour 30 minutes',
        'about 1 hour and 30 minutes'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.duration).toMatchObject({
          hours: 1,
          minutes: 30,
          totalMinutes: 90
        });
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
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed expressions', async () => {
      const malformed = [
        'takes hours',
        'duration is minutes',
        'about and minutes'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
