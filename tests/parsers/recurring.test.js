import { name, parse } from '../../src/services/parser/parsers/recurring.js';

describe('Recurring Parser', () => {
  describe('Return Format', () => {
    test('should return object with recurring key', async () => {
      const result = await parse('every day');
      expect(result).toHaveProperty('recurring');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('every day');
      expect(result.recurring).toEqual(expect.objectContaining({
        type: expect.any(String),
        interval: expect.any(Number),
        end: null,
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String),
        includesEndCondition: expect.any(Boolean)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should detect business days pattern', async () => {
      const variations = [
        'every business day',
        'each business day',
        'every working day',
        'each work day'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.recurring).toEqual(expect.objectContaining({
          type: 'business',
          interval: 1,
          excludeWeekends: true,
          end: null
        }));
      }
    });

    test('should detect weekday pattern', async () => {
      const weekdays = [
        { input: 'every monday', day: 'monday', index: 1 },
        { input: 'every tuesday', day: 'tuesday', index: 2 },
        { input: 'every wednesday', day: 'wednesday', index: 3 },
        { input: 'every thursday', day: 'thursday', index: 4 },
        { input: 'every friday', day: 'friday', index: 5 },
        { input: 'every saturday', day: 'saturday', index: 6 },
        { input: 'every sunday', day: 'sunday', index: 0 }
      ];

      for (const { input, day, index } of weekdays) {
        const result = await parse(input);
        expect(result.recurring).toEqual(expect.objectContaining({
          type: 'specific',
          day,
          dayIndex: index,
          interval: 1,
          end: null
        }));
      }
    });

    test('should detect basic intervals', async () => {
      const intervals = [
        { input: 'every hour', type: 'hour' },
        { input: 'every day', type: 'day' },
        { input: 'every week', type: 'week' },
        { input: 'every month', type: 'month' }
      ];

      for (const { input, type } of intervals) {
        const result = await parse(input);
        expect(result.recurring).toEqual(expect.objectContaining({
          type,
          interval: 1,
          end: null
        }));
      }
    });

    test('should detect custom intervals', async () => {
      const intervals = [
        { input: 'every 2 hours', type: 'hour', interval: 2 },
        { input: 'every 3 days', type: 'day', interval: 3 },
        { input: 'every 2 weeks', type: 'week', interval: 2 },
        { input: 'every 6 months', type: 'month', interval: 6 }
      ];

      for (const { input, type, interval } of intervals) {
        const result = await parse(input);
        expect(result.recurring).toEqual(expect.objectContaining({
          type,
          interval,
          end: null
        }));
      }
    });
  });

  describe('End Conditions', () => {
    test('should extract count end condition', async () => {
      const variations = [
        'every day for 5 times',
        'every week for 3 times',
        'every month for 12 times',
        'every business day for 20 times'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.recurring.end).toEqual({
          type: 'count',
          value: parseInt(input.match(/(\d+)\s+times/)[1], 10)
        });
      }
    });

    test('should extract date end condition', async () => {
      const variations = [
        'every day until December 31',
        'every week until next Friday',
        'every month until year end',
        'every business day until project completion'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.recurring.end).toEqual({
          type: 'until',
          value: input.split('until ')[1]
        });
      }
    });

    test('should prioritize count over date when both present', async () => {
      const input = 'every month for 3 times until December 31';
      const result = await parse(input);
      expect(result.recurring.end).toEqual({
        type: 'count',
        value: 3
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid interval values', async () => {
      const invalidIntervals = [
        'every 0 days',
        'every -1 days',
        'every 1.5 days'
      ];

      for (const interval of invalidIntervals) {
        const result = await parse(interval);
        expect(result).toEqual({
          recurring: {
            error: 'PARSER_ERROR',
            message: 'Invalid interval value'
          }
        });
      }
    });

    test('should handle invalid end count values', async () => {
      const invalidCounts = [
        'every day for 0 times',
        'every day for -1 times',
        'every day for 1.5 times'
      ];

      for (const count of invalidCounts) {
        const result = await parse(count);
        expect(result.recurring.end).toBeNull();
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
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
