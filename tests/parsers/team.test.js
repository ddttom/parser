import { name, parse } from '../../src/services/parser/parsers/team.js';

describe('Team Parser', () => {
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
      expect(result.value).toEqual({
        team: 'frontend'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[team:frontend]');
    });

    test('should detect team with parameters', async () => {
      const result = await parse('[team:frontend(lead=john)]');
      expect(result.value).toEqual({
        team: 'frontend',
        parameters: {
          lead: 'john'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[team:frontend(lead=john)]');
    });

    test('should detect inferred team references', async () => {
      const formats = [
        { input: 'frontend team', match: 'frontend team' },
        { input: 'team frontend', match: 'team frontend' },
        { input: 'frontend squad', match: 'frontend squad' },
        { input: 'frontend group', match: 'frontend group' }
      ];

      for (const { input, match } of formats) {
        const result = await parse(input);
        expect(result.value.team).toBe('frontend');
        expect(result.metadata.pattern).toBe('inferred');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should detect team references with context', async () => {
      const result = await parse('assigned to frontend team');
      expect(result.value).toEqual({
        team: 'frontend',
        relationship: 'assigned'
      });
      expect(result.metadata.pattern).toBe('contextual');
      expect(result.metadata.originalMatch).toBe('assigned to frontend team');
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
        expect(result.metadata.pattern).toBe('explicit');
        expect(result.metadata.originalMatch).toBe(`[team:${team}]`);
      }
    });

    test('should handle case insensitivity', async () => {
      const result = await parse('[team:FRONTEND]');
      expect(result.value.team).toBe('frontend');
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[team:FRONTEND]');
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
        expect(result.metadata.pattern).toBe('explicit');
        expect(result.metadata.originalMatch).toBe(`[team:${input}]`);
      }
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
