import { name, parse } from '../../src/services/parser/parsers/attendees.js';

describe('Attendees Parser', () => {
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
    test('should have higher confidence for explicit attendees', async () => {
      const result = await parse('[attendees:John, Sarah]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for implicit attendees', async () => {
      const result = await parse('Meeting with John');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('@@@@');
      expect(result).toBeNull();
    });
  });
});
