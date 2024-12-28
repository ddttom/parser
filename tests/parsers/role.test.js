import { name, parse, validateRole } from '../../src/services/parser/parsers/role.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

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
      expect(result).toEqual({
        type: 'role',
        value: {
          role: 'developer',
          originalName: 'developer'
        },
        metadata: {
          pattern: 'explicit',
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.MEDIUM,
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

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[role:developer]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized patterns', async () => {
      const result = await parse('[role:developer(team=frontend)]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for inferred patterns', async () => {
      const result = await parse('acting as developer');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[role:developer]');
      const result2 = await parse('[role:manager]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
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
