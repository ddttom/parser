import { name, parse } from '../../src/services/parser/parsers/participants.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Participants Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[participants:John, Sarah]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[participants:John, Sarah]');
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.MEDIUM,
          originalMatch: 'John, Sarah, and Mike'
        }
      });
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[participants:John, Sarah]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized patterns', async () => {
      const result = await parse('[participants:John(role=host), Sarah(role=guest)]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for role assignments', async () => {
      const result = await parse('John (host) and Sarah (presenter)');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for natural lists', async () => {
      const result = await parse('Meeting with John, Sarah, and Mike');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have LOW confidence for implicit patterns', async () => {
      const result = await parse('with John and Sarah');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
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
