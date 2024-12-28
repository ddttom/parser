import { name, parse } from '../../src/services/parser/parsers/action.js';

describe('Action Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[action:call John]');
      expect(result.type).toBe(name);
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
    });

    test('should detect action with "to" prefix', async () => {
      const result = await parse('to review documents');
      expect(result.value).toEqual({
        verb: 'review',
        object: 'documents',
        isComplete: false
      });
    });

    test('should detect completed actions', async () => {
      const result = await parse('✓ sent email to team');
      expect(result.value).toEqual({
        verb: 'sent',
        object: 'email to team',
        isComplete: true
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('!!!');
      expect(result).toBeNull();
    });
  });
});
