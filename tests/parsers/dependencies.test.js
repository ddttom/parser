import { name, parse } from '../../src/services/parser/parsers/dependencies.js';

describe('Dependencies Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('depends on [task:123]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('depends on [task:123]');
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
    test('should detect explicit dependencies', async () => {
      const result = await parse('Task depends on [task:123]');
      expect(result.value).toEqual({
        type: 'task',
        id: '123',
        relationship: 'depends_on'
      });
      expect(result.metadata.pattern).toBe('explicit_dependency');
      expect(result.metadata.originalMatch).toBe('depends on [task:123]');
    });

    test('should detect multiple dependencies', async () => {
      const result = await parse('After [task:123] and [task:456]');
      expect(result.value).toEqual({
        dependencies: [
          { type: 'task', id: '123', relationship: 'after' },
          { type: 'task', id: '456', relationship: 'after' }
        ]
      });
      expect(result.metadata.pattern).toBe('multiple_dependencies');
      expect(result.metadata.originalMatch).toBe('After [task:123] and [task:456]');
    });

    test('should detect dependency relationships', async () => {
      const result = await parse('Blocks [task:789]');
      expect(result.value).toEqual({
        type: 'task',
        id: '789',
        relationship: 'blocks'
      });
      expect(result.metadata.pattern).toBe('relationship_dependency');
      expect(result.metadata.originalMatch).toBe('Blocks [task:789]');
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
      expect(result.metadata.pattern).toBe('explicit_dependency');
    });

    test('should handle blocks relationship', async () => {
      const result = await parse('blocks [task:123]');
      expect(result.value.relationship).toBe('blocks');
      expect(result.metadata.pattern).toBe('relationship_dependency');
    });

    test('should handle after relationship', async () => {
      const result = await parse('after task 123');
      expect(result.value.relationship).toBe('after');
      expect(result.metadata.pattern).toBe('implicit_dependency');
    });

    test('should handle implicit relationships', async () => {
      const result = await parse('after task abc');
      expect(result.value.relationship).toBe('after');
      expect(result.metadata.pattern).toBe('implicit_dependency');
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
