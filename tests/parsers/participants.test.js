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
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit participants', async () => {
      const result = await parse('[participants:John, Sarah]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for implicit participants', async () => {
      const result = await parse('with John and Sarah');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid participant format', async () => {
      const result = await parse('[participants:]');
      expect(result).toBeNull();
    });

    test('should handle invalid role format', async () => {
      const result = await parse('John ()');
      expect(result).toBeNull();
    });
  });
});
