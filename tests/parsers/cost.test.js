 import { name, parse } from '../../src/services/parser/parsers/cost.js';

describe('Cost Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[cost:$100]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[cost:$100]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
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
    test('matches explicit cost pattern with USD', async () => {
      const result = await parse('[cost:$123.45]');
      expect(result.value).toEqual({
        amount: 123.45,
        currency: 'USD'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[cost:$123.45]');
    });

    test('matches explicit cost pattern with GBP', async () => {
      const result = await parse('[cost:£99.99]');
      expect(result.value).toEqual({
        amount: 99.99,
        currency: 'GBP'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[cost:£99.99]');
    });

    test('matches explicit cost pattern with EUR', async () => {
      const result = await parse('[cost:€50.00]');
      expect(result.value).toEqual({
        amount: 50.00,
        currency: 'EUR'
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[cost:€50.00]');
    });

    test('matches natural cost pattern with USD', async () => {
      const result = await parse('costs $99.99');
      expect(result.value).toEqual({
        amount: 99.99,
        currency: 'USD'
      });
      expect(result.metadata.pattern).toBe('natural');
      expect(result.metadata.originalMatch).toBe('costs $99.99');
    });

    test('matches natural cost pattern with GBP', async () => {
      const result = await parse('price: £45.50');
      expect(result.value).toEqual({
        amount: 45.50,
        currency: 'GBP'
      });
      expect(result.metadata.pattern).toBe('natural');
      expect(result.metadata.originalMatch).toBe('price: £45.50');
    });

    test('matches natural cost pattern with EUR', async () => {
      const result = await parse('costs €75.00');
      expect(result.value).toEqual({
        amount: 75.00,
        currency: 'EUR'
      });
      expect(result.metadata.pattern).toBe('natural');
      expect(result.metadata.originalMatch).toBe('costs €75.00');
    });
  });

  describe('Currency Formats', () => {
    test('handles costs without currency symbol', async () => {
      const result = await parse('[cost:50]');
      expect(result.value).toEqual({
        amount: 50,
        currency: 'USD'  // Default currency
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[cost:50]');
    });

    test('handles costs with decimal places', async () => {
      const result = await parse('[cost:99.99]');
      expect(result.value.amount).toBe(99.99);
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[cost:99.99]');
    });

    test('handles costs without decimal places', async () => {
      const result = await parse('[cost:100]');
      expect(result.value.amount).toBe(100);
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[cost:100]');
    });
  });

  describe('Error Handling', () => {
    test('handles invalid cost format', async () => {
      const result = await parse('[cost:invalid]');
      expect(result.type).toBe('error');
    });

    test('handles negative numbers', async () => {
      const result = await parse('[cost:-50]');
      expect(result.type).toBe('error');
    });

    test('handles malformed decimal values', async () => {
      const result = await parse('[cost:50.123]');
      expect(result.type).toBe('error');
    });
  });

  describe('Metadata Validation', () => {
    test('includes original match in metadata', async () => {
      const result = await parse('[cost:$123.45]');
      expect(result.metadata.originalMatch).toBe('[cost:$123.45]');
    });

    test('includes pattern type in metadata', async () => {
      const result = await parse('[cost:$123.45]');
      expect(result.metadata.pattern).toBe('explicit');
    });

    test('natural pattern is correctly identified', async () => {
      const result = await parse('costs $99.99');
      expect(result.metadata.pattern).toBe('natural');
    });
  });
});
