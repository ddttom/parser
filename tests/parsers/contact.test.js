import { name, parse } from '../../src/services/parser/parsers/contact.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Contact Parser', () => {
  describe('Return Format', () => {
    test('should return object with contact key', async () => {
      const result = await parse('contact John Smith');
      expect(result).toHaveProperty('contact');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('contact John Smith');
      const expectedProps = {
        type: expect.any(String),
        name: expect.any(String),
        id: expect.any(String),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.contact).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect email addresses', async () => {
      const variations = [
        'contact john.doe@example.com',
        'email from john.doe@example.com',
        'send to john.doe@example.com'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.contact).toMatchObject({
          type: 'email',
          value: 'john.doe@example.com',
          name: 'John Doe'
        });
      }
    });

    test('should detect phone numbers', async () => {
      const variations = [
        'call +1-555-123-4567',
        'phone +1-555-123-4567',
        'contact at +1-555-123-4567'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.contact).toMatchObject({
          type: 'phone',
          value: '+15551234567',
          formatted: '+1-555-123-4567'
        });
      }
    });

    test('should detect name references', async () => {
      const variations = [
        'contact John Smith',
        'reaching out to John Smith',
        'contacting John Smith'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.contact).toMatchObject({
          type: 'reference',
          name: 'John Smith',
          id: 'john_smith'
        });
      }
    });

    test('should detect inferred contacts', async () => {
      const variations = [
        'meet with John Smith',
        'call John Smith',
        'email John Smith'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.contact).toMatchObject({
          type: 'reference',
          name: 'John Smith',
          id: 'john_smith'
        });
      }
    });
  });

  describe('Name Handling', () => {
    test('should handle single names', async () => {
      const variations = [
        'contact John',
        'meet with Sarah',
        'call Mike'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.contact.name).toBeTruthy();
        expect(result.contact.id).toBe(result.contact.name.toLowerCase());
      }
    });

    test('should handle full names', async () => {
      const variations = [
        'contact John Smith',
        'meet with Sarah Johnson',
        'call Mike Brown'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.contact.name.split(' ')).toHaveLength(2);
        expect(result.contact.id).toBe(result.contact.name.toLowerCase().replace(' ', '_'));
      }
    });

    test('should extract names from email addresses', async () => {
      const variations = [
        { email: 'john.doe@example.com', name: 'John Doe' },
        { email: 'sarah.j.smith@example.com', name: 'Sarah J Smith' },
        { email: 'mike_brown@example.com', name: 'Mike Brown' }
      ];

      for (const { email, name } of variations) {
        const result = await parse(email);
        expect(result.contact.name).toBe(name);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid email formats', async () => {
      const invalid = [
        'invalid.email@',
        '@invalid.com',
        'invalid@.com',
        'invalid@com'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid phone formats', async () => {
      const invalid = [
        '+1-555-123',
        '555-123-4567',
        '+1-5551234567',
        '+1-555-123-456'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed expressions', async () => {
      const invalid = [
        'contact',
        'call',
        'email',
        'meet with'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
