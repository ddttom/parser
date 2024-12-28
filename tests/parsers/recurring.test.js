import { name, parse } from '../../src/services/parser/parsers/recurring.js';

describe('Recurring Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[recur:daily]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[recur:daily]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit recurring markers', async () => {
      const result = await parse('[recur:daily]');
      expect(result.value).toEqual({
        type: 'day',
        interval: 1,
        end: null
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[recur:daily]');
    });

    test('should detect recurring with parameters', async () => {
      const result = await parse('[recur:daily(skip=weekends)]');
      expect(result.value).toEqual({
        type: 'day',
        interval: 1,
        excludeWeekends: true,
        end: null
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[recur:daily(skip=weekends)]');
    });

    test('should detect business days pattern', async () => {
      const result = await parse('every business day');
      expect(result.value).toEqual({
        type: 'business',
        interval: 1,
        excludeWeekends: true,
        end: null
      });
      expect(result.metadata.pattern).toBe('business');
      expect(result.metadata.originalMatch).toBe('every business day');
    });

    test('should detect weekday pattern', async () => {
      const result = await parse('every monday');
      expect(result.value).toEqual({
        type: 'specific',
        day: 'monday',
        dayIndex: 1,
        interval: 1,
        end: null
      });
      expect(result.metadata.pattern).toBe('weekday');
      expect(result.metadata.originalMatch).toBe('every monday');
    });

    test('should detect interval patterns', async () => {
      const intervals = [
        { input: 'every hour', type: 'hour' },
        { input: 'every day', type: 'day' },
        { input: 'every week', type: 'week' },
        { input: 'every month', type: 'month' }
      ];

      for (const { input, type } of intervals) {
        const result = await parse(input);
        expect(result.value.type).toBe(type);
        expect(result.value.interval).toBe(1);
        expect(result.metadata.pattern).toBe('interval');
        expect(result.metadata.originalMatch).toBe(input);
      }
    });

    test('should detect multiple interval pattern', async () => {
      const result = await parse('every 2 weeks');
      expect(result.value).toEqual({
        type: 'week',
        interval: 2,
        end: null
      });
      expect(result.metadata.pattern).toBe('interval');
      expect(result.metadata.originalMatch).toBe('every 2 weeks');
    });
  });

  describe('End Conditions', () => {
    test('should extract count end condition', async () => {
      const result = await parse('every day for 5 times');
      expect(result.value.end).toEqual({
        type: 'count',
        value: 5
      });
      expect(result.metadata.includesEndCondition).toBe(true);
      expect(result.metadata.originalMatch).toBe('every day for 5 times');
    });

    test('should extract date end condition', async () => {
      const result = await parse('every week until December 31');
      expect(result.value.end).toEqual({
        type: 'until',
        value: 'December 31'
      });
      expect(result.metadata.includesEndCondition).toBe(true);
      expect(result.metadata.originalMatch).toBe('every week until December 31');
    });

    test('should prioritize count over date when both present', async () => {
      const result = await parse('every month for 3 times until December 31');
      expect(result.value.end).toEqual({
        type: 'count',
        value: 3
      });
      expect(result.metadata.originalMatch).toBe('every month for 3 times until December 31');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid recurring format', async () => {
      const result = await parse('[recur:]');
      expect(result).toBeNull();
    });

    test('should handle empty recurring value', async () => {
      const result = await parse('[recur: ]');
      expect(result).toBeNull();
    });

    test('should handle invalid interval values', async () => {
      const invalidIntervals = [
        'every 0 days',
        'every -1 days',
        'every 1.5 days'
      ];

      for (const interval of invalidIntervals) {
        const result = await parse(interval);
        expect(result).toEqual({
          type: 'error',
          error: 'PARSER_ERROR',
          message: 'Invalid interval value'
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
        expect(result.value.end).toBeNull();
      }
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[recur:daily()]',
        '[recur:daily(skip)]',
        '[recur:daily(skip=)]',
        '[recur:daily(=weekends)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });
  });
});
