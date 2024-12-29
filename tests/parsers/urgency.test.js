import { name, perfect } from '../../src/services/parser/parsers/urgency.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Urgency Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('URGENT: Complete report');
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
      const result = await perfect('URGENT: Complete report');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'urgency',
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

  describe('Pattern Matching', () => {
    test('should handle time-based urgency', async () => {
      const variations = [
        {
          input: 'Must complete ASAP',
          expected: 'Must complete asap'
        },
        {
          input: 'Need this right away',
          expected: 'Need this right away'
        },
        {
          input: 'Required immediately',
          expected: 'Required immediately'
        },
        {
          input: 'Do this right now',
          expected: 'Do this right now'
        },
        {
          input: 'Complete as soon as possible',
          expected: 'Complete as soon as possible'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle urgency keywords', async () => {
      const variations = [
        {
          input: 'URGENT task',
          expected: 'high priority task'
        },
        {
          input: 'Critical issue',
          expected: 'high priority issue'
        },
        {
          input: 'Important meeting',
          expected: 'high priority meeting'
        },
        {
          input: 'High priority task',
          expected: 'high priority task'
        },
        {
          input: 'Normal priority',
          expected: 'medium priority'
        },
        {
          input: 'Low priority',
          expected: 'low priority'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Urgency Levels', () => {
    test('should handle all urgency levels', async () => {
      const variations = [
        {
          input: 'routine task',
          expected: 'low priority task'
        },
        {
          input: 'normal priority',
          expected: 'medium priority'
        },
        {
          input: 'urgent task',
          expected: 'high priority task'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });

    test('should normalize urgency values', async () => {
      const variations = [
        {
          input: 'URGENT',
          expected: 'high priority'
        },
        {
          input: 'CRITICAL',
          expected: 'high priority'
        },
        {
          input: 'IMPORTANT',
          expected: 'high priority'
        },
        {
          input: 'NORMAL',
          expected: 'medium priority'
        },
        {
          input: 'LOW',
          expected: 'low priority'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid urgency keywords', async () => {
      const invalidKeywords = [
        'kinda urgent',
        'sort of important',
        'maybe critical',
        'somewhat urgent',
        'slightly important'
      ];

      for (const input of invalidKeywords) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed time expressions', async () => {
      const malformed = [
        'do it soon',
        'need it quick',
        'hurry up',
        'fast please',
        'rush it'
      ];

      for (const input of malformed) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });
  });
});
