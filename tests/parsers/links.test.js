import { name, parse } from '../../src/services/parser/parsers/links.js';

describe('Links Parser', () => {
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
      const result = await parse('https://example.com');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('https://example.com');
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

  describe('URL Pattern Matching', () => {
    test('should detect HTTP URLs', async () => {
      const result = await parse('Visit http://example.com');
      expect(result.value).toEqual({
        url: 'http://example.com',
        type: 'url'
      });
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should detect HTTPS URLs', async () => {
      const result = await parse('Visit https://example.com');
      expect(result.value).toEqual({
        url: 'https://example.com',
        type: 'url'
      });
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should handle URLs with paths and query params', async () => {
      const urls = [
        'https://example.com/path/to/page',
        'https://example.com/search?q=test&page=1',
        'https://example.com/path#section'
      ];

      for (const url of urls) {
        const result = await parse(`Visit ${url}`);
        expect(result.value.url).toBe(url);
      }
    });

    test('should handle URLs with special characters', async () => {
      const urls = [
        'https://example.com/path%20with%20spaces',
        'https://example.com/path+with+plus',
        'https://example.com/path_with_underscore'
      ];

      for (const url of urls) {
        const result = await parse(`Visit ${url}`);
        expect(result.value.url).toBe(url);
      }
    });
  });

  describe('Markdown Link Pattern', () => {
    test('should detect markdown links', async () => {
      const result = await parse('[Example](https://example.com)');
      expect(result.value).toEqual({
        url: 'https://example.com',
        text: 'Example',
        type: 'markdown'
      });
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should validate markdown link text', async () => {
      const invalidTexts = ['', ' ', '[nested]'];
      for (const text of invalidTexts) {
        const result = await parse(`[${text}](https://example.com)`);
        expect(result).toBeNull();
      }
    });

    test('should handle markdown links with complex URLs', async () => {
      const result = await parse('[Search](https://example.com/search?q=test&page=1#results)');
      expect(result.value.url).toBe('https://example.com/search?q=test&page=1#results');
    });
  });

  describe('File Link Pattern', () => {
    test('should detect file links', async () => {
      const result = await parse('[file:documents/report.pdf]');
      expect(result.value).toEqual({
        path: 'documents/report.pdf',
        type: 'file'
      });
      expect(result.metadata.confidence).toBe(0.9);
    });

    test('should handle relative file paths', async () => {
      const paths = [
        './document.pdf',
        '../reports/report.pdf',
        'folder/subfolder/file.txt'
      ];

      for (const path of paths) {
        const result = await parse(`[file:${path}]`);
        expect(result.value.path).toBe(path);
      }
    });

    test('should handle absolute file paths', async () => {
      const paths = [
        '/home/user/documents/file.pdf',
        'C:\\Users\\documents\\file.pdf',
        '/var/www/files/document.txt'
      ];

      for (const path of paths) {
        const result = await parse(`[file:${path}]`);
        expect(result.value.path).toBe(path);
      }
    });
  });

  describe('Inferred URLs', () => {
    test('should detect domain-only URLs', async () => {
      const result = await parse('Visit example.com');
      expect(result.value).toEqual({
        url: 'https://example.com',
        type: 'url'
      });
      expect(result.metadata.confidence).toBe(0.75);
    });

    test('should handle various TLDs', async () => {
      const domains = [
        'example.com',
        'example.org',
        'example.net',
        'example.edu',
        'example.gov',
        'example.io'
      ];

      for (const domain of domains) {
        const result = await parse(`Visit ${domain}`);
        expect(result.value.url).toBe(`https://${domain}`);
      }
    });

    test('should handle subdomains', async () => {
      const domains = [
        'blog.example.com',
        'sub1.sub2.example.com',
        'api.example.org'
      ];

      for (const domain of domains) {
        const result = await parse(`Visit ${domain}`);
        expect(result.value.url).toBe(`https://${domain}`);
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
        const result = await parse(`Visit ${url}`);
        expect(result).toBeNull();
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
        const result = await parse(link);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid file paths', async () => {
      const invalidPaths = [
        '[file:]',  // Empty path
        '[file: ]',  // Only whitespace
        '[file:invalid/*/path]',  // Invalid characters
        '[file:com1]'  // Reserved names
      ];

      for (const path of invalidPaths) {
        const result = await parse(path);
        expect(result).toBeNull();
      }
    });
  });

  describe('Confidence Scoring', () => {
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('https://example.com');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('[Example](https://example.com)');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('example.com');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for link at start of text', async () => {
      const result = await parse('https://example.com is the website');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('https://example.com is confirmed');
      expect(result.metadata.confidence).toBe(0.95);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('https://example1.com');
      const result2 = await parse('https://example2.com');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
    });
  });
});
