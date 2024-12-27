import { name, parse } from '../../src/services/parser/parsers/complexity.js';

describe('Complexity Parser', () => {
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

    test('should detect complexity keywords', async () => {
      const result = await parse('This is a complex task');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'keyword_complexity',
          confidence: 0.8,
          originalMatch: 'complex'
        }
      });
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit complexity markers', async () => {
      const result = await parse('Task [complexity:high]');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_complexity',
          confidence: 0.9,
          originalMatch: '[complexity:high]'
        }
      });
    });

    test('should detect numeric complexity', async () => {
      const result = await parse('Task [complexity:3]');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'numeric_complexity',
          confidence: 0.95,
          originalMatch: '[complexity:3]'
        }
      });
    });

    test('should detect complexity keywords', async () => {
      const result = await parse('This is a complex task');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'keyword_complexity',
          confidence: 0.8,
          originalMatch: 'complex'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit complexity', async () => {
      const result = await parse('[complexity:high]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for keyword complexity', async () => {
      const result = await parse('this is complex');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid complexity values', async () => {
      const result = await parse('[complexity:invalid]');
      expect(result).toBeNull();
    });
  });
});
