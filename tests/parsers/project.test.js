import { name, parse } from '../../src/services/parser/parsers/project.js';

describe('Project Parser', () => {
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
      const result = await parse('[project:Website Redesign]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[project:Website Redesign]');
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
    test('should detect explicit project markers', async () => {
      const result = await parse('[project:Website Redesign]');
      expect(result).toEqual({
        type: 'project',
        value: {
          project: 'Website Redesign',
          originalName: 'Website Redesign'
        },
        metadata: {
          pattern: 'explicit',
          confidence: 0.95,
          originalMatch: '[project:Website Redesign]',
          indicators: expect.any(Array)
        }
      });
    });

    test('should detect project with parameters', async () => {
      const result = await parse('[project:Website Redesign(phase=1)]');
      expect(result).toEqual({
        type: 'project',
        value: {
          project: 'Website Redesign',
          originalName: 'Website Redesign',
          parameters: {
            phase: '1'
          }
        },
        metadata: {
          pattern: 'parameterized',
          confidence: 0.95,
          originalMatch: '[project:Website Redesign(phase=1)]',
          indicators: expect.any(Array)
        }
      });
    });

    test('should detect project references', async () => {
      const result = await parse('re: Project Beta');
      expect(result.value.project).toBe('Beta');
      expect(result.metadata.pattern).toBe('reference');
    });

    test('should detect project identifiers', async () => {
      const result = await parse('PRJ-123');
      expect(result.value.project).toBe('123');
      expect(result.metadata.pattern).toBe('identifier');
    });

    test('should detect shorthand notation', async () => {
      const result = await parse('$Frontend');
      expect(result.value.project).toBe('Frontend');
      expect(result.metadata.pattern).toBe('shorthand');
    });

    test('should detect contextual references', async () => {
      const result = await parse('Task for project Backend');
      expect(result.value.project).toBe('Backend');
      expect(result.metadata.pattern).toBe('contextual');
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

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[project:Website Redesign]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('project: Website Redesign');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('for website project');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for project at start of text', async () => {
      const result = await parse('[project:Website Redesign] tasks');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[project:Website Redesign] is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
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
