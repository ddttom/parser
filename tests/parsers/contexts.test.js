import { name, parse } from '../../src/services/parser/parsers/contexts.js';

describe('Contexts Parser', () => {
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
    test('should detect explicit context markers', async () => {
      const result = await parse('Task @home');
      expect(result).toEqual({
        type: 'context',
        value: {
          context: 'home',
          type: 'location'
        },
        metadata: {
          pattern: 'explicit_context',
          confidence: 0.9,
          originalMatch: '@home'
        }
      });
    });

    test('should detect multiple contexts', async () => {
      const result = await parse('Task @home @computer @morning');
      expect(result).toEqual({
        type: 'context',
        value: {
          contexts: [
            { context: 'home', type: 'location' },
            { context: 'computer', type: 'tool' },
            { context: 'morning', type: 'time' }
          ]
        },
        metadata: {
          pattern: 'multiple_contexts',
          confidence: 0.95,
          originalMatch: '@home @computer @morning'
        }
      });
    });

    test('should detect context with parameters', async () => {
      const result = await parse('Task @office(desk)');
      expect(result).toEqual({
        type: 'context',
        value: {
          context: 'office',
          type: 'location',
          parameter: 'desk'
        },
        metadata: {
          pattern: 'parameterized_context',
          confidence: 0.95,
          originalMatch: '@office(desk)'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit contexts', async () => {
      const result = await parse('@office');
      expect(result.metadata.confidence).toBeGreaterThan(0.8);
    });

    test('should have lower confidence for implicit contexts', async () => {
      const result = await parse('while at the office');
      expect(result.metadata.confidence).toBeLessThan(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid context format', async () => {
      const result = await parse('@');
      expect(result).toBeNull();
    });

    test('should handle invalid context parameters', async () => {
      const result = await parse('@office()');
      expect(result).toBeNull();
    });
  });
});
