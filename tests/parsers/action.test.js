import { name, parse } from '../../src/services/parser/parsers/action.js';

describe('Action Parser', () => {
  describe('Return Format', () => {
    test('should return object with action key', async () => {
      const result = await parse('call John');
      expect(result).toHaveProperty('action');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('call John');
      expect(result.action).toEqual(expect.objectContaining({
        verb: expect.any(String),
        object: expect.any(String),
        isComplete: expect.any(Boolean),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit action verbs', async () => {
      const result = await parse('Need to call John');
      expect(result.action).toEqual(expect.objectContaining({
        verb: 'call',
        object: 'John',
        isComplete: false
      }));
    });

    test('should detect action with "to" prefix', async () => {
      const result = await parse('to review documents');
      expect(result.action).toEqual(expect.objectContaining({
        verb: 'review',
        object: 'documents',
        isComplete: false
      }));
    });

    test('should detect completed actions', async () => {
      const result = await parse('✓ sent email to team');
      expect(result.action).toEqual(expect.objectContaining({
        verb: 'sent',
        object: 'email to team',
        isComplete: true
      }));
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('!!!');
      expect(result).toBeNull();
    });
  });
});
