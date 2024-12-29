import { name, perfect } from '../../src/services/parser/parsers/dependencies.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Dependencies Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('depends on task 123');
      expect(result).toEqual(expect.objectContaining({
        text: expect.any(String),
        corrections: expect.any(Array)
      }));
    });

    test('should return original text with empty corrections for no matches', async () => {
      const text = '   ';
      const result = await perfect(text);
      expect(result).toEqual({
        text,
        corrections: []
      });
    });

    test('should include all required correction properties', async () => {
      const result = await perfect('depends on task 123');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'dependencies',
        original: expect.any(String),
        correction: expect.any(String),
        position: expect.objectContaining({
          start: expect.any(Number),
          end: expect.any(Number)
        }),
        confidence: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should handle natural dependencies', async () => {
      const variations = [
        {
          input: 'Task depends on task 123',
          expected: 'Task depends on task 123'
        },
        {
          input: 'This depends on 123',
          expected: 'This depends on 123'
        },
        {
          input: 'depends on task ABC-123',
          expected: 'depends on task ABC-123'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle multiple dependencies', async () => {
      const variations = [
        {
          input: 'after tasks 123 and 456',
          expected: 'after tasks 123 and 456'
        },
        {
          input: 'after task 123 and task 456',
          expected: 'after task 123 and task 456'
        },
        {
          input: 'after 123 and 456',
          expected: 'after 123 and 456'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle blocking relationships', async () => {
      const variations = [
        {
          input: 'blocks task 789',
          expected: 'blocks task 789'
        },
        {
          input: 'blocks 789',
          expected: 'blocks 789'
        },
        {
          input: 'blocks task ABC-789',
          expected: 'blocks task ABC-789'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle implicit dependencies', async () => {
      const variations = [
        {
          input: 'after task 123',
          expected: 'after task 123'
        },
        {
          input: 'after 123',
          expected: 'after 123'
        },
        {
          input: 'after task ABC-123',
          expected: 'after task ABC-123'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Position Tracking', () => {
    test('should track position of changes at start of text', async () => {
      const result = await perfect('depends on task 123');
      expect(result.corrections[0].position).toEqual({
        start: 0,
        end: 'depends on task 123'.length
      });
    });

    test('should track position of changes with leading text', async () => {
      const result = await perfect('Meeting: depends on task 123');
      expect(result.corrections[0].position).toEqual({
        start: 'Meeting: '.length,
        end: 'Meeting: depends on task 123'.length
      });
    });

    test('should preserve surrounding text', async () => {
      const result = await perfect('URGENT: depends on task 123!');
      expect(result.text).toBe('URGENT: depends on task 123!');
    });
  });

  describe('Confidence Levels', () => {
    test('should assign HIGH confidence to natural dependencies', async () => {
      const result = await perfect('depends on task 123');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should assign HIGH confidence to blocking relationships', async () => {
      const result = await perfect('blocks task 123');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should assign MEDIUM confidence to implicit dependencies', async () => {
      const result = await perfect('after task 123');
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
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
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle unknown relationship types', async () => {
      const invalid = [
        'requires task 123',
        'needs task 123',
        'before task 123'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed expressions', async () => {
      const invalid = [
        'task depends',
        'blocks on task',
        'after and task'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });
  });
});
