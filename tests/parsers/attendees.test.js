import { name, parse } from '../../src/services/parser/parsers/attendees.js';

describe('Attendees Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[attendees:John, Sarah]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[attendees:John, Sarah]');
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
    test('should detect explicit attendee lists', async () => {
      const result = await parse('[attendees:John, Sarah]');
      expect(result).toEqual({
        type: 'attendees',
        value: {
          attendees: ['John', 'Sarah'],
          count: 2
        },
        metadata: {
          pattern: 'explicit_list',
          confidence: 0.95,
          originalMatch: '[attendees:John, Sarah]'
        }
      });
    });

    test('should detect attendees with roles', async () => {
      const result = await parse('Meeting with @john (host) and @sarah (presenter)');
      expect(result).toEqual({
        type: 'attendees',
        value: {
          attendees: [
            { name: 'john', role: 'host' },
            { name: 'sarah', role: 'presenter' }
          ],
          count: 2
        },
        metadata: {
          pattern: 'role_mentions',
          confidence: 0.95,
          originalMatch: '@john (host) and @sarah (presenter)'
        }
      });
    });

    test('should detect single attendee', async () => {
      const result = await parse('1:1 with @mike');
      expect(result).toEqual({
        type: 'attendees',
        value: {
          attendees: ['mike'],
          count: 1
        },
        metadata: {
          pattern: 'explicit_mentions',
          confidence: 0.9,
          originalMatch: '@mike'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[attendees:John, Sarah]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('@john and @sarah');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('Meeting with John');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for attendees at start of text', async () => {
      const result = await parse('@john (host) will lead the meeting');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('[attendees:John, Sarah] are required');
      expect(result.metadata.confidence).toBe(0.95);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('@@@@');
      expect(result).toBeNull();
    });
  });
});
