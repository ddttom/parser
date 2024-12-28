import { name, parse } from '../../src/services/parser/parsers/team.js';

describe('Team Parser', () => {
  describe('Return Format', () => {
    test('should return object with team key', async () => {
      const result = await parse('@frontend');
      expect(result).toHaveProperty('team');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('@frontend');
      const expectedProps = {
        members: expect.any(Array),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.team).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect @mentions', async () => {
      const result = await parse('Task for @frontend and @backend');
      expect(result.team.members).toEqual(['frontend', 'backend']);
    });

    test('should detect name lists', async () => {
      const result = await parse('involving frontend, backend and design');
      expect(result.team.members).toEqual(['frontend', 'backend', 'design']);
    });

    test('should detect inferred team references', async () => {
      const formats = [
        { input: 'frontend team', team: 'frontend' },
        { input: 'backend team', team: 'backend' },
        { input: 'design team', team: 'design' },
        { input: 'qa team', team: 'qa' }
      ];

      for (const { input, team } of formats) {
        const result = await parse(input);
        expect(result.team.name).toBe(team);
      }
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
        const result = await parse(`${team} team`);
        expect(result.team.name).toBe(team);
      }
    });

    test('should handle case insensitivity', async () => {
      const variations = [
        { input: 'FRONTEND team', expected: 'frontend' },
        { input: 'Frontend Team', expected: 'frontend' },
        { input: 'FrontEnd team', expected: 'frontend' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(input);
        expect(result.team.name).toBe(expected);
      }
    });

    test('should handle name list variations', async () => {
      const variations = [
        'involving frontend and backend',
        'involving frontend, backend',
        'involving frontend, backend, and design'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.team.members).toContain('frontend');
        expect(result.team.members).toContain('backend');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid team names', async () => {
      const invalidTeams = [
        '123 team',
        '@#$ team',
        'invalid team',
        'unknown team'
      ];

      for (const team of invalidTeams) {
        const result = await parse(team);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed name lists', async () => {
      const malformed = [
        'involving',
        'involving and',
        'involving ,',
        'involving frontend,',
        'involving , backend'
      ];

      for (const input of malformed) {
        const result = await parse(input);
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
        const result = await parse('frontend team');
        expect(result).toEqual({
          team: {
            error: 'PARSER_ERROR',
            message: 'Validation error'
          }
        });
      } finally {
        // Restore original function
        parse.validateTeam = originalValidate;
      }
    });
  });
});
