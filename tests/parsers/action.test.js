import { name, perfect } from '../../src/services/parser/parsers/action.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Action Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('call John');
      expect(result).toEqual(expect.objectContaining({
        text: expect.any(String),
        corrections: expect.any(Array)
      }));
    });

    test('should return original text with empty corrections for no matches', async () => {
      const text = '   ';
      const result = await perfect(text);
      expect(result).toEqual({
        text,
        corrections: []
      });
    });

    test('should include all required correction properties', async () => {
      const result = await perfect('call John');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'action_improvement',
        original: expect.any(String),
        correction: expect.any(String),
        position: expect.objectContaining({
          start: expect.any(Number),
          end: expect.any(Number)
        }),
        confidence: expect.any(String)
      }));
    });
  });

  describe('Text Improvement', () => {
    test('should improve verb-noun pairs', async () => {
      const result = await perfect('meeting with John');
      expect(result.text).toBe('meet with with John');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        original: 'meeting with John',
        correction: 'meet with with John',
        confidence: Confidence.HIGH
      }));
    });

    test('should standardize explicit actions', async () => {
      const result = await perfect('Need to call John');
      expect(result.text).toBe('call John');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        original: 'Need to call John',
        correction: 'call John',
        confidence: Confidence.HIGH
      }));
    });

    test('should preserve completed action markers', async () => {
      const result = await perfect('✓ sent email to team');
      expect(result.text).toBe('✓ sent email to team');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        original: '✓ sent email to team',
        correction: '✓ sent email to team',
        confidence: Confidence.HIGH
      }));
    });

    test('should handle inferred actions with medium confidence', async () => {
      const result = await perfect('maybe call John later');
      expect(result.text).toBe('call John later');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        original: 'maybe call John later',
        correction: 'call John later',
        confidence: Confidence.MEDIUM
      }));
    });
  });

  describe('Position Tracking', () => {
    test('should track position of changes at start of text', async () => {
      const result = await perfect('call John about meeting');
      expect(result.corrections[0].position).toEqual({
        start: 0,
        end: 'call John about meeting'.length
      });
    });

    test('should track position of changes with leading space', async () => {
      const result = await perfect('  call John');
      expect(result.corrections[0].position).toEqual({
        start: 2,
        end: 2 + 'call John'.length
      });
    });

    test('should track position of changes in middle of text', async () => {
      const result = await perfect('Today: need to call John');
      expect(result.corrections[0].position.start).toBeGreaterThan(0);
    });
  });

  describe('Confidence Levels', () => {
    test('should assign HIGH confidence to explicit actions', async () => {
      const result = await perfect('Need to call John');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should assign MEDIUM confidence to inferred actions', async () => {
      const result = await perfect('maybe call John');
      expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
    });

    test('should assign HIGH confidence to completed actions', async () => {
      const result = await perfect('✓ sent email');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should assign HIGH confidence to urgent actions', async () => {
      const result = await perfect('urgent meeting with team');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid input gracefully', async () => {
      const result = await perfect('!!!');
      expect(result).toEqual({
        text: '!!!',
        corrections: []
      });
    });

    test('should handle null input', async () => {
      const result = await perfect(null);
      expect(result).toEqual({
        text: null,
        corrections: []
      });
    });

    test('should handle undefined input', async () => {
      const result = await perfect(undefined);
      expect(result).toEqual({
        text: undefined,
        corrections: []
      });
    });
  });

  describe('Complex Cases', () => {
    test('should handle multiple action indicators', async () => {
      const result = await perfect('urgent need to call John immediately');
      expect(result.text).toBe('call John immediately');
      expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
    });

    test('should handle actions with context boundaries', async () => {
      const result = await perfect('call John the cost is estimated at $500');
      expect(result.corrections[0].correction).toBe('call John');
    });

    test('should preserve text after action', async () => {
      const text = 'call John #urgent and then lunch';
      const result = await perfect(text);
      expect(result.text).toBe('call John and then lunch');
      expect(result.corrections[0].position.end).toBeLessThan(text.length);
    });
  });
});
