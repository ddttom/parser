import { name, parse } from '../../src/services/parser/parsers/cost.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Cost Parser', () => {
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

    test('should handle undefined input', async () => {
      const result = await parse(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle non-string input', async () => {
      const numberResult = await parse(123);
      expect(numberResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const objectResult = await parse({});
      expect(objectResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const arrayResult = await parse([]);
      expect(arrayResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

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
    });

    test('matches explicit cost pattern with GBP', async () => {
      const result = await parse('[cost:£99.99]');
      expect(result.value).toEqual({
        amount: 99.99,
        currency: 'GBP'
      });
    });

    test('matches explicit cost pattern with EUR', async () => {
      const result = await parse('[cost:€50.00]');
      expect(result.value).toEqual({
        amount: 50.00,
        currency: 'EUR'
      });
    });

    test('matches natural cost pattern with USD', async () => {
      const result = await parse('costs $99.99');
      expect(result.value).toEqual({
        amount: 99.99,
        currency: 'USD'
      });
    });

    test('matches natural cost pattern with GBP', async () => {
      const result = await parse('price: £45.50');
      expect(result.value).toEqual({
        amount: 45.50,
        currency: 'GBP'
      });
    });

    test('matches natural cost pattern with EUR', async () => {
      const result = await parse('costs €75.00');
      expect(result.value).toEqual({
        amount: 75.00,
        currency: 'EUR'
      });
    });
  });

  describe('Currency Formats', () => {
    test('handles costs without currency symbol', async () => {
      const result = await parse('[cost:50]');
      expect(result.value).toEqual({
        amount: 50,
        currency: 'USD'  // Default currency
      });
    });

    test('handles costs with decimal places', async () => {
      const result = await parse('[cost:99.99]');
      expect(result.value.amount).toBe(99.99);
    });

    test('handles costs without decimal places', async () => {
      const result = await parse('[cost:100]');
      expect(result.value.amount).toBe(100);
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

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[cost:$500]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for currency patterns', async () => {
      const result = await parse('$500');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for natural patterns', async () => {
      const result = await parse('price: $500');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('confidence levels are consistent across currencies', async () => {
      const usdResult = await parse('[cost:$500]');
      const gbpResult = await parse('[cost:£500]');
      const eurResult = await parse('[cost:€500]');
      
      expect(usdResult.metadata.confidence).toBe(Confidence.HIGH);
      expect(gbpResult.metadata.confidence).toBe(Confidence.HIGH);
      expect(eurResult.metadata.confidence).toBe(Confidence.HIGH);
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
