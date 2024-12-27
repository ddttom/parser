import { name, parse } from '../../src/services/parser/parsers/action.js';

describe('Action Parser', () => {
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
    test('should detect explicit action verbs', async () => {
      const result = await parse('Need to call John');
      expect(result).toEqual({
        type: 'action',
        value: {
          verb: 'call',
          object: 'John',
          isComplete: false
        },
        metadata: {
          pattern: 'explicit_verb',
          confidence: 0.85,
          originalMatch: 'call John'
        }
      });
    });

    test('should detect action with "to" prefix', async () => {
      const result = await parse('to review documents');
      expect(result).toEqual({
        type: 'action',
        value: {
          verb: 'review',
          object: 'documents',
          isComplete: false
        },
        metadata: {
          pattern: 'to_prefix',
          confidence: 0.8,
          originalMatch: 'to review documents'
        }
      });
    });

    test('should detect completed actions', async () => {
      const result = await parse('✓ sent email to team');
      expect(result).toEqual({
        type: 'action',
        value: {
          verb: 'sent',
          object: 'email to team',
          isComplete: true
        },
        metadata: {
          pattern: 'completed_action',
          confidence: 0.9,
          originalMatch: '✓ sent email to team'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit actions', async () => {
      const result = await parse('[action:complete task]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for inferred actions', async () => {
      const result = await parse('need to complete task');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('!!!');
      expect(result).toBeNull();
    });
  });
});
