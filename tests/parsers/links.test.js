import { name, perfect } from '../../src/services/parser/parsers/links.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Links Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('https://example.com');
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
      const result = await perfect('https://example.com');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'link',
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

  describe('URL Pattern Matching', () => {
    test('should handle HTTP URLs', async () => {
      const variations = [
        {
          input: 'Visit http://example.com',
          expected: 'Visit http://example.com'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle HTTPS URLs', async () => {
      const variations = [
        {
          input: 'Visit https://example.com',
          expected: 'Visit https://example.com'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle URLs with paths and query params', async () => {
      const variations = [
        {
          input: 'Visit https://example.com/path/to/page',
          expected: 'Visit https://example.com/path/to/page'
        },
        {
          input: 'Visit https://example.com/search?q=test&page=1',
          expected: 'Visit https://example.com/search?q=test&page=1'
        },
        {
          input: 'Visit https://example.com/path#section',
          expected: 'Visit https://example.com/path#section'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle URLs with special characters', async () => {
      const variations = [
        {
          input: 'Visit https://example.com/path%20with%20spaces',
          expected: 'Visit https://example.com/path%20with%20spaces'
        },
        {
          input: 'Visit https://example.com/path+with+plus',
          expected: 'Visit https://example.com/path+with+plus'
        },
        {
          input: 'Visit https://example.com/path_with_underscore',
          expected: 'Visit https://example.com/path_with_underscore'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Markdown Link Pattern', () => {
    test('should handle markdown links', async () => {
      const variations = [
        {
          input: '[Example](https://example.com)',
          expected: '[Example](https://example.com)'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle invalid markdown link text', async () => {
      const invalidTexts = ['', ' ', '[nested]'];
      for (const text of invalidTexts) {
        const result = await perfect(`[${text}](https://example.com)`);
        expect(result).toEqual({
          text: `[${text}](https://example.com)`,
          corrections: []
        });
      }
    });

    test('should handle markdown links with complex URLs', async () => {
      const variations = [
        {
          input: '[Search](https://example.com/search?q=test&page=1#results)',
          expected: '[Search](https://example.com/search?q=test&page=1#results)'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Inferred URLs', () => {
    test('should handle domain-only URLs', async () => {
      const variations = [
        {
          input: 'Visit example.com',
          expected: 'Visit https://example.com'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });

    test('should handle various TLDs', async () => {
      const variations = [
        {
          input: 'Visit example.com',
          expected: 'Visit https://example.com'
        },
        {
          input: 'Visit example.org',
          expected: 'Visit https://example.org'
        },
        {
          input: 'Visit example.net',
          expected: 'Visit https://example.net'
        },
        {
          input: 'Visit example.edu',
          expected: 'Visit https://example.edu'
        },
        {
          input: 'Visit example.gov',
          expected: 'Visit https://example.gov'
        },
        {
          input: 'Visit example.io',
          expected: 'Visit https://example.io'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });

    test('should handle subdomains', async () => {
      const variations = [
        {
          input: 'Visit blog.example.com',
          expected: 'Visit https://blog.example.com'
        },
        {
          input: 'Visit sub1.sub2.example.com',
          expected: 'Visit https://sub1.sub2.example.com'
        },
        {
          input: 'Visit api.example.org',
          expected: 'Visit https://api.example.org'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });
  });

  describe('URL Validation', () => {
    test('should handle invalid URLs', async () => {
      const invalidUrls = [
        'http:/example.com',  // Missing slash
        'https://invalid url.com',  // Space in domain
        'ftp://example.com',  // Unsupported protocol
        'http://.com',  // Missing domain
        'http://example.',  // Incomplete TLD
        'http:example.com'  // Missing slashes
      ];

      for (const url of invalidUrls) {
        const result = await perfect(`Visit ${url}`);
        expect(result).toEqual({
          text: `Visit ${url}`,
          corrections: []
        });
      }
    });

    test('should handle malformed markdown links', async () => {
      const malformedLinks = [
        '[Example]()',  // Empty URL
        '[](https://example.com)',  // Empty text
        '[Example]https://example.com',  // Missing parentheses
        '[Example(https://example.com]'  // Mismatched brackets
      ];

      for (const link of malformedLinks) {
        const result = await perfect(link);
        expect(result).toEqual({
          text: link,
          corrections: []
        });
      }
    });
  });
});
