import { name, parse } from '../../src/services/parser/parsers/dependencies.js';

describe('Dependencies Parser', () => {
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
      const result = await parse('depends on [task:123]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('depends on [task:123]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
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
    test('should detect explicit dependencies', async () => {
      const result = await parse('Task depends on [task:123]');
      expect(result).toEqual({
        type: 'dependency',
        value: {
          type: 'task',
          id: '123',
          relationship: 'depends_on'
        },
        metadata: {
          pattern: 'explicit_dependency',
          confidence: 0.95,
          originalMatch: 'depends on [task:123]'
        }
      });
    });

    test('should detect multiple dependencies', async () => {
      const result = await parse('After [task:123] and [task:456]');
      expect(result).toEqual({
        type: 'dependency',
        value: {
          dependencies: [
            { type: 'task', id: '123', relationship: 'after' },
            { type: 'task', id: '456', relationship: 'after' }
          ]
        },
        metadata: {
          pattern: 'multiple_dependencies',
          confidence: 0.9,
          originalMatch: 'After [task:123] and [task:456]'
        }
      });
    });

    test('should detect dependency relationships', async () => {
      const result = await parse('Blocks [task:789]');
      expect(result).toEqual({
        type: 'dependency',
        value: {
          type: 'task',
          id: '789',
          relationship: 'blocks'
        },
        metadata: {
          pattern: 'relationship_dependency',
          confidence: 0.9,
          originalMatch: 'Blocks [task:789]'
        }
      });
    });

    test('should handle case-insensitive relationship types', async () => {
      const result = await parse('DEPENDS ON [task:123]');
      expect(result.value.relationship).toBe('depends_on');
    });

    test('should detect all relationship types', async () => {
      const relationships = [
        { input: 'depends on [task:123]', expected: 'depends_on' },
        { input: 'blocks [task:123]', expected: 'blocks' },
        { input: 'after task 123', expected: 'after' }
      ];

      for (const { input, expected } of relationships) {
        const result = await parse(input);
        expect(result.value.relationship).toBe(expected);
      }
    });
  });

  describe('Multiple Dependencies', () => {
    test('should handle multiple dependencies with same relationship', async () => {
      const result = await parse('after [task:123] and [task:456]');
      expect(result.value.dependencies).toHaveLength(2);
      expect(result.value.dependencies[0].relationship).toBe('after');
      expect(result.value.dependencies[1].relationship).toBe('after');
    });

    test('should validate all task IDs in multiple dependencies', async () => {
      const result = await parse('after [task:] and [task:456]');
      expect(result).toBeNull();
    });
  });

  describe('Relationship Types', () => {
    test('should handle depends_on relationship', async () => {
      const result = await parse('depends on [task:123]');
      expect(result.value.relationship).toBe('depends_on');
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should handle blocks relationship', async () => {
      const result = await parse('blocks [task:123]');
      expect(result.value.relationship).toBe('blocks');
      expect(result.metadata.confidence).toBe(0.9);
    });

    test('should handle after relationship', async () => {
      const result = await parse('after task 123');
      expect(result.value.relationship).toBe('after');
      expect(result.metadata.confidence).toBe(0.75);
    });

    test('should handle implicit relationships', async () => {
      const result = await parse('after task abc');
      expect(result.value.relationship).toBe('after');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[task:123] depends on [task:456]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('depends on [task:123]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('after task abc');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for dependency at start of text', async () => {
      const result = await parse('depends on [task:123] for completion');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[task:123] depends on [task:456] explicitly');
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('depends on [task:123]');
      const result2 = await parse('depends on [task:456]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task references', async () => {
      const result = await parse('[task:]');
      expect(result).toBeNull();
    });

    test('should handle invalid dependency format', async () => {
      const result = await parse('depends on task');
      expect(result).toBeNull();
    });

    test('should handle unknown relationship types', async () => {
      const result = await parse('requires [task:123]');
      expect(result).toBeNull();
    });

    test('should handle malformed task references', async () => {
      const invalidIds = ['abc!@#', '123.456', '', ' '];
      for (const id of invalidIds) {
        const result = await parse(`depends on [task:${id}]`);
        expect(result).toBeNull();
      }
    });
  });
});
