import { name, parse, validateRole } from '../../src/services/parser/parsers/role.js';

describe('Role Parser', () => {
  describe('Return Format', () => {
    test('should return object with role key', async () => {
      const result = await parse('acting as developer');
      expect(result).toHaveProperty('role');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('acting as developer');
      const expectedProps = {
        role: expect.any(String),
        originalName: expect.any(String),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.role).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect inferred roles', async () => {
      const result = await parse('acting as developer');
      expect(result.role).toMatchObject({
        role: 'developer',
        originalName: 'developer'
      });
    });

    test('should handle various role patterns', async () => {
      const patterns = [
        'as developer',
        'acting as developer',
        'working as developer',
        'assigned as developer',
        'serving as developer'
      ];

      for (const input of patterns) {
        const result = await parse(input);
        expect(result.role).toMatchObject({
          role: 'developer',
          originalName: 'developer'
        });
      }
    });

    test('should detect roles in context', async () => {
      const contexts = [
        'John is acting as developer',
        'Task assigned as developer',
        'Project needs someone as developer',
        'Team member working as developer'
      ];

      for (const input of contexts) {
        const result = await parse(input);
        expect(result.role.role).toBe('developer');
      }
    });
  });

  describe('Role Validation', () => {
    test('should accept valid roles', async () => {
      const validRoles = [
        'developer',
        'designer',
        'manager',
        'tester',
        'analyst',
        'admin',
        'lead',
        'coordinator',
        'consultant'
      ];

      for (const role of validRoles) {
        const result = await parse(`acting as ${role}`);
        expect(result.role.role).toBe(role);
      }
    });

    test('should handle case insensitivity', async () => {
      const variations = [
        'acting as DEVELOPER',
        'acting as Developer',
        'acting as dEvElOpEr'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.role.role).toBe('developer');
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
        const result = await parse(input);
        expect(result).toBeNull();
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
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = parse.validateRole;

      // Replace with mock that throws
      parse.validateRole = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await parse('acting as developer');
        expect(result).toEqual({
          role: {
            error: 'PARSER_ERROR',
            message: 'Validation error'
          }
        });
      } finally {
        // Restore original function
        parse.validateRole = originalValidate;
      }
    });
  });
});
