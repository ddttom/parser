import { name, parse } from '../../src/services/parser/parsers/attendees.js';

describe('Attendees Parser', () => {
  describe('Return Format', () => {
    test('should return object with attendees key', async () => {
      const result = await parse('[attendees:John, Sarah]');
      expect(result).toHaveProperty('attendees');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('[attendees:John, Sarah]');
      const expectedProps = {
        attendees: expect.any(Array),
        count: expect.any(Number),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.attendees).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect explicit attendee lists', async () => {
      const result = await parse('[attendees:John, Sarah]');
      expect(result.attendees).toMatchObject({
        attendees: ['John', 'Sarah'],
        count: 2
      });
    });

    test('should detect attendees with roles', async () => {
      const result = await parse('Meeting with @john (host) and @sarah (presenter)');
      expect(result.attendees).toMatchObject({
        attendees: [
          { name: 'john', role: 'host' },
          { name: 'sarah', role: 'presenter' }
        ],
        count: 2
      });
    });

    test('should detect single attendee', async () => {
      const result = await parse('1:1 with @mike');
      expect(result.attendees).toMatchObject({
        attendees: ['mike'],
        count: 1
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns gracefully', async () => {
      const result = await parse('@@@@');
      expect(result).toBeNull();
    });
  });
});
