import { name, parse, validateRole } from '../../src/services/parser/parsers/role.js';

describe('Role Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[role:developer]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[role:developer]');
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
    test('should detect explicit role markers', async () => {
      const result = await parse('[role:developer]');
      expect(result.value).toEqual({
        role: 'developer',
        originalName: 'developer'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[role:developer]');
    });

    test('should detect role with parameters', async () => {
      const result = await parse('[role:developer(team=frontend)]');
      expect(result.value).toEqual({
        role: 'developer',
        originalName: 'developer',
        parameters: {
          team: 'frontend'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[role:developer(team=frontend)]');
    });

    test('should detect inferred roles', async () => {
      const result = await parse('acting as developer');
      expect(result.value).toEqual({
        role: 'developer',
        originalName: 'developer'
      });
      expect(result.metadata.pattern).toBe('inferred');
      expect(result.metadata.originalMatch).toBe('acting as developer');
    });

    test('should handle various role patterns', async () => {
      const patterns = [
        { input: 'as developer', pattern: 'inferred' },
        { input: 'acting as developer', pattern: 'inferred' },
        { input: 'in role of developer', pattern: 'inferred' },
        { input: 'assigned as developer', pattern: 'inferred' }
      ];

      for (const { input, pattern } of patterns) {
        const result = await parse(input);
        expect(result.value.role).toBe('developer');
        expect(result.metadata.pattern).toBe(pattern);
        expect(result.metadata.originalMatch).toBe(input);
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
        const result = await parse(`[role:${role}]`);
        expect(result.value.role).toBe(role);
        expect(result.metadata.pattern).toBe('explicit');
        expect(result.metadata.originalMatch).toBe(`[role:${role}]`);
      }
    });

    test('should handle case insensitivity', async () => {
      const result = await parse('[role:DEVELOPER]');
      expect(result.value.role).toBe('developer');
      expect(result.value.originalName).toBe('DEVELOPER');
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[role:DEVELOPER]');
    });

    test('should normalize role names', async () => {
      const variations = [
        ['dev', 'developer'],
        ['devs', 'developer'],
        ['developer', 'developer'],
        ['mgr', 'manager'],
        ['admin', 'administrator']
      ];

      for (const [input, expected] of variations) {
        const result = await parse(`[role:${input}]`);
        expect(result.value.role).toBe(expected);
        expect(result.metadata.pattern).toBe('explicit');
        expect(result.metadata.originalMatch).toBe(`[role:${input}]`);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid role format', async () => {
      const result = await parse('[role:]');
      expect(result).toBeNull();
    });

    test('should handle empty role value', async () => {
      const result = await parse('[role: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[role:developer()]',
        '[role:developer(team)]',
        '[role:developer(team=)]',
        '[role:developer(=frontend)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid role names', async () => {
      const invalidRoles = [
        '[role:123]',
        '[role:@#$]',
        '[role:   ]',
        '[role:invalid]'
      ];

      for (const role of invalidRoles) {
        const result = await parse(role);
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
        const result = await parse('[role:developer]');
        expect(result).toEqual({
          type: 'error',
          error: 'PARSER_ERROR',
          message: 'Validation error'
        });
      } finally {
        // Restore original function
        parse.validateRole = originalValidate;
      }
    });
  });
});
