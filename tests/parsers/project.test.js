import { name, parse } from '../../src/services/parser/parsers/project.js';

describe('Project Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[project:Website Redesign]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[project:Website Redesign]');
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
    test('should detect explicit project markers', async () => {
      const result = await parse('[project:Website Redesign]');
      expect(result.value).toEqual({
        project: 'Website Redesign',
        originalName: 'Website Redesign'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[project:Website Redesign]');
      expect(result.metadata.indicators).toEqual(expect.any(Array));
    });

    test('should detect project with parameters', async () => {
      const result = await parse('[project:Website Redesign(phase=1)]');
      expect(result.value).toEqual({
        project: 'Website Redesign',
        originalName: 'Website Redesign',
        parameters: {
          phase: '1'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[project:Website Redesign(phase=1)]');
      expect(result.metadata.indicators).toEqual(expect.any(Array));
    });

    test('should detect project references', async () => {
      const result = await parse('re: Project Beta');
      expect(result.value.project).toBe('Beta');
      expect(result.metadata.pattern).toBe('reference');
      expect(result.metadata.originalMatch).toBe('re: Project Beta');
    });

    test('should detect project identifiers', async () => {
      const result = await parse('PRJ-123');
      expect(result.value.project).toBe('123');
      expect(result.metadata.pattern).toBe('identifier');
      expect(result.metadata.originalMatch).toBe('PRJ-123');
    });

    test('should detect shorthand notation', async () => {
      const result = await parse('$Frontend');
      expect(result.value.project).toBe('Frontend');
      expect(result.metadata.pattern).toBe('shorthand');
      expect(result.metadata.originalMatch).toBe('$Frontend');
    });

    test('should detect contextual references', async () => {
      const result = await parse('Task for project Backend');
      expect(result.value.project).toBe('Backend');
      expect(result.metadata.pattern).toBe('contextual');
      expect(result.metadata.originalMatch).toBe('project Backend');
    });
  });

  describe('Project Name Validation', () => {
    test('should validate minimum length', async () => {
      const result = await parse('project: A');
      expect(result).toBeNull();
    });

    test('should validate maximum length', async () => {
      const longName = 'A'.repeat(51);
      const result = await parse(`project: ${longName}`);
      expect(result).toBeNull();
    });

    test('should validate allowed characters', async () => {
      const validNames = ['Project123', 'Frontend_API', 'Backend-Service'];
      const invalidNames = ['Project!', 'Front@end', 'Back#end'];

      for (const name of validNames) {
        const result = await parse(`project: ${name}`);
        expect(result).not.toBeNull();
      }

      for (const name of invalidNames) {
        const result = await parse(`project: ${name}`);
        expect(result).toBeNull();
      }
    });

    test('should reject ignored terms', async () => {
      const ignoredTerms = ['the', 'this', 'new', 'project'];
      for (const term of ignoredTerms) {
        const result = await parse(`project: ${term}`);
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
    test('should handle invalid project format', async () => {
      const result = await parse('[project:]');
      expect(result).toBeNull();
    });

    test('should handle empty project value', async () => {
      const result = await parse('[project: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[project:Website()]',
        '[project:Website(phase)]',
        '[project:Website(phase=)]',
        '[project:Website(=1)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid project names', async () => {
      const invalidNames = [
        '[project:123]',
        '[project:@#$]',
        '[project:   ]'
      ];

      for (const name of invalidNames) {
        const result = await parse(name);
        expect(result).toBeNull();
      }
    });
  });
});
