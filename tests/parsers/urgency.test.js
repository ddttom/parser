import { name, parse } from '../../src/services/parser/parsers/urgency.js';

describe('Urgency Parser', () => {
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
    test('should detect explicit urgency markers', async () => {
      const result = await parse('Task [urgency:high]');
      expect(result).toEqual({
        type: 'urgency',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_urgency',
          confidence: 0.95,
          originalMatch: '[urgency:high]'
        }
      });
    });

    test('should detect urgency keywords', async () => {
      const result = await parse('URGENT: Complete report');
      expect(result).toEqual({
        type: 'urgency',
        value: {
          level: 'high',
          score: 3,
          keyword: 'urgent'
        },
        metadata: {
          pattern: 'keyword_urgency',
          confidence: 0.8,
          originalMatch: 'URGENT'
        }
      });
    });

    test('should detect time-based urgency', async () => {
      const result = await parse('Must complete ASAP');
      expect(result).toEqual({
        type: 'urgency',
        value: {
          level: 'high',
          score: 3,
          timeBased: true
        },
        metadata: {
          pattern: 'time_urgency',
          confidence: 0.85,
          originalMatch: 'ASAP'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit urgency', async () => {
      const result = await parse('[urgency:high]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for keyword urgency', async () => {
      const result = await parse('needs urgent attention');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid urgency format', async () => {
      const result = await parse('[urgency:]');
      expect(result).toBeNull();
    });

    test('should handle invalid urgency level', async () => {
      const result = await parse('[urgency:invalid]');
      expect(result).toBeNull();
    });
  });
});
