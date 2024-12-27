import { name, parse } from '../../src/services/parser/parsers/participants.js';

describe('Participants Parser', () => {
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
      const result = await parse('[participants:John, Sarah]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[participants:John, Sarah]');
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
    test('should detect explicit participant lists', async () => {
      const result = await parse('Meeting with [participants:John, Sarah, Mike]');
      expect(result).toEqual({
        type: 'participants',
        value: {
          participants: ['John', 'Sarah', 'Mike'],
          count: 3
        },
        metadata: {
          pattern: 'explicit_list',
          confidence: 0.95,
          originalMatch: '[participants:John, Sarah, Mike]'
        }
      });
    });

    test('should detect participants with roles', async () => {
      const result = await parse('Meeting with John (host) and Sarah (presenter)');
      expect(result).toEqual({
        type: 'participants',
        value: {
          participants: [
            { name: 'John', role: 'host' },
            { name: 'Sarah', role: 'presenter' }
          ],
          count: 2
        },
        metadata: {
          pattern: 'role_assignment',
          confidence: 0.9,
          originalMatch: 'John (host) and Sarah (presenter)'
        }
      });
    });

    test('should detect participant mentions', async () => {
      const result = await parse('Discussion with @john and @sarah');
      expect(result).toEqual({
        type: 'participants',
        value: {
          participants: ['john', 'sarah'],
          count: 2
        },
        metadata: {
          pattern: 'mentions',
          confidence: 0.9,
          originalMatch: '@john and @sarah'
        }
      });
    });

    test('should detect participants with parameters', async () => {
      const result = await parse('[participants:John(team=dev), Sarah(team=design)]');
      expect(result).toEqual({
        type: 'participants',
        value: {
          participants: [
            { name: 'John', parameters: { team: 'dev' } },
            { name: 'Sarah', parameters: { team: 'design' } }
          ],
          count: 2
        },
        metadata: {
          pattern: 'parameterized_list',
          confidence: 0.95,
          originalMatch: '[participants:John(team=dev), Sarah(team=design)]'
        }
      });
    });

    test('should detect natural language participant lists', async () => {
      const result = await parse('Meeting with John, Sarah, and Mike');
      expect(result).toEqual({
        type: 'participants',
        value: {
          participants: ['John', 'Sarah', 'Mike'],
          count: 3
        },
        metadata: {
          pattern: 'natural_list',
          confidence: 0.85,
          originalMatch: 'John, Sarah, and Mike'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[participants:John, Sarah]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('Meeting with @john and @sarah');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('with John and Sarah');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for participants at start of text', async () => {
      const result = await parse('[participants:John, Sarah] will attend');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[participants:John, Sarah] are confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid participant format', async () => {
      const result = await parse('[participants:]');
      expect(result).toBeNull();
    });

    test('should handle empty participant list', async () => {
      const result = await parse('[participants: ]');
      expect(result).toBeNull();
    });

    test('should handle invalid role format', async () => {
      const invalidRoles = [
        'John ()',
        'John (role=)',
        'John (=host)',
        'John (invalid@role)'
      ];

      for (const role of invalidRoles) {
        const result = await parse(role);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[participants:John()]',
        '[participants:John(team)]',
        '[participants:John(team=)]',
        '[participants:John(=dev)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid participant names', async () => {
      const invalidNames = [
        '[participants:123]',
        '[participants:@#$]',
        '[participants:   ]'
      ];

      for (const name of invalidNames) {
        const result = await parse(name);
        expect(result).toBeNull();
      }
    });
  });
});
