import { name, parse } from '../../src/services/parser/parsers/dependencies.js';

describe('Dependencies Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('depends on task 123');
      expect(result.type).toBe(name);
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect natural dependencies', async () => {
      const variations = [
        'Task depends on task 123',
        'This depends on 123',
        'depends on task ABC-123'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.relationship).toBe('depends_on');
      }
    });

    test('should detect multiple dependencies', async () => {
      const variations = [
        'after tasks 123 and 456',
        'after task 123 and task 456',
        'after 123 and 456'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.dependencies).toHaveLength(2);
        expect(result.value.dependencies[0].relationship).toBe('after');
        expect(result.value.dependencies[1].relationship).toBe('after');
      }
    });

    test('should detect blocking relationships', async () => {
      const variations = [
        'blocks task 789',
        'blocks 789',
        'blocks task ABC-789'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.relationship).toBe('blocks');
      }
    });

    test('should detect implicit dependencies', async () => {
      const variations = [
        'after task 123',
        'after 123',
        'after task ABC-123'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.relationship).toBe('after');
      }
    });
  });

  describe('Relationship Types', () => {
    test('should handle all relationship types', async () => {
      const relationships = [
        { input: 'depends on task 123', expected: 'depends_on', pattern: 'natural_dependency' },
        { input: 'blocks task 123', expected: 'blocks', pattern: 'relationship_dependency' },
        { input: 'after task 123', expected: 'after', pattern: 'implicit_dependency' }
      ];

      for (const { input, expected, pattern } of relationships) {
        const result = await parse(input);
        expect(result.value.relationship).toBe(expected);
      }
    });

    test('should handle case-insensitive relationship types', async () => {
      const variations = [
        'DEPENDS ON task 123',
        'Blocks task 123',
        'AFTER task 123'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.value.relationship).toBeDefined();
      }
    });
  });

  describe('Task ID Validation', () => {
    test('should accept valid task IDs', async () => {
      const validIds = [
        'task123',
        'ABC-123',
        'feature_123',
        'task-abc'
      ];

      for (const id of validIds) {
        const result = await parse(`depends on task ${id}`);
        expect(result).not.toBeNull();
        expect(result.value.id).toBe(id);
      }
    });

    test('should reject invalid task IDs', async () => {
      const invalidIds = [
        'task!@#',
        'abc.123',
        '',
        ' '
      ];

      for (const id of invalidIds) {
        const result = await parse(`depends on task ${id}`);
        expect(result).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle missing task IDs', async () => {
      const invalid = [
        'depends on',
        'blocks',
        'after'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle unknown relationship types', async () => {
      const invalid = [
        'requires task 123',
        'needs task 123',
        'before task 123'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed expressions', async () => {
      const invalid = [
        'task depends',
        'blocks on task',
        'after and task'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
