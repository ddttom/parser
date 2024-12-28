import { name, parse } from '../../src/services/parser/parsers/complexity.js';

describe('Complexity Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[complexity:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[complexity:high]');
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
    test('should detect explicit complexity markers', async () => {
      const result = await parse('Task [complexity:high]');
      expect(result.value).toEqual({
        level: 'high',
        score: 3
      });
      expect(result.metadata.pattern).toBe('explicit_complexity');
      expect(result.metadata.originalMatch).toBe('[complexity:high]');
    });

    test('should detect numeric complexity', async () => {
      const result = await parse('Task [complexity:3]');
      expect(result.value).toEqual({
        level: 'high',
        score: 3
      });
      expect(result.metadata.pattern).toBe('numeric_complexity');
      expect(result.metadata.originalMatch).toBe('[complexity:3]');
    });

    test('should detect complexity keywords', async () => {
      const result = await parse('This is a complex task');
      expect(result.value).toEqual({
        level: 'high',
        score: 3
      });
      expect(result.metadata.pattern).toBe('keyword_complexity');
      expect(result.metadata.originalMatch).toBe('complex');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid complexity values', async () => {
      const result = await parse('[complexity:invalid]');
      expect(result).toBeNull();
    });
  });
});
