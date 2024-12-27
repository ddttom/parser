import { name, parse } from '../../src/services/parser/parsers/location.js';

describe('Location Parser', () => {
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
    test('should detect explicit location markers', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result).toEqual({
        type: 'location',
        value: {
          name: 'Conference Room A',
          type: 'room'
        },
        metadata: {
          pattern: 'explicit_location',
          confidence: 0.95,
          originalMatch: '[location:Conference Room A]'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit locations', async () => {
      const result = await parse('[location:Conference Room A]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for inferred locations', async () => {
      const result = await parse('in the meeting room');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });
});
