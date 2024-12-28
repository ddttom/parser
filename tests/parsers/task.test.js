import { name, parse } from '../../src/services/parser/parsers/task.js';

describe('Task Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('task 123');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('task 123');
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
    test('should detect task references', async () => {
      const formats = [
        { input: 'task 123', match: 'task 123' },
        { input: 'ticket #123', match: 'ticket #123' },
        { input: 'issue 123', match: 'issue 123' }
      ];

      for (const { input, match } of formats) {
        const result = await parse(input);
        expect(result.value).toEqual({
          taskId: 123
        });
        expect(result.metadata.pattern).toBe('inferred');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should handle optional hash symbol', async () => {
      const withHash = await parse('task #123');
      const withoutHash = await parse('task 123');
      expect(withHash.value.taskId).toBe(123);
      expect(withoutHash.value.taskId).toBe(123);
      expect(withHash.metadata.pattern).toBe('inferred');
      expect(withoutHash.metadata.pattern).toBe('inferred');
      expect(withHash.metadata.originalMatch).toBe('task #123');
      expect(withoutHash.metadata.originalMatch).toBe('task 123');
    });

    test('should detect task references in context', async () => {
      const references = [
        'working on task 123',
        'related to ticket #123',
        'fixes issue 123',
        'implements task #123',
        'completes ticket 123'
      ];

      for (const input of references) {
        const result = await parse(input);
        expect(result.value.taskId).toBe(123);
        expect(result.metadata.pattern).toBe('inferred');
      }
    });
  });

  describe('Task ID Validation', () => {
    test('should validate numeric task IDs', async () => {
      const result = await parse('task abc');
      expect(result).toBeNull();
    });

    test('should parse task IDs as integers', async () => {
      const result = await parse('task 123');
      expect(typeof result.value.taskId).toBe('number');
      expect(result.value.taskId).toBe(123);
      expect(result.metadata.pattern).toBe('inferred');
      expect(result.metadata.originalMatch).toBe('task 123');
    });

    test('should handle task ID ranges', async () => {
      const validIds = [1, 100, 999999];
      for (const id of validIds) {
        const result = await parse(`task ${id}`);
        expect(result.value.taskId).toBe(id);
        expect(result.metadata.pattern).toBe('inferred');
        expect(result.metadata.originalMatch).toBe(`task ${id}`);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid task IDs', async () => {
      const invalidIds = [
        'task 0',
        'task -1',
        'task 1.5',
        'task abc',
        'task !@#'
      ];

      for (const input of invalidIds) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed references', async () => {
      const malformed = [
        'task',
        'task #',
        'task#',
        'task ##123',
        'task # 123'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = parse.validateTaskId;

      // Replace with mock that throws
      parse.validateTaskId = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await parse('task 123');
        expect(result).toEqual({
          type: 'error',
          error: 'PARSER_ERROR',
          message: 'Validation error'
        });
      } finally {
        // Restore original function
        parse.validateTaskId = originalValidate;
      }
    });
  });
});
