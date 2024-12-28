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
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[action:complete task]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('✓ sent email to team');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('to review documents');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for action at start of text', async () => {
      const result = await parse('Need to call John immediately');
      expect(result.metadata.confidence).toBe(0.90); // 0.85 + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[action:complete task] immediately');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('!!!');
      expect(result).toBeNull();
    });
  });
});
