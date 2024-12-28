import { name, parse } from '../../src/services/parser/parsers/contexts.js';

describe('Contexts Parser', () => {
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
      expect(result.value).toEqual({
        context: 'home',
        type: 'location'
      });
      expect(result.metadata.pattern).toBe('explicit_context');
      expect(result.metadata.originalMatch).toBe('@home');
    });

    test('should detect multiple contexts', async () => {
      const result = await parse('Task @home @computer @morning');
      expect(result.value).toEqual({
        contexts: [
          { context: 'home', type: 'location' },
          { context: 'computer', type: 'tool' },
          { context: 'morning', type: 'time' }
        ]
      });
      expect(result.metadata.pattern).toBe('multiple_contexts');
      expect(result.metadata.originalMatch).toBe('@home @computer @morning');
    });

    test('should detect context with parameters', async () => {
      const result = await parse('Task @office(desk)');
      expect(result.value).toEqual({
        context: 'office',
        type: 'location',
        parameter: 'desk'
      });
      expect(result.metadata.pattern).toBe('parameterized_context');
      expect(result.metadata.originalMatch).toBe('@office(desk)');
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
