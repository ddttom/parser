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
      expect(result.value).toEqual({
        attendees: ['John', 'Sarah'],
        count: 2
      });
      expect(result.metadata.pattern).toBe('explicit_list');
      expect(result.metadata.originalMatch).toBe('[attendees:John, Sarah]');
    });

    test('should detect attendees with roles', async () => {
      const result = await parse('Meeting with @john (host) and @sarah (presenter)');
      expect(result.value).toEqual({
        attendees: [
          { name: 'john', role: 'host' },
          { name: 'sarah', role: 'presenter' }
        ],
        count: 2
      });
      expect(result.metadata.pattern).toBe('role_mentions');
      expect(result.metadata.originalMatch).toBe('@john (host) and @sarah (presenter)');
    });

    test('should detect single attendee', async () => {
      const result = await parse('1:1 with @mike');
      expect(result.value).toEqual({
        attendees: ['mike'],
        count: 1
      });
      expect(result.metadata.pattern).toBe('explicit_mentions');
      expect(result.metadata.originalMatch).toBe('@mike');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('@@@@');
      expect(result).toBeNull();
    });
  });
});
