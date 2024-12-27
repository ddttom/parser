import { name, parse, validateRole } from '../../src/services/parser/parsers/role.js';

describe('Role Parser', () => {
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
      const result = await parse('[role:developer]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[role:developer]');
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
    test('should detect explicit role markers', async () => {
      const result = await parse('[role:developer]');
      expect(result).toEqual({
        type: 'role',
        value: {
          role: 'developer',
          originalName: 'developer'
        },
        metadata: {
          pattern: 'explicit',
          confidence: 0.95,
          originalMatch: '[role:developer]'
        }
      });
    });

    test('should detect role with parameters', async () => {
      const result = await parse('[role:developer(team=frontend)]');
      expect(result).toEqual({
        type: 'role',
        value: {
          role: 'developer',
          originalName: 'developer',
          parameters: {
            team: 'frontend'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: 0.95,
          originalMatch: '[role:developer(team=frontend)]'
        }
      });
    });

    test('should detect inferred roles', async () => {
      const result = await parse('acting as developer');
      expect(result).toEqual({
        type: 'role',
        value: {
          role: 'developer',
          originalName: 'developer'
        },
        metadata: {
          pattern: 'inferred',
          confidence: 0.8,
          originalMatch: 'acting as developer'
        }
      });
    });

    test('should handle various role patterns', async () => {
      const patterns = [
        'as developer',
        'acting as developer',
        'in role of developer',
        'assigned as developer'
      ];

      for (const pattern of patterns) {
        const result = await parse(pattern);
        expect(result.value.role).toBe('developer');
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
      }
    });

    test('should handle case insensitivity', async () => {
      const result = await parse('[role:DEVELOPER]');
      expect(result.value.role).toBe('developer');
      expect(result.value.originalName).toBe('DEVELOPER');
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
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[role:developer]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('acting as developer');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('working as developer');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for role at start of text', async () => {
      const result = await parse('[role:developer] for project');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[role:developer] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
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
