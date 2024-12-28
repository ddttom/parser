import { name, parse } from '../../src/services/parser/parsers/contexts.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

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

    test('should handle undefined input', async () => {
      const result = await parse(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle non-string input', async () => {
      const numberResult = await parse(123);
      expect(numberResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const objectResult = await parse({});
      expect(objectResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const arrayResult = await parse([]);
      expect(arrayResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('@office');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('@office');
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
          originalMatch: '@office(desk)'
        }
      });
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for multiple contexts', async () => {
      const result = await parse('@home @computer @morning');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized contexts', async () => {
      const result = await parse('@office(desk)');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for explicit contexts', async () => {
      const result = await parse('@office');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have LOW confidence for implicit contexts', async () => {
      const result = await parse('while at the office');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
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
