import { name, parse } from '../../src/services/parser/parsers/participants.js';

describe('Participants Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('Meeting with John and Sarah');
      expect(result.type).toBe(name);
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect natural language participant lists', async () => {
      const variations = [
        'Meeting with John, Sarah, and Mike',
        'Discussion includes John, Sarah, and Mike',
        'Session has John, Sarah, and Mike'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          participants: ['John', 'Sarah', 'Mike'],
          count: 3
        });
      }
    });

    test('should detect simple participant lists', async () => {
      const variations = [
        'Meeting with John and Sarah',
        'Discussion with John and Sarah',
        'Call with John and Sarah'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          participants: ['John', 'Sarah'],
          count: 2
        });
      }
    });

    test('should detect participants with roles', async () => {
      const variations = [
        { input: 'Meeting with John (host) and Sarah (presenter)', roles: ['host', 'presenter'] },
        { input: 'Call with Mike (lead) and Emma (developer)', roles: ['lead', 'developer'] },
        { input: 'Discussion with Alex (moderator) and Lisa (speaker)', roles: ['moderator', 'speaker'] }
      ];

      for (const { input, roles } of variations) {
        const result = await parse(input);
        expect(result.value.participants).toHaveLength(2);
        expect(result.value.participants[0].role).toBe(roles[0]);
        expect(result.value.participants[1].role).toBe(roles[1]);
      }
    });

    test('should detect participant mentions', async () => {
      const variations = [
        { input: 'Discussion with @john and @sarah', participants: ['john', 'sarah'] },
        { input: 'Meeting with @mike and @emma', participants: ['mike', 'emma'] },
        { input: 'Call with @alex and @lisa', participants: ['alex', 'lisa'] }
      ];

      for (const { input, participants } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          participants,
          count: 2
        });
      }
    });
  });

  describe('Name Validation', () => {
    test('should validate participant names', async () => {
      const validNames = [
        'Meeting with John Smith and Sarah Johnson',
        'Discussion with Mike Brown and Emma Davis',
        'Call with Alex Wilson and Lisa Clark'
      ];

      for (const input of validNames) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.value.participants).toHaveLength(2);
      }
    });

    test('should reject invalid names', async () => {
      const invalidNames = [
        'Meeting with 123 and 456',
        'Discussion with @#$ and %^&',
        'Call with    and    '
      ];

      for (const input of invalidNames) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });

  describe('Role Validation', () => {
    test('should validate role formats', async () => {
      const validRoles = [
        'Meeting with John (host) and Sarah (presenter)',
        'Call with Mike (lead) and Emma (developer)',
        'Discussion with Alex (moderator) and Lisa (speaker)'
      ];

      for (const input of validRoles) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.value.participants).toHaveLength(2);
        expect(result.value.participants[0].role).toBeTruthy();
        expect(result.value.participants[1].role).toBeTruthy();
      }
    });

    test('should reject invalid role formats', async () => {
      const invalidRoles = [
        'Meeting with John () and Sarah ()',
        'Call with Mike (123) and Emma (456)',
        'Discussion with Alex (@#$) and Lisa (%^&)'
      ];

      for (const input of invalidRoles) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
