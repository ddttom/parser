import { name, parse } from '../../src/services/parser/parsers/duration.js';

describe('Duration Parser', () => {
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
    test('should detect explicit duration markers', async () => {
      const result = await parse('Task takes [duration:2h30m]');
      expect(result).toEqual({
        type: 'duration',
        value: {
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        },
        metadata: {
          pattern: 'explicit_duration',
          confidence: 0.95,
          originalMatch: '[duration:2h30m]'
        }
      });
    });

    test('should detect natural duration expressions', async () => {
      const result = await parse('Takes about 2 hours and 30 minutes');
      expect(result).toEqual({
        type: 'duration',
        value: {
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        },
        metadata: {
          pattern: 'natural',
          confidence: 0.8,
          originalMatch: '2 hours and 30 minutes'
        }
      });
    });

    test('should detect short duration formats', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result).toEqual({
        type: 'duration',
        value: {
          hours: 2,
          minutes: 30,
          totalMinutes: 150
        },
        metadata: {
          pattern: 'short_duration',
          confidence: 0.9,
          originalMatch: '2.5h'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit durations', async () => {
      const result = await parse('[duration:2h]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for natural durations', async () => {
      const result = await parse('takes about 30 minutes');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid duration format', async () => {
      const result = await parse('[duration:]');
      expect(result).toBeNull();
    });

    test('should handle invalid time values', async () => {
      const result = await parse('[duration:25h]');
      expect(result).toBeNull();
    });
  });
});
