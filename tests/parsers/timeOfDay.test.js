import { name, parse } from '../../src/services/parser/parsers/timeOfDay.js';

describe('TimeOfDay Parser', () => {
  describe('Input Validation', () => {
    test('should handle null input', async () => {
      const result = await parse(null);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle empty string', async () => {
      const result = await parse('');
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit time markers', async () => {
      const result = await parse('Meeting at [time:14:30]');
      expect(result).toEqual({
        type: 'timeofday',
        value: {
          hour: 14,
          minute: 30,
          format: '24h'
        },
        metadata: {
          pattern: 'explicit_time',
          confidence: 0.95,
          originalMatch: '[time:14:30]'
        }
      });
    });

    test('should detect 12-hour format times', async () => {
      const result = await parse('Meeting at 2:30 PM');
      expect(result).toEqual({
        type: 'timeofday',
        value: {
          hour: 14,
          minute: 30,
          format: '12h',
          period: 'PM'
        },
        metadata: {
          pattern: '12h_time',
          confidence: 0.9,
          originalMatch: '2:30 PM'
        }
      });
    });

    test('should detect natural time expressions', async () => {
      const result = await parse('Meeting in the afternoon');
      expect(result).toEqual({
        type: 'timeofday',
        value: {
          period: 'afternoon',
          approximate: true
        },
        metadata: {
          pattern: 'natural_time',
          confidence: 0.8,
          originalMatch: 'afternoon'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit times', async () => {
      const result = await parse('[time:14:30]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for approximate times', async () => {
      const result = await parse('in the evening');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid time format', async () => {
      const result = await parse('[time:25:00]');
      expect(result).toBeNull();
    });

    test('should handle invalid period format', async () => {
      const result = await parse('3:00 XX');
      expect(result).toBeNull();
    });
  });
});
