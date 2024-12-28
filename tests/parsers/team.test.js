import { name, parse } from '../../src/services/parser/parsers/team.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Team Parser', () => {
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
      const result = await parse('[team:frontend]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[team:frontend]');
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
    test('should detect explicit team markers', async () => {
      const result = await parse('[team:frontend]');
      expect(result).toEqual({
        type: 'team',
        value: {
          team: 'frontend'
        },
        metadata: {
          pattern: 'explicit',
          confidence: Confidence.HIGH,
          originalMatch: '[team:frontend]'
        }
      });
    });

    test('should detect team with parameters', async () => {
      const result = await parse('[team:frontend(lead=john)]');
      expect(result).toEqual({
        type: 'team',
        value: {
          team: 'frontend',
          parameters: {
            lead: 'john'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: Confidence.HIGH,
          originalMatch: '[team:frontend(lead=john)]'
        }
      });
    });

    test('should detect inferred team references', async () => {
      const formats = [
        'frontend team',
        'team frontend',
        'frontend squad',
        'frontend group'
      ];

      for (const format of formats) {
        const result = await parse(format);
        expect(result.value.team).toBe('frontend');
        expect(result.metadata.pattern).toBe('inferred');
      }
    });

    test('should detect team references with context', async () => {
      const result = await parse('assigned to frontend team');
      expect(result).toEqual({
        type: 'team',
        value: {
          team: 'frontend',
          relationship: 'assigned'
        },
        metadata: {
          pattern: 'contextual',
          confidence: Confidence.MEDIUM,
          originalMatch: 'assigned to frontend team'
        }
      });
    });
  });

  describe('Team Validation', () => {
    test('should accept valid teams', async () => {
      const validTeams = [
        'frontend',
        'backend',
        'design',
        'qa',
        'devops',
        'mobile',
        'infrastructure',
        'security',
        'data',
        'platform'
      ];

      for (const team of validTeams) {
        const result = await parse(`[team:${team}]`);
        expect(result.value.team).toBe(team);
      }
    });

    test('should handle case insensitivity', async () => {
      const result = await parse('[team:FRONTEND]');
      expect(result.value.team).toBe('frontend');
    });

    test('should normalize team names', async () => {
      const variations = [
        { input: 'FRONTEND', expected: 'frontend' },
        { input: 'Front-End', expected: 'frontend' },
        { input: 'FrontEnd', expected: 'frontend' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(`[team:${input}]`);
        expect(result.value.team).toBe(expected);
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[team:frontend]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized patterns', async () => {
      const result = await parse('[team:frontend(lead=john)]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for inferred patterns', async () => {
      const result = await parse('frontend team');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[team:frontend]');
      const result2 = await parse('[team:backend]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid team format', async () => {
      const result = await parse('[team:]');
      expect(result).toBeNull();
    });

    test('should handle empty team value', async () => {
      const result = await parse('[team: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[team:frontend()]',
        '[team:frontend(lead)]',
        '[team:frontend(lead=)]',
        '[team:frontend(=john)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid team names', async () => {
      const invalidTeams = [
        '[team:123]',
        '[team:@#$]',
        '[team:   ]',
        '[team:invalid]'
      ];

      for (const team of invalidTeams) {
        const result = await parse(team);
        expect(result).toBeNull();
      }
    });

    test('should handle parser errors gracefully', async () => {
      // Save original function
      const originalValidate = parse.validateTeam;

      // Replace with mock that throws
      parse.validateTeam = () => {
        throw new Error('Validation error');
      };

      try {
        const result = await parse('[team:frontend]');
        expect(result).toEqual({
          type: 'error',
          error: 'PARSER_ERROR',
          message: 'Validation error'
        });
      } finally {
        // Restore original function
        parse.validateTeam = originalValidate;
      }
    });
  });
});
