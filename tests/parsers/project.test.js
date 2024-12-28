import { name, parse } from '../../src/services/parser/parsers/project.js';

describe('Project Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('re: Project Alpha');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('re: Project Alpha');
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
    test('should detect project references', async () => {
      const variations = [
        're: Project Beta',
        're: Beta project',
        're: project Beta-API'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.project).toBe('Beta');
        expect(result.metadata.pattern).toBe('reference');
      }
    });

    test('should detect project identifiers', async () => {
      const variations = [
        { input: 'PRJ-123', id: '123' },
        { input: 'Task for PRJ-456', id: '456' },
        { input: 'Update PRJ-789 status', id: '789' }
      ];

      for (const { input, id } of variations) {
        const result = await parse(input);
        expect(result.value.project).toBe(id);
        expect(result.metadata.pattern).toBe('identifier');
      }
    });

    test('should detect shorthand notation', async () => {
      const variations = [
        { input: '$Frontend', project: 'Frontend' },
        { input: 'Task for $Backend-API', project: 'Backend-API' },
        { input: 'Update $Mobile_App', project: 'Mobile_App' }
      ];

      for (const { input, project } of variations) {
        const result = await parse(input);
        expect(result.value.project).toBe(project);
        expect(result.metadata.pattern).toBe('shorthand');
      }
    });

    test('should detect contextual references', async () => {
      const variations = [
        'project Backend',
        'initiative Frontend',
        'program Mobile'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.project).toBeTruthy();
        expect(result.metadata.pattern).toBe('contextual');
      }
    });

    test('should detect regarding references', async () => {
      const variations = [
        'regarding project Alpha',
        'regarding Frontend initiative',
        'regarding Backend program'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.project).toBeTruthy();
        expect(result.metadata.pattern).toBe('regarding');
      }
    });

    test('should detect inferred references', async () => {
      const variations = [
        'task for Backend project',
        'working in Frontend initiative',
        'update under Mobile program'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.project).toBeTruthy();
        expect(result.metadata.pattern).toBe('inferred');
      }
    });
  });

  describe('Project Name Validation', () => {
    test('should validate minimum length', async () => {
      const result = await parse('project A');
      expect(result).toBeNull();
    });

    test('should validate maximum length', async () => {
      const longName = 'A'.repeat(51);
      const result = await parse(`project ${longName}`);
      expect(result).toBeNull();
    });

    test('should validate allowed characters', async () => {
      const validNames = [
        'project Project123',
        'project Frontend_API',
        'project Backend-Service'
      ];
      const invalidNames = [
        'project Project!',
        'project Front@end',
        'project Back#end'
      ];

      for (const input of validNames) {
        const result = await parse(input);
        expect(result).not.toBeNull();
      }

      for (const input of invalidNames) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should reject ignored terms', async () => {
      const ignoredTerms = ['the', 'this', 'new', 'project'];
      for (const term of ignoredTerms) {
        const result = await parse(`project ${term}`);
        expect(result).toBeNull();
      }
    });
  });

  describe('Project Indicators', () => {
    test('should detect project terms', async () => {
      const result = await parse('milestone for project Alpha');
      expect(result.metadata.indicators).toContain('project_term');
    });

    test('should detect task organization', async () => {
      const result = await parse('story under project Beta');
      expect(result.metadata.indicators).toContain('task_organization');
    });

    test('should detect stakeholders', async () => {
      const result = await parse('client project Gamma');
      expect(result.metadata.indicators).toContain('stakeholder');
    });

    test('should detect timeline references', async () => {
      const result = await parse('roadmap for project Delta');
      expect(result.metadata.indicators).toContain('timeline');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid project names', async () => {
      const invalidNames = [
        'project 123',
        'project @#$',
        'project    '
      ];

      for (const input of invalidNames) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed references', async () => {
      const malformed = [
        're:',
        're: ',
        'regarding',
        'regarding ',
        'for project',
        'in project'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid identifiers', async () => {
      const invalid = [
        'PRJ-',
        'PRJ-abc',
        'PRJ--123',
        'PRJ-0'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
