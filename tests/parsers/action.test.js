import { name, parse } from '../../src/services/parser/parsers/action.js';

describe('Action Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[action:call John]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[action:call John]');
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
    test('should detect explicit action verbs', async () => {
      const result = await parse('Need to call John');
      expect(result.value).toEqual({
        verb: 'call',
        object: 'John',
        isComplete: false
      });
      expect(result.metadata.pattern).toBe('explicit_verb');
      expect(result.metadata.originalMatch).toBe('call John');
    });

    test('should detect action with "to" prefix', async () => {
      const result = await parse('to review documents');
      expect(result.value).toEqual({
        verb: 'review',
        object: 'documents',
        isComplete: false
      });
      expect(result.metadata.pattern).toBe('to_prefix');
      expect(result.metadata.originalMatch).toBe('to review documents');
    });

    test('should detect completed actions', async () => {
      const result = await parse('✓ sent email to team');
      expect(result.value).toEqual({
        verb: 'sent',
        object: 'email to team',
        isComplete: true
      });
      expect(result.metadata.pattern).toBe('completed_action');
      expect(result.metadata.originalMatch).toBe('✓ sent email to team');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('!!!');
      expect(result).toBeNull();
    });
  });
});
