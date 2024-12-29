import { name, perfect } from '../../src/services/parser/parsers/role.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Role Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('acting as developer');
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
      const result = await perfect('acting as developer');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'role',
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
    test('should handle inferred roles', async () => {
      const variations = [
        {
          input: 'acting as developer',
          expected: 'as developer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle various role patterns', async () => {
      const variations = [
        {
          input: 'as developer',
          expected: 'as developer'
        },
        {
          input: 'acting as developer',
          expected: 'as developer'
        },
        {
          input: 'working as developer',
          expected: 'as developer'
        },
        {
          input: 'assigned as developer',
          expected: 'as developer'
        },
        {
          input: 'serving as developer',
          expected: 'as developer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle roles in context', async () => {
      const variations = [
        {
          input: 'John is acting as developer',
          expected: 'John is as developer'
        },
        {
          input: 'Task assigned as developer',
          expected: 'Task as developer'
        },
        {
          input: 'Project needs someone as developer',
          expected: 'Project needs someone as developer'
        },
        {
          input: 'Team member working as developer',
          expected: 'Team member as developer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Role Validation', () => {
    test('should handle valid roles', async () => {
      const variations = [
        {
          input: 'acting as developer',
          expected: 'as developer'
        },
        {
          input: 'acting as designer',
          expected: 'as designer'
        },
        {
          input: 'acting as manager',
          expected: 'as manager'
        },
        {
          input: 'acting as tester',
          expected: 'as tester'
        },
        {
          input: 'acting as analyst',
          expected: 'as analyst'
        },
        {
          input: 'acting as admin',
          expected: 'as admin'
        },
        {
          input: 'acting as lead',
          expected: 'as lead'
        },
        {
          input: 'acting as coordinator',
          expected: 'as coordinator'
        },
        {
          input: 'acting as consultant',
          expected: 'as consultant'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle case insensitivity', async () => {
      const variations = [
        {
          input: 'acting as DEVELOPER',
          expected: 'as developer'
        },
        {
          input: 'acting as Developer',
          expected: 'as developer'
        },
        {
          input: 'acting as dEvElOpEr',
          expected: 'as developer'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid role names', async () => {
      const invalidRoles = [
        'acting as 123',
        'acting as @#$',
        'acting as    ',
        'acting as invalid'
      ];

      for (const input of invalidRoles) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed patterns', async () => {
      const malformed = [
        'acting developer',
        'as',
        'acting as',
        'as as developer',
        'acting acting as developer'
      ];

      for (const input of malformed) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = perfect.validateRole;

      // Replace with mock that throws
      perfect.validateRole = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await perfect('acting as developer');
        expect(result).toEqual({
          text: 'acting as developer',
          corrections: []
        });
      } finally {
        // Restore original function
        perfect.validateRole = originalValidate;
      }
    });
  });
});
