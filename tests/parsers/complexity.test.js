import { name, parse } from '../../src/services/parser/parsers/complexity.js';

describe('Complexity Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('complexity level is high');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('complexity level is high');
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
    test('should detect level complexity expressions', async () => {
      const variations = [
        'complexity level is high',
        'complexity: high',
        'difficulty level: high',
        'difficulty is high'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          level: 'high',
          score: 3
        });
        expect(result.metadata.pattern).toBe('level_complexity');
      }
    });

    test('should detect numeric level expressions', async () => {
      const variations = [
        'complexity level is 3',
        'complexity: 3',
        'difficulty level: 3',
        'difficulty is 3'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          level: 'high',
          score: 3
        });
        expect(result.metadata.pattern).toBe('numeric_level');
      }
    });

    test('should detect complexity keywords', async () => {
      const variations = [
        { input: 'This is a complex task', level: 'high', score: 3 },
        { input: 'This is a simple task', level: 'low', score: 1 },
        { input: 'This is a difficult task', level: 'high', score: 3 },
        { input: 'This is an easy task', level: 'low', score: 1 },
        { input: 'This is a challenging task', level: 'high', score: 3 }
      ];

      for (const { input, level, score } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({ level, score });
        expect(result.metadata.pattern).toBe('keyword_complexity');
      }
    });
  });

  describe('Complexity Levels', () => {
    test('should handle high complexity', async () => {
      const variations = [
        'complexity level is high',
        'this is complex',
        'difficulty level: 3',
        'this is challenging'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.level).toBe('high');
        expect(result.value.score).toBe(3);
      }
    });

    test('should handle medium complexity', async () => {
      const variations = [
        'complexity level is medium',
        'difficulty level: 2',
        'complexity: medium'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.level).toBe('medium');
        expect(result.value.score).toBe(2);
      }
    });

    test('should handle low complexity', async () => {
      const variations = [
        'complexity level is low',
        'this is simple',
        'difficulty level: 1',
        'this is easy'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.level).toBe('low');
        expect(result.value.score).toBe(1);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid numeric values', async () => {
      const invalid = [
        'complexity level is 0',
        'complexity level is 4',
        'difficulty is -1'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid level values', async () => {
      const invalid = [
        'complexity level is very',
        'complexity level is extreme',
        'difficulty is unknown'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed expressions', async () => {
      const invalid = [
        'complexity',
        'difficulty:',
        'level is',
        'complexity level'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
